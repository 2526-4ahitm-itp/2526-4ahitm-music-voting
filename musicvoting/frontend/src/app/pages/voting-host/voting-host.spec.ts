import { of, throwError } from 'rxjs';
import { VotingHost } from './voting-host';

describe('VotingHost', () => {
  let spotifyService: { getQueue: jasmine.Spy };
  let ngZone: { run: jasmine.Spy };
  let comp: VotingHost;

  beforeEach(() => {
    spotifyService = { getQueue: jasmine.createSpy('getQueue') };
    ngZone = { run: jasmine.createSpy('run').and.callFake((fn: () => void) => fn()) };
    comp = new VotingHost(spotifyService as any, ngZone as any, null as any);
  });

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
});
