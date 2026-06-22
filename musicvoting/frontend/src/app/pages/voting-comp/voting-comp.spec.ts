import { of, throwError } from 'rxjs';
import { VotingComp } from './voting-comp';

describe('VotingComp', () => {
  let spotifyService: { getQueue: jasmine.Spy };
  let ngZone: { run: jasmine.Spy };
  let router: { navigate: jasmine.Spy };
  let partyService: { currentPartyId: string | null };
  let comp: VotingComp;

  beforeEach(() => {
    spotifyService = { getQueue: jasmine.createSpy('getQueue') };
    ngZone = { run: jasmine.createSpy('run').and.callFake((fn: () => void) => fn()) };
    router = { navigate: jasmine.createSpy('navigate') };
    partyService = { currentPartyId: 'party-1' };
    comp = new VotingComp(spotifyService as any, ngZone as any, null as any, router as any, partyService as any);
  });

  afterEach(() => comp.ngOnDestroy());

  it('filteredTracks returns all tracks when the search query is empty', () => {
    comp.tracks.set([
      { name: 'Song A', artists: [{ name: 'Artist A' }] },
      { name: 'Song B', artists: [{ name: 'Artist B' }] },
    ]);

    expect(comp.filteredTracks().length).toBe(2);
  });

  it('filteredTracks filters by track name or artist name', () => {
    comp.tracks.set([
      { name: 'Song A', artists: [{ name: 'Artist A' }] },
      { name: 'Song B', artists: [{ name: 'Artist B' }] },
    ]);
    comp.searchQuery.set('artist b');

    expect(comp.filteredTracks()).toEqual([{ name: 'Song B', artists: [{ name: 'Artist B' }] }]);
  });

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

  it('loadPlaylist logs an error when the request fails', async () => {
    spyOn(console, 'error');
    spotifyService.getQueue.and.returnValue(throwError(() => new Error('boom')));

    await comp.loadPlaylist();

    expect(console.error).toHaveBeenCalled();
  });

  it('onSearch sets the search query from the input value', async () => {
    const event = { target: { value: 'song a' } } as unknown as Event;

    await comp.onSearch(event);

    expect(comp.searchQuery()).toBe('song a');
  });

  it('toggleMenu toggles menuOpen', () => {
    expect(comp.menuOpen).toBe(false);

    comp.toggleMenu();
    expect(comp.menuOpen).toBe(true);

    comp.toggleMenu();
    expect(comp.menuOpen).toBe(false);
  });

  it('ngOnInit opens an EventSource for live updates including the party id', async () => {
    spotifyService.getQueue.and.returnValue(of({ queue: [] }));

    comp.ngOnInit();

    expect((comp as any).eventSource).toBeInstanceOf(EventSource);
    expect((comp as any).eventSource.url).toContain('/api/spotify/events?source=web&partyId=party-1');
  });

  it('navigates home when a party-ended event is received', async () => {
    spotifyService.getQueue.and.returnValue(of({ queue: [] }));
    comp.ngOnInit();

    (comp as any).eventSource.onmessage({ data: JSON.stringify({ type: 'party-ended' }) });

    expect(router.navigate).toHaveBeenCalledWith(['/']);
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
});
