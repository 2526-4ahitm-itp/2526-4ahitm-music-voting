import { of, throwError } from 'rxjs';
import { Startpage } from './startpage';

describe('Startpage', () => {
  let spotifyService: { disconnectPlayer: jasmine.Spy };
  let http: { get: jasmine.Spy; post: jasmine.Spy };
  let router: { navigate: jasmine.Spy };
  let ngZone: { run: jasmine.Spy };
  let cd: { detectChanges: jasmine.Spy };
  let comp: Startpage;

  beforeEach(() => {
    spotifyService = { disconnectPlayer: jasmine.createSpy('disconnectPlayer').and.resolveTo(undefined) };
    http = { get: jasmine.createSpy('get'), post: jasmine.createSpy('post') };
    router = { navigate: jasmine.createSpy('navigate') };
    ngZone = { run: jasmine.createSpy('run').and.callFake((fn: () => void) => fn()) };
    cd = { detectChanges: jasmine.createSpy('detectChanges') };

    comp = new Startpage(
      spotifyService as any,
      ngZone as any,
      http as any,
      cd as any,
      null as any, // partyService
      null as any, // route
      router as any,
    );
  });

  afterEach(() => comp.stopProgressTimer());

  describe('formatTime', () => {
    it('returns 0:00 for falsy or NaN values', () => {
      expect(comp.formatTime(0)).toBe('0:00');
      expect(comp.formatTime(NaN)).toBe('0:00');
    });

    it('formats minutes and seconds with zero-padding', () => {
      expect(comp.formatTime(65_000)).toBe('1:05');
      expect(comp.formatTime(125_000)).toBe('2:05');
    });
  });

  describe('trackById', () => {
    it('prefers the track id', () => {
      expect(comp.trackById(2, { id: 'abc', uri: 'spotify:track:abc' })).toBe('abc');
    });

    it('falls back to the uri when there is no id', () => {
      expect(comp.trackById(2, { uri: 'spotify:track:abc' })).toBe('spotify:track:abc');
    });

    it('falls back to the index when there is neither id nor uri', () => {
      expect(comp.trackById(2, {})).toBe(2);
    });
  });

  it('toggleMenu toggles menuOpen', () => {
    expect(comp.menuOpen).toBe(false);

    comp.toggleMenu();
    expect(comp.menuOpen).toBe(true);
  });

  describe('loadCurrentTrack', () => {
    it('does nothing without an active party', async () => {
      await comp.loadCurrentTrack();

      expect(http.get).not.toHaveBeenCalled();
    });

    it('sets the current track from the response', async () => {
      (comp as any).partyId = 'party-1';
      http.get.and.returnValue(of({ track: { id: 't1', name: 'Song' } }));

      await comp.loadCurrentTrack();

      expect(http.get).toHaveBeenCalledWith('/api/party/party-1/track/current');
      expect(comp.currentTrack).toEqual({ id: 't1', name: 'Song' });
    });

    it('logs an error when the request fails', async () => {
      spyOn(console, 'error');
      (comp as any).partyId = 'party-1';
      http.get.and.returnValue(throwError(() => new Error('boom')));

      await comp.loadCurrentTrack();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('loadPlaylist', () => {
    it('does nothing without an active party', async () => {
      await comp.loadPlaylist();

      // SpotifyWebPlayerService is null here, so any call would throw -
      // absence of a thrown error confirms the early return.
    });

    it('filters out the currently playing track by uri', async () => {
      (comp as any).partyId = 'party-1';
      comp.currentTrack = { uri: 'spotify:track:current' };
      const spotifyService2 = { getQueue: jasmine.createSpy('getQueue').and.returnValue(of({
        queue: [
          { uri: 'spotify:track:current', name: 'Now Playing' },
          { uri: 'spotify:track:next', name: 'Next Up' },
        ],
      })) };
      (comp as any).spotifyService = spotifyService2;

      await comp.loadPlaylist();

      expect(comp.tracks).toEqual([{ uri: 'spotify:track:next', name: 'Next Up' }]);
    });

    it('logs an error when the request fails', async () => {
      spyOn(console, 'error');
      (comp as any).partyId = 'party-1';
      (comp as any).spotifyService = { getQueue: jasmine.createSpy('getQueue').and.returnValue(throwError(() => new Error('boom'))) };

      await comp.loadPlaylist();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('playNext', () => {
    it('does nothing without an active party', async () => {
      await comp.playNext();

      expect(http.post).not.toHaveBeenCalled();
    });

    it('advances to the next track and reloads playlist/current track', async () => {
      (comp as any).partyId = 'party-1';
      http.post.and.returnValue(of({}));
      http.get.and.returnValue(of({ track: null }));
      (comp as any).spotifyService = { getQueue: jasmine.createSpy('getQueue').and.returnValue(of({ queue: [] })) };

      await comp.playNext();

      expect(http.post).toHaveBeenCalledWith('/api/party/party-1/track/next', {});
    });

    it('ignores concurrent calls while already advancing', async () => {
      (comp as any).partyId = 'party-1';
      (comp as any).isAdvancing = true;

      await comp.playNext();

      expect(http.post).not.toHaveBeenCalled();
    });
  });

  describe('maybeAdvanceOnEnd', () => {
    const stateFor = (uri: string, paused: boolean, position: number, duration = 200_000) => ({
      paused,
      position,
      duration,
      track_window: { current_track: { uri } },
    });

    beforeEach(() => spyOn(comp, 'playNext').and.resolveTo(undefined));

    it('does nothing when the SDK returns no state', () => {
      (comp as any).maybeAdvanceOnEnd(null);

      expect(comp.playNext).not.toHaveBeenCalled();
    });

    it('does not advance on a load-time paused/0 state before the track has played', () => {
      // New track reported as paused at position 0 while loading — must NOT be an end.
      (comp as any).maybeAdvanceOnEnd(stateFor('spotify:track:a', true, 0));

      expect(comp.playNext).not.toHaveBeenCalled();
    });

    it('advances when a played track is paused right at its duration', () => {
      // Some SDK end events leave position at the duration instead of resetting to 0.
      (comp as any).maybeAdvanceOnEnd(stateFor('spotify:track:a', false, 1000, 200_000));
      (comp as any).maybeAdvanceOnEnd(stateFor('spotify:track:a', true, 200_000, 200_000));

      expect(comp.playNext).toHaveBeenCalledTimes(1);
    });

    it('does not advance on a mid-song manual pause', () => {
      (comp as any).maybeAdvanceOnEnd(stateFor('spotify:track:a', false, 1000, 200_000));
      (comp as any).maybeAdvanceOnEnd(stateFor('spotify:track:a', true, 90_000, 200_000));

      expect(comp.playNext).not.toHaveBeenCalled();
    });

    it('does not advance while the track is still playing', () => {
      // Still playing near the end must NOT advance — only the natural end triggers it.
      (comp as any).maybeAdvanceOnEnd(stateFor('spotify:track:a', false, 199_000, 200_000));

      expect(comp.playNext).not.toHaveBeenCalled();
    });

    it('advances once when a track that was playing reaches paused/0', () => {
      (comp as any).maybeAdvanceOnEnd(stateFor('spotify:track:a', false, 1000));
      (comp as any).maybeAdvanceOnEnd(stateFor('spotify:track:a', true, 0));

      expect(comp.playNext).toHaveBeenCalledTimes(1);
    });

    it('fires playNext only once even if the SDK repeats the ended state', () => {
      (comp as any).maybeAdvanceOnEnd(stateFor('spotify:track:a', false, 1000));
      (comp as any).maybeAdvanceOnEnd(stateFor('spotify:track:a', true, 0));
      (comp as any).maybeAdvanceOnEnd(stateFor('spotify:track:a', true, 0));

      expect(comp.playNext).toHaveBeenCalledTimes(1);
    });

    it('detects the end of each new track independently across a switch', () => {
      // Guest-added song plays then ends.
      (comp as any).maybeAdvanceOnEnd(stateFor('spotify:track:guest', false, 1000));
      (comp as any).maybeAdvanceOnEnd(stateFor('spotify:track:guest', true, 0));
      // Auto-filled song loads (paused/0), then plays, then ends.
      (comp as any).maybeAdvanceOnEnd(stateFor('spotify:track:filler', true, 0));
      (comp as any).maybeAdvanceOnEnd(stateFor('spotify:track:filler', false, 1000));
      (comp as any).maybeAdvanceOnEnd(stateFor('spotify:track:filler', true, 0));

      expect(comp.playNext).toHaveBeenCalledTimes(2);
    });
  });

  describe('maybeAdvanceOnElapsed', () => {
    beforeEach(() => spyOn(comp, 'playNext').and.resolveTo(undefined));

    const primePlaying = (uri: string, duration: number) => {
      (comp as any).playingUri = uri;
      (comp as any).sawPlaybackForUri = true;
      (comp as any).endHandledForUri = false;
      comp.currentDuration = duration;
    };

    it('advances when elapsed position reaches the duration (SDK went silent)', () => {
      primePlaying('spotify:track:a', 200_000);
      comp.currentPosition = 200_000;

      (comp as any).maybeAdvanceOnElapsed();

      expect(comp.playNext).toHaveBeenCalledTimes(1);
    });

    it('does not advance before the track has elapsed', () => {
      primePlaying('spotify:track:a', 200_000);
      comp.currentPosition = 120_000;

      (comp as any).maybeAdvanceOnElapsed();

      expect(comp.playNext).not.toHaveBeenCalled();
    });

    it('does not advance twice for the same track', () => {
      primePlaying('spotify:track:a', 200_000);
      comp.currentPosition = 200_000;

      (comp as any).maybeAdvanceOnElapsed();
      (comp as any).maybeAdvanceOnElapsed();

      expect(comp.playNext).toHaveBeenCalledTimes(1);
    });

    it('does nothing before any track has been seen playing', () => {
      (comp as any).playingUri = null;
      comp.currentPosition = 999_000;
      comp.currentDuration = 200_000;

      (comp as any).maybeAdvanceOnElapsed();

      expect(comp.playNext).not.toHaveBeenCalled();
    });
  });

  describe('ensurePlaybackIfIdle', () => {
    it('starts the first queued song when nothing is currently playing', async () => {
      (comp as any).partyId = 'party-1';
      http.get.and.returnValue(of({ track: null }));
      const getQueue = jasmine.createSpy('getQueue').and.returnValue(
        of({ queue: [{ uri: 'spotify:track:added', isCurrentlyPlaying: false }] }),
      );
      (comp as any).spotifyService = { getQueue };
      spyOn(comp, 'playNext').and.resolveTo(undefined);

      await (comp as any).ensurePlaybackIfIdle();

      expect(comp.playNext).toHaveBeenCalled();
    });

    it('does nothing when a track is already current', async () => {
      (comp as any).partyId = 'party-1';
      http.get.and.returnValue(of({ track: { uri: 'spotify:track:playing' } }));
      (comp as any).spotifyService = { getQueue: jasmine.createSpy('getQueue') };
      spyOn(comp, 'playNext').and.resolveTo(undefined);

      await (comp as any).ensurePlaybackIfIdle();

      expect(comp.playNext).not.toHaveBeenCalled();
      expect((comp as any).spotifyService.getQueue).not.toHaveBeenCalled();
    });

    it('does nothing when idle but the queue is empty', async () => {
      (comp as any).partyId = 'party-1';
      http.get.and.returnValue(of({ track: null }));
      (comp as any).spotifyService = {
        getQueue: jasmine.createSpy('getQueue').and.returnValue(of({ queue: [] })),
      };
      spyOn(comp, 'playNext').and.resolveTo(undefined);

      await (comp as any).ensurePlaybackIfIdle();

      expect(comp.playNext).not.toHaveBeenCalled();
    });

    it('does not interfere while an advance is already in flight', async () => {
      (comp as any).partyId = 'party-1';
      (comp as any).isAdvancing = true;
      spyOn(comp, 'playNext').and.resolveTo(undefined);

      await (comp as any).ensurePlaybackIfIdle();

      expect(http.get).not.toHaveBeenCalled();
      expect(comp.playNext).not.toHaveBeenCalled();
    });
  });

  describe('startLoginEventStream', () => {
    afterEach(() => (comp as any).eventSource?.close());

    it('opens an EventSource scoped to the current party', () => {
      (comp as any).partyId = 'party-1';

      (comp as any).startLoginEventStream();

      expect((comp as any).eventSource.url).toContain('/api/spotify/events?source=web&partyId=party-1');
    });

    it('reloads the playlist on a queue-updated event', () => {
      (comp as any).partyId = 'party-1';
      (comp as any).spotifyService = { getQueue: jasmine.createSpy('getQueue').and.returnValue(of({ queue: [] })) };
      (comp as any).startLoginEventStream();

      (comp as any).eventSource.onmessage({ data: JSON.stringify({ type: 'queue-updated' }) });

      expect((comp as any).spotifyService.getQueue).toHaveBeenCalled();
    });

    it('reloads the current track and playlist on a track-changed event', () => {
      (comp as any).partyId = 'party-1';
      http.get.and.returnValue(of({ track: null }));
      (comp as any).spotifyService = { getQueue: jasmine.createSpy('getQueue').and.returnValue(of({ queue: [] })) };
      (comp as any).startLoginEventStream();

      (comp as any).eventSource.onmessage({ data: JSON.stringify({ type: 'track-changed' }) });

      expect(http.get).toHaveBeenCalledWith('/api/party/party-1/track/current');
    });

    it('disconnects the player and navigates home on a party-ended event', async () => {
      (comp as any).partyId = 'party-1';
      (comp as any).startLoginEventStream();

      (comp as any).eventSource.onmessage({ data: JSON.stringify({ type: 'party-ended' }) });
      await Promise.resolve();

      expect(spotifyService.disconnectPlayer).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('ignores malformed event data', () => {
      (comp as any).partyId = 'party-1';
      (comp as any).startLoginEventStream();

      expect(() => (comp as any).eventSource.onmessage({ data: 'not-json' })).not.toThrow();
    });
  });

  describe('publishProgress', () => {
    it('does nothing without an active party', () => {
      (comp as any).publishProgress(false);

      expect(http.post).not.toHaveBeenCalled();
    });

    it('posts the current playback position for the active party', () => {
      (comp as any).partyId = 'party-1';
      comp.currentPosition = 1000;
      comp.currentDuration = 2000;
      http.post.and.returnValue(of({}));

      (comp as any).publishProgress(true);

      expect(http.post).toHaveBeenCalledWith('/api/party/party-1/track/progress', {
        position: 1000,
        duration: 2000,
        paused: true,
      });
    });
  });

  describe('ngOnDestroy', () => {
    it('stops the timer, unsubscribes, closes the event source and disconnects the player', () => {
      comp.startProgressTimer();
      const queueUpdatesSub = { unsubscribe: jasmine.createSpy('unsubscribe') };
      (comp as any).queueUpdatesSub = queueUpdatesSub;
      const eventSource = { close: jasmine.createSpy('close') };
      (comp as any).eventSource = eventSource;

      comp.ngOnDestroy();

      expect((comp as any).progressInterval).toBeNull();
      expect(queueUpdatesSub.unsubscribe).toHaveBeenCalled();
      expect(eventSource.close).toHaveBeenCalled();
      expect(spotifyService.disconnectPlayer).toHaveBeenCalled();
    });
  });
});
