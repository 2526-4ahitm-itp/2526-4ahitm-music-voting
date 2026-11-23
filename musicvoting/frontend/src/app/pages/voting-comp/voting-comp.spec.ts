import { EMPTY, of, throwError } from 'rxjs';
import { VotingComp } from './voting-comp';

import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';

/**
 * Unit tests of the single guest page: queue loading, live events, and the
 * provider search that used to live on the separate add/search page.
 */
describe('VotingComp', () => {
  let spotifyService: { getQueue: jasmine.Spy; addToPlaylist: jasmine.Spy };
  let trackApi: { searchTracks: jasmine.Spy };
  let ngZone: { run: jasmine.Spy };
  let partyService: { currentPartyId: string | null; deviceId: string };
  let toast: { show: jasmine.Spy; error: jasmine.Spy };
  let comp: VotingComp;

  beforeEach(() => {
    spotifyService = {
      getQueue: jasmine.createSpy('getQueue').and.returnValue(of({ queue: [] })),
      addToPlaylist: jasmine.createSpy('addToPlaylist'),
    };
    trackApi = { searchTracks: jasmine.createSpy('searchTracks') };
    ngZone = { run: jasmine.createSpy('run').and.callFake((fn: () => void) => fn()) };
    partyService = { currentPartyId: 'party-1', deviceId: 'device-1' };
    toast = { show: jasmine.createSpy('show'), error: jasmine.createSpy('error') };
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    // toObservable() in the component needs an injection context.
    comp = TestBed.runInInjectionContext(
      () => new VotingComp(spotifyService as any, trackApi as any, ngZone as any, null as any, partyService as any, toast as any)
    );
  });

  afterEach(() => comp.ngOnDestroy());

  it('loadPlaylist sets tracks from the queue response', async () => {
    spotifyService.getQueue.and.returnValue(of({ queue: [{ name: 'Song A', artists: [] }] }));

    await comp.loadPlaylist();

    expect(comp.tracks()).toEqual([{ name: 'Song A', artists: [] }]);
  });

  it('loadPlaylist sets an empty array when the response has no queue', async () => {
    spotifyService.getQueue.and.returnValue(of({}));

    await comp.loadPlaylist();

    expect(comp.tracks()).toEqual([]);
  });

  it('loadPlaylist treats a response without value (no party stored) as an empty queue, not an error', async () => {
    spyOn(console, 'error');
    comp.tracks.set([{ name: 'old', artists: [] }]);
    spotifyService.getQueue.and.returnValue(EMPTY);

    await comp.loadPlaylist();

    expect(comp.tracks()).toEqual([]);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('loadPlaylist logs an error when the request fails', async () => {
    spyOn(console, 'error');
    spotifyService.getQueue.and.returnValue(throwError(() => new Error('boom')));

    await comp.loadPlaylist();

    expect(console.error).toHaveBeenCalled();
  });

  it('onSearch sets the search query from the input value', () => {
    const event = { target: { value: 'song a' } } as unknown as Event;

    comp.onSearch(event);

    expect(comp.searchQuery()).toBe('song a');
    expect(comp.isSearchMode()).toBe(true);
  });

  it('is not in search mode for an empty or blank field', () => {
    comp.searchQuery.set('   ');

    expect(comp.isSearchMode()).toBe(false);
  });

  it('ngOnInit opens an EventSource for live updates including the party id', async () => {
    spotifyService.getQueue.and.returnValue(of({ queue: [] }));

    comp.ngOnInit();

    expect((comp as any).eventSource).toBeInstanceOf(EventSource);
    expect((comp as any).eventSource.url).toContain('/api/spotify/events?source=web&partyId=party-1');
  });

  it('shows the goodbye screen instead of redirecting when a party-ended event is received', async () => {
    spotifyService.getQueue.and.returnValue(of({ queue: [] }));
    comp.ngOnInit();
    const es = (comp as any).eventSource as EventSource;
    spyOn(es, 'close');

    es.onmessage!({ data: JSON.stringify({ type: 'party-ended' }) } as MessageEvent);

    expect(comp.partyEnded()).toBe(true);
    expect(es.close).toHaveBeenCalled();
  });

  it('reloads the playlist when a queue-updated event is received', async () => {
    spotifyService.getQueue.and.returnValue(of({ queue: [{ name: 'New Song', artists: [] }] }));
    comp.ngOnInit();
    spotifyService.getQueue.calls.reset();

    (comp as any).eventSource.onmessage({ data: JSON.stringify({ type: 'queue-updated' }) });

    expect(spotifyService.getQueue).toHaveBeenCalled();
  });

  it('ignores malformed event data', async () => {
    spotifyService.getQueue.and.returnValue(of({ queue: [] }));
    comp.ngOnInit();

    expect(() => (comp as any).eventSource.onmessage({ data: 'not-json' })).not.toThrow();
  });

  it('ngOnDestroy closes the event source', async () => {
    spotifyService.getQueue.and.returnValue(of({ queue: [] }));
    comp.ngOnInit();
    const eventSource = (comp as any).eventSource;
    spyOn(eventSource, 'close');

    comp.ngOnDestroy();

    expect(eventSource.close).toHaveBeenCalled();
  });

  describe('search (moved from the add/search page)', () => {
    it('an empty query clears the results and sends no request', async () => {
      await comp.search('');

      expect(comp.results()).toEqual([]);
      expect(trackApi.searchTracks).not.toHaveBeenCalled();
    });

    it('keeps unique results, at most 25', async () => {
      const items = Array.from({ length: 30 }, (_, i) => ({ id: `t${i % 26}`, name: `Song ${i}` }));
      trackApi.searchTracks.and.returnValue(of({ tracks: { items } }));

      await comp.search('query');

      expect(comp.results().length).toBe(25);
      expect(comp.isSearching()).toBe(false);
    });

    it('marks a failed search so the connection message is shown', async () => {
      spyOn(console, 'error');
      trackApi.searchTracks.and.returnValue(throwError(() => new Error('offline')));

      await comp.search('query');

      expect(comp.searchFailed()).toBe(true);
      expect(comp.isSearching()).toBe(false);
    });

    it('remembers the searched term for the "Keine Treffer" message', async () => {
      trackApi.searchTracks.and.returnValue(of({ tracks: { items: [] } }));

      await comp.search('xyzxyzxyz');

      expect(comp.results()).toEqual([]);
      expect(comp.lastSearchedTerm()).toBe('xyzxyzxyz');
    });

    it('searches in guest mode so banned artists are removed by the backend', async () => {
      trackApi.searchTracks.and.returnValue(of({ tracks: { items: [] }, hiddenHint: null }));

      await comp.search('drake');

      expect(trackApi.searchTracks).toHaveBeenCalledWith('drake', { guest: true });
    });

    it('shows the artist hint when the guest searched for a banned artist', async () => {
      trackApi.searchTracks.and.returnValue(of({ tracks: { items: [{ id: 't1', blocked: true }] }, hiddenHint: 'ARTIST' }));

      await comp.search('drake');

      expect(comp.hiddenHintText()).toBe('Dieser Artist ist vom Gastgeber gesperrt.');
    });

    it('shows the general hint when songs were hidden or a result is greyed out', async () => {
      trackApi.searchTracks.and.returnValue(of({ tracks: { items: [{ id: 't1' }] }, hiddenHint: 'SOME' }));
      await comp.search('hotline');
      expect(comp.hiddenHintText()).toBe('Einige Ergebnisse sind vom Gastgeber gesperrt.');

      trackApi.searchTracks.and.returnValue(of({ tracks: { items: [{ id: 't1', blocked: true }, { id: 't2' }] }, hiddenHint: null }));
      await comp.search('live');
      expect(comp.hiddenHintText()).toBe('Einige Ergebnisse sind vom Gastgeber gesperrt.');
    });

    it('has no hint when nothing was hidden, and clears it on an empty query or error', async () => {
      trackApi.searchTracks.and.returnValue(of({ tracks: { items: [{ id: 't1', blocked: false }] }, hiddenHint: null }));
      await comp.search('queen');
      expect(comp.hiddenHintText()).toBeNull();

      trackApi.searchTracks.and.returnValue(of({ tracks: { items: [] }, hiddenHint: 'SOME' }));
      await comp.search('drake');
      await comp.search('   ');
      expect(comp.hiddenHint()).toBeNull();

      spyOn(console, 'error');
      await comp.search('drake');
      trackApi.searchTracks.and.returnValue(throwError(() => new Error('offline')));
      await comp.search('drake');
      expect(comp.hiddenHint()).toBeNull();
    });

    it('re-runs the current search when a blacklist-updated event is received', () => {
      spyOn(comp, 'search').and.returnValue(Promise.resolve());
      comp.searchQuery.set('queen');
      comp.ngOnInit();

      (comp as any).eventSource.onmessage({ data: JSON.stringify({ type: 'blacklist-updated' }) });

      expect(comp.search).toHaveBeenCalledWith('queen');
    });

    it('does not search on blacklist-updated while the search field is empty', () => {
      spyOn(comp, 'search').and.returnValue(Promise.resolve());
      comp.ngOnInit();

      (comp as any).eventSource.onmessage({ data: JSON.stringify({ type: 'blacklist-updated' }) });

      expect(comp.search).not.toHaveBeenCalled();
    });
  });

  describe('result states (guest spec "Guest Votes on Queued Songs from Search Results")', () => {
    it('derives blocked, queued and addable from the queue by URI', () => {
      comp.tracks.set([{ uri: 'spotify:track:q', likeCount: 2 }]);

      expect(comp.resultState({ uri: 'spotify:track:q' })).toBe('queued');
      expect(comp.queued({ uri: 'spotify:track:q' }).likeCount).toBe(2);
      expect(comp.resultState({ uri: 'spotify:track:new' })).toBe('addable');
      expect(comp.resultState({ uri: 'spotify:track:q', blocked: true })).toBe('blocked');
    });
  });

  describe('add', () => {
    const track = { id: 't1', uri: 'spotify:track:t1', name: 'Song' };

    it('adds the track, reloads the queue and confirms with the rank, without an action', async () => {
      spotifyService.addToPlaylist.and.returnValue(of({}));
      spotifyService.getQueue.and.returnValue(of({ queue: [
        { uri: 'spotify:track:now', isCurrentlyPlaying: true },
        { uri: 'spotify:track:a' },
        { uri: 'spotify:track:t1' },
      ] }));

      const promise = comp.addToPlaylist(track);
      expect(comp.addingTrackId).toBe('t1');
      await promise;

      expect(spotifyService.addToPlaylist).toHaveBeenCalledWith('spotify:track:t1');
      expect(toast.show).toHaveBeenCalledWith('Song hinzugefügt – Platz 2', { durationMs: 1500, icon: 'check' });
      expect(comp.resultState(track)).toBe('queued');
      expect(comp.addingTrackId).toBeNull();
    });

    it('says only "Song hinzugefügt" when the rank is unknown', async () => {
      spotifyService.addToPlaylist.and.returnValue(of({}));

      await comp.addToPlaylist(track);

      expect(toast.show).toHaveBeenCalledWith('Song hinzugefügt', { durationMs: 1500, icon: 'check' });
    });

    it('shows the backend message verbatim on a rejection', async () => {
      spyOn(console, 'error');
      spotifyService.addToPlaylist.and.returnValue(throwError(() => ({ status: 403, error: { error: 'Nicht erlaubt.' } })));

      await comp.addToPlaylist(track);

      expect(toast.error).toHaveBeenCalledWith('Nicht erlaubt.');
      expect(comp.addingTrackId).toBeNull();
    });

    it('shows the connection message when the add fails without a backend message', async () => {
      spyOn(console, 'error');
      spotifyService.addToPlaylist.and.returnValue(throwError(() => new Error('boom')));

      await comp.addToPlaylist(track);

      expect(toast.error).toHaveBeenCalledWith('Verbindung verloren – versuch es gleich nochmal.');
    });

    it('does nothing for a blacklisted track', async () => {
      await comp.addToPlaylist({ ...track, blocked: true });

      expect(spotifyService.addToPlaylist).not.toHaveBeenCalled();
    });
  });
});
