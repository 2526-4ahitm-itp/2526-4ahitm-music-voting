import { of, throwError } from 'rxjs';
import { HostDashboard } from './host-dashboard';

describe('HostDashboard', () => {
  let http: { get: jasmine.Spy; post: jasmine.Spy; put: jasmine.Spy; delete: jasmine.Spy };
  let partyService: { endParty: jasmine.Spy; clearParty: jasmine.Spy };
  let spotifyService: { getQueueUpdates: jasmine.Spy };
  let router: { navigate: jasmine.Spy };
  let ngZone: { run: jasmine.Spy };
  let cd: { detectChanges: jasmine.Spy };
  let comp: HostDashboard;

  beforeEach(() => {
    http = {
      get: jasmine.createSpy('get'),
      post: jasmine.createSpy('post'),
      put: jasmine.createSpy('put'),
      delete: jasmine.createSpy('delete'),
    };
    partyService = {
      endParty: jasmine.createSpy('endParty'),
      clearParty: jasmine.createSpy('clearParty'),
    };
    spotifyService = { getQueueUpdates: jasmine.createSpy('getQueueUpdates') };
    router = { navigate: jasmine.createSpy('navigate') };
    ngZone = { run: jasmine.createSpy('run').and.callFake((fn: () => void) => fn()) };
    cd = { detectChanges: jasmine.createSpy('detectChanges') };

    comp = new HostDashboard(
      ngZone as any,
      http as any,
      cd as any,
      partyService as any,
      spotifyService as any,
      null as any, // route
      router as any,
    );
  });

  afterEach(() => (comp as any).sseSource?.close());

  describe('formatTime', () => {
    it('returns 0:00 for falsy or NaN values', () => {
      expect(comp.formatTime(0)).toBe('0:00');
      expect(comp.formatTime(NaN)).toBe('0:00');
    });

    it('formats minutes and seconds with zero-padding', () => {
      expect(comp.formatTime(65_000)).toBe('1:05');
    });
  });

  it('toggleMenu toggles menuOpen', () => {
    expect(comp.menuOpen).toBe(false);

    comp.toggleMenu();
    expect(comp.menuOpen).toBe(true);
  });

  it('openPlayer opens the startpage in a new tab', () => {
    spyOn(window, 'open');

    comp.openPlayer();

    expect(window.open).toHaveBeenCalledWith('/startpage', '_blank');
  });

  describe('loadPlaylist', () => {
    it('does nothing without an active party', async () => {
      await comp.loadPlaylist();

      expect(http.get).not.toHaveBeenCalled();
    });

    it('sets the current track from the first queue entry before the party started', async () => {
      comp.partyId = 'party-1';
      http.get.and.returnValue(of({ queue: [
        { id: 't1', uri: 'spotify:track:t1', name: 'First' },
        { id: 't2', uri: 'spotify:track:t2', name: 'Second' },
      ] }));

      await comp.loadPlaylist();

      expect(http.get).toHaveBeenCalledWith('/api/party/party-1/track/queue');
      expect(comp.currentTrack).toEqual({ id: 't1', uri: 'spotify:track:t1', name: 'First' });
      expect(comp.tracks).toEqual([{ id: 't2', uri: 'spotify:track:t2', name: 'Second' }]);
    });

    it('keeps the existing current track once the party has started', async () => {
      comp.partyId = 'party-1';
      comp.partyStarted = true;
      comp.currentTrack = { id: 't2', uri: 'spotify:track:t2', name: 'Second' };
      http.get.and.returnValue(of({ queue: [
        { id: 't1', uri: 'spotify:track:t1', name: 'First' },
        { id: 't2', uri: 'spotify:track:t2', name: 'Second' },
      ] }));

      await comp.loadPlaylist();

      expect(comp.currentTrack).toEqual({ id: 't2', uri: 'spotify:track:t2', name: 'Second' });
      expect(comp.tracks).toEqual([{ id: 't1', uri: 'spotify:track:t1', name: 'First' }]);
    });

    it('logs an error when the request fails', async () => {
      spyOn(console, 'error');
      comp.partyId = 'party-1';
      http.get.and.returnValue(throwError(() => new Error('boom')));

      await comp.loadPlaylist();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('loadCurrentPlayback', () => {
    it('does nothing without an active party', async () => {
      await comp.loadCurrentPlayback();

      expect(http.get).not.toHaveBeenCalled();
    });

    it('sets the current track, marks the party as started and stores the playing uri', async () => {
      comp.partyId = 'party-1';
      http.get.and.returnValue(of({ track: { uri: 'spotify:track:t1' }, isPlaying: true }));

      await comp.loadCurrentPlayback();

      expect(comp.currentTrack).toEqual({ uri: 'spotify:track:t1' });
      expect(comp.partyStarted).toBe(true);
      expect(comp.isPaused).toBe(false);
      expect((comp as any).lastTrackUri).toBe('spotify:track:t1');
    });

    it('reloads the playlist when the playing track changes', async () => {
      comp.partyId = 'party-1';
      (comp as any).lastTrackUri = 'spotify:track:old';
      http.get.and.callFake((url: string) => {
        if (url.endsWith('/track/current')) {
          return of({ track: { uri: 'spotify:track:new' }, isPlaying: true });
        }
        return of({ queue: [] });
      });

      await comp.loadCurrentPlayback();

      expect(http.get).toHaveBeenCalledWith('/api/party/party-1/track/queue');
    });

    it('auto-advances when the track has finished playing', async () => {
      comp.partyId = 'party-1';
      (comp as any).lastTrackUri = 'spotify:track:t1';
      http.get.and.callFake((url: string) => {
        if (url.endsWith('/track/current')) {
          return of({ track: { uri: 'spotify:track:t1' }, isPlaying: false, progressMs: 0 });
        }
        return of({ queue: [] });
      });
      http.post.and.returnValue(of({}));

      await comp.loadCurrentPlayback();
      await Promise.resolve();
      await Promise.resolve();

      expect(http.post).toHaveBeenCalledWith('/api/party/party-1/track/next', {});
    });

    it('does not auto-advance after the user manually paused', async () => {
      comp.partyId = 'party-1';
      (comp as any).userPaused = true;
      (comp as any).lastTrackUri = 'spotify:track:t1';
      http.get.and.returnValue(of({ track: { uri: 'spotify:track:t1' }, isPlaying: false, progressMs: 0 }));

      await comp.loadCurrentPlayback();

      expect(http.post).not.toHaveBeenCalled();
    });

    it('clears the current track once playback ends and the party had started', async () => {
      comp.partyId = 'party-1';
      comp.partyStarted = true;
      comp.currentTrack = { uri: 'spotify:track:t1' };
      http.get.and.returnValue(of({ track: null, isPlaying: false }));

      await comp.loadCurrentPlayback();

      expect(comp.currentTrack).toBeNull();
      expect(comp.isPaused).toBe(true);
    });

    it('logs an error when the request fails', async () => {
      spyOn(console, 'error');
      comp.partyId = 'party-1';
      http.get.and.returnValue(throwError(() => new Error('boom')));

      await comp.loadCurrentPlayback();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('onPlayPause / startParty', () => {
    it('does nothing without an active party', async () => {
      await comp.onPlayPause();

      expect(http.post).not.toHaveBeenCalled();
    });

    it('starts the party on the first call', async () => {
      comp.partyId = 'party-1';
      http.post.and.returnValue(of({}));
      http.get.and.returnValue(of({}));

      await comp.startParty();

      expect(http.post).toHaveBeenCalledWith('/api/party/party-1/track/start', {});
      expect(comp.partyStarted).toBe(true);
      expect(comp.isPaused).toBe(false);
    });

    it('pauses playback when already playing', async () => {
      comp.partyId = 'party-1';
      comp.partyStarted = true;
      comp.isPaused = false;
      http.post.and.returnValue(of({}));
      http.get.and.returnValue(of({}));

      await comp.onPlayPause();

      expect(http.post).toHaveBeenCalledWith('/api/party/party-1/track/pause', {});
      expect(comp.isPaused).toBe(true);
    });

    it('resumes playback when paused', async () => {
      comp.partyId = 'party-1';
      comp.partyStarted = true;
      comp.isPaused = true;
      http.post.and.returnValue(of({}));
      http.get.and.returnValue(of({}));

      await comp.onPlayPause();

      expect(http.post).toHaveBeenCalledWith('/api/party/party-1/track/resume', {});
      expect(comp.isPaused).toBe(false);
    });

    it('logs an error when the request fails', async () => {
      spyOn(console, 'error');
      comp.partyId = 'party-1';
      http.post.and.returnValue(throwError(() => new Error('boom')));

      await comp.onPlayPause();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('onRestartCurrent', () => {
    it('does nothing without a current track or active party', async () => {
      await comp.onRestartCurrent();

      expect(http.put).not.toHaveBeenCalled();
    });

    it('replays the current track', async () => {
      comp.partyId = 'party-1';
      comp.currentTrack = { uri: 'spotify:track:t1' };
      http.put.and.returnValue(of({}));
      http.get.and.returnValue(of({}));

      await comp.onRestartCurrent();

      expect(http.put).toHaveBeenCalledWith('/api/party/party-1/track/play', { uri: 'spotify:track:t1' });
    });

    it('logs an error when the request fails', async () => {
      spyOn(console, 'error');
      comp.partyId = 'party-1';
      comp.currentTrack = { uri: 'spotify:track:t1' };
      http.put.and.returnValue(throwError(() => new Error('boom')));

      await comp.onRestartCurrent();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('onSkip', () => {
    it('does nothing without an active party', async () => {
      await comp.onSkip();

      expect(http.post).not.toHaveBeenCalled();
    });

    it('requests the next track', async () => {
      comp.partyId = 'party-1';
      http.post.and.returnValue(of({}));
      http.get.and.returnValue(of({}));

      await comp.onSkip();

      expect(http.post).toHaveBeenCalledWith('/api/party/party-1/track/next', {});
    });

    it('resets state when the queue becomes empty', async () => {
      comp.partyId = 'party-1';
      comp.partyStarted = true;
      comp.currentTrack = { uri: 'spotify:track:t1' };
      comp.tracks = [{ uri: 'spotify:track:t2' }];
      http.post.and.returnValue(of({ status: 'empty' }));

      await comp.onSkip();

      expect(comp.currentTrack).toBeNull();
      expect(comp.partyStarted).toBe(false);
      expect(comp.tracks).toEqual([]);
    });

    it('logs an error when the request fails', async () => {
      spyOn(console, 'error');
      comp.partyId = 'party-1';
      http.post.and.returnValue(throwError(() => new Error('boom')));

      await comp.onSkip();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('onDeleteTrack', () => {
    it('does nothing without a uri or active party', async () => {
      await comp.onDeleteTrack({});

      expect(http.delete).not.toHaveBeenCalled();
    });

    it('removes the track and reloads the playlist', async () => {
      comp.partyId = 'party-1';
      http.delete.and.returnValue(of({}));
      http.get.and.returnValue(of({ queue: [] }));

      await comp.onDeleteTrack({ uri: 'spotify:track:t1' });

      expect(http.delete).toHaveBeenCalledWith('/api/party/party-1/track/remove', { body: { uri: 'spotify:track:t1' } });
      expect(http.get).toHaveBeenCalledWith('/api/party/party-1/track/queue');
    });

    it('logs an error when the request fails', async () => {
      spyOn(console, 'error');
      comp.partyId = 'party-1';
      http.delete.and.returnValue(throwError(() => new Error('boom')));

      await comp.onDeleteTrack({ uri: 'spotify:track:t1' });

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('endParty', () => {
    it('does nothing without an active party', async () => {
      await comp.endParty();

      expect(partyService.endParty).not.toHaveBeenCalled();
    });

    it('ends the party and navigates home', async () => {
      comp.partyId = 'party-1';
      partyService.endParty.and.returnValue(of({}));

      await comp.endParty();

      expect(partyService.endParty).toHaveBeenCalledWith('party-1');
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('logs an error when the request fails', async () => {
      spyOn(console, 'error');
      comp.partyId = 'party-1';
      partyService.endParty.and.returnValue(throwError(() => new Error('boom')));

      await comp.endParty();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('startPartyEndedStream', () => {
    afterEach(() => (comp as any).sseSource?.close());

    it('opens an EventSource scoped to the current party', () => {
      comp.partyId = 'party-1';

      (comp as any).startPartyEndedStream();

      expect((comp as any).sseSource.url).toContain('/api/spotify/events?source=web&partyId=party-1');
    });

    it('reloads the playlist on a queue-updated event', () => {
      comp.partyId = 'party-1';
      http.get.and.returnValue(of({ queue: [] }));
      (comp as any).startPartyEndedStream();

      (comp as any).sseSource.onmessage({ data: JSON.stringify({ type: 'queue-updated' }) });

      expect(http.get).toHaveBeenCalledWith('/api/party/party-1/track/queue');
    });

    it('reloads the current playback and playlist on a track-changed event', () => {
      comp.partyId = 'party-1';
      http.get.and.returnValue(of({}));
      (comp as any).startPartyEndedStream();

      (comp as any).sseSource.onmessage({ data: JSON.stringify({ type: 'track-changed' }) });

      expect(http.get).toHaveBeenCalledWith('/api/party/party-1/track/current');
    });

    it('mirrors a progress event', () => {
      comp.partyId = 'party-1';
      (comp as any).startPartyEndedStream();

      (comp as any).sseSource.onmessage({
        data: JSON.stringify({ type: 'progress', payload: { position: '1000', duration: '2000', paused: 'false' } }),
      });

      expect(comp.currentPosition).toBe(1000);
      expect(comp.currentDuration).toBe(2000);
    });

    it('clears the party and navigates home when this party ends', () => {
      comp.partyId = 'party-1';
      (comp as any).startPartyEndedStream();

      (comp as any).sseSource.onmessage({ data: JSON.stringify({ type: 'party-ended', payload: { partyId: 'party-1' } }) });

      expect(partyService.clearParty).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('ignores party-ended events for other parties', () => {
      comp.partyId = 'party-1';
      (comp as any).startPartyEndedStream();

      (comp as any).sseSource.onmessage({ data: JSON.stringify({ type: 'party-ended', payload: { partyId: 'party-2' } }) });

      expect(partyService.clearParty).not.toHaveBeenCalled();
    });

    it('ignores malformed event data', () => {
      comp.partyId = 'party-1';
      (comp as any).startPartyEndedStream();

      expect(() => (comp as any).sseSource.onmessage({ data: 'not-json' })).not.toThrow();
    });
  });

  describe('ngOnDestroy', () => {
    it('unsubscribes and closes the SSE connection', () => {
      const queueUpdatesSub = { unsubscribe: jasmine.createSpy('unsubscribe') };
      (comp as any).queueUpdatesSub = queueUpdatesSub;
      const sseSource = { close: jasmine.createSpy('close') };
      (comp as any).sseSource = sseSource;

      comp.ngOnDestroy();

      expect(queueUpdatesSub.unsubscribe).toHaveBeenCalled();
      expect(sseSource.close).toHaveBeenCalled();
    });
  });
});
