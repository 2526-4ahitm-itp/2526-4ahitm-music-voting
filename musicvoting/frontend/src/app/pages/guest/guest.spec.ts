import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { Guest } from './guest';
import { TrackService } from '../../services/spotify-tracks';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { QueueStateService } from '../../services/queue-state';
import { PartyService } from '../../services/party.service';
import { Router, provideRouter } from '@angular/router';

describe('Guest', () => {
  let trackApi: { searchTracks: jasmine.Spy };
  let spotifyService: { addToPlaylist: jasmine.Spy };
  let queueState: { inQueueUris$: BehaviorSubject<Set<string>>; refresh: jasmine.Spy };
  let cdr: { detectChanges: jasmine.Spy };
  let router: { navigate: jasmine.Spy };
  let ngZone: { run: jasmine.Spy };
  let comp: Guest;

  beforeEach(() => {
    trackApi = { searchTracks: jasmine.createSpy('searchTracks') };
    spotifyService = { addToPlaylist: jasmine.createSpy('addToPlaylist') };
    queueState = {
      inQueueUris$: new BehaviorSubject<Set<string>>(new Set()),
      refresh: jasmine.createSpy('refresh'),
    };
    cdr = { detectChanges: jasmine.createSpy('detectChanges') };
    router = { navigate: jasmine.createSpy('navigate') };
    ngZone = { run: jasmine.createSpy('run').and.callFake((fn: () => void) => fn()) };

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: PartyService, useValue: { currentPartyId: 'party-1' } }],
    });

    comp = TestBed.runInInjectionContext(
      () => new Guest(trackApi as any, spotifyService as any, queueState as any, cdr as any, router as any, ngZone as any)
    );
  });

  afterEach(() => comp.ngOnDestroy());

  it('search with an empty query clears the tracks', async () => {
    await comp.search('');

    expect(comp.tracks()).toEqual([]);
    expect(trackApi.searchTracks).not.toHaveBeenCalled();
  });

  it('search sets unique tracks limited to 25 from the response', async () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ id: `t${i % 26}`, name: `Song ${i}` }));
    trackApi.searchTracks.and.returnValue(of({ tracks: { items } }));

    await comp.search('query');

    expect(comp.tracks().length).toBe(25);
    expect(comp.isSearching()).toBe(false);
  });

  it('search logs an error when the request fails', async () => {
    spyOn(console, 'error');
    trackApi.searchTracks.and.returnValue(throwError(() => new Error('boom')));

    await comp.search('query');

    expect(console.error).toHaveBeenCalled();
    expect(comp.isSearching()).toBe(false);
  });

  it('addToPlaylist adds the track and refreshes the queue state', async () => {
    spotifyService.addToPlaylist.and.returnValue(of({}));
    const track = { id: 't1', uri: 'spotify:track:t1', name: 'Song' };

    const promise = comp.addToPlaylist(track);
    expect(comp.addingTrackId).toBe('t1');

    await promise;

    expect(spotifyService.addToPlaylist).toHaveBeenCalledWith('spotify:track:t1');
    expect(queueState.refresh).toHaveBeenCalled();
    expect(comp.addingTrackId).toBeNull();
  });

  it('addToPlaylist logs an error and resets addingTrackId on failure', async () => {
    spyOn(console, 'error');
    spotifyService.addToPlaylist.and.returnValue(throwError(() => new Error('boom')));
    const track = { id: 't1', uri: 'spotify:track:t1', name: 'Song' };

    await comp.addToPlaylist(track);

    expect(console.error).toHaveBeenCalled();
    expect(comp.addingTrackId).toBeNull();
  });

  it('addToPlaylist does nothing for a blacklisted track', async () => {
    const track = { id: 't1', uri: 'spotify:track:t1', name: 'Song (Live)', blocked: true };

    await comp.addToPlaylist(track);

    expect(spotifyService.addToPlaylist).not.toHaveBeenCalled();
  });

  it('addToPlaylist shows the backend message "Nicht erlaubt." on a 403', async () => {
    spyOn(console, 'error');
    spotifyService.addToPlaylist.and.returnValue(
      throwError(() => ({ status: 403, error: { error: 'Nicht erlaubt.' } }))
    );

    await comp.addToPlaylist({ id: 't1', uri: 'spotify:track:t1', name: 'Song' });

    expect(comp.addError).toBe('Nicht erlaubt.');
    expect(comp.addingTrackId).toBeNull();
  });

  it('addToPlaylist clears a previous error on the next add', async () => {
    comp.addError = 'Nicht erlaubt.';
    spotifyService.addToPlaylist.and.returnValue(of({}));

    await comp.addToPlaylist({ id: 't2', uri: 'spotify:track:t2', name: 'Other' });

    expect(comp.addError).toBeNull();
  });

  it('toggleMenu toggles menuOpen', () => {
    expect(comp.menuOpen).toBe(false);

    comp.toggleMenu();
    expect(comp.menuOpen).toBe(true);
  });

  it('trackById combines the track id and index', () => {
    expect(comp.trackById(2, { id: 'abc' })).toBe('abc-2');
  });

  it('goToVoting navigates to /vote', () => {
    comp.goToVoting();

    expect(router.navigate).toHaveBeenCalledWith(['/vote']);
  });

  it('goToAddSongs navigates to /guest', () => {
    comp.goToAddSongs();

    expect(router.navigate).toHaveBeenCalledWith(['/guest']);
  });

  it('ngOnInit syncs inQueueUris from the queue state service', () => {
    comp.ngOnInit();

    queueState.inQueueUris$.next(new Set(['spotify:track:abc']));

    expect(comp.inQueueUris).toEqual(new Set(['spotify:track:abc']));
    expect(cdr.detectChanges).toHaveBeenCalled();
  });

  it('navigates home when a party-ended event is received', () => {
    comp.ngOnInit();

    (comp as any).eventSource.onmessage({ data: JSON.stringify({ type: 'party-ended' }) });

    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('ngOnInit opens the event stream with the party id, so party events reach this page', () => {
    comp.ngOnInit();

    expect((comp as any).eventSource.url).toContain('/api/spotify/events?source=web&partyId=party-1');
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

  it('refreshes the queue state when a queue-updated event is received', () => {
    comp.ngOnInit();

    (comp as any).eventSource.onmessage({ data: JSON.stringify({ type: 'queue-updated' }) });

    expect(queueState.refresh).toHaveBeenCalled();
  });

  it('ignores malformed event data', () => {
    comp.ngOnInit();

    expect(() => (comp as any).eventSource.onmessage({ data: 'not-json' })).not.toThrow();
  });

  it('ngOnDestroy closes the event source and unsubscribes', () => {
    comp.ngOnInit();
    const eventSource = (comp as any).eventSource;
    spyOn(eventSource, 'close');

    comp.ngOnDestroy();

    expect(eventSource.close).toHaveBeenCalled();
  });
});

// Renders the real template: a blacklisted search result must be greyed out with a disabled "+"
// but without any text hint, while other results stay addable.
describe('Guest search results (DOM)', () => {
  it('greys out blacklisted results and disables their "+"', async () => {
    TestBed.configureTestingModule({
      imports: [Guest],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: PartyService, useValue: { currentPartyId: 'party-1' } },
        { provide: TrackService, useValue: { searchTracks: () => of({}) } },
        { provide: SpotifyWebPlayerService, useValue: { addToPlaylist: () => of({}) } },
        { provide: QueueStateService, useValue: { inQueueUris$: new BehaviorSubject<Set<string>>(new Set()), refresh: () => {} } },
      ],
    });
    const fixture = TestBed.createComponent(Guest);
    fixture.detectChanges();

    fixture.componentInstance.tracks.set([
      { id: 't1', uri: 'spotify:track:t1', name: 'Song X (Live)', artists: [{ name: 'A' }], blocked: true },
      { id: 't2', uri: 'spotify:track:t2', name: 'Delivery', artists: [{ name: 'B' }], blocked: false },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const cards: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.track-card'));
    expect(cards.length).toBe(2);
    expect(cards[0].classList).toContain('blocked');
    expect(cards[0].textContent).not.toContain('Nicht erlaubt.');
    expect((cards[0].querySelector('.add-button') as HTMLButtonElement).disabled).toBe(true);
    expect(cards[1].classList).not.toContain('blocked');
    expect(cards[1].textContent).not.toContain('Nicht erlaubt.');
    expect((cards[1].querySelector('.add-button') as HTMLButtonElement).disabled).toBe(false);

    fixture.destroy();
  });
});
