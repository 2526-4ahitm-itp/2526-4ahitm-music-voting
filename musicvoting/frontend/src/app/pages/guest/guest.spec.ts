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

  it('trackById combines the track id and index', () => {
    expect(comp.trackById(2, { id: 'abc' })).toBe('abc-2');
  });

  it('ngOnInit syncs inQueueUris from the queue state service', () => {
    comp.ngOnInit();

    queueState.inQueueUris$.next(new Set(['spotify:track:abc']));

    expect(comp.inQueueUris).toEqual(new Set(['spotify:track:abc']));
    expect(cdr.detectChanges).toHaveBeenCalled();
  });

  it('shows the goodbye screen and stops listening when a party-ended event is received', () => {
    comp.ngOnInit();
    const es = (comp as any).eventSource as EventSource;
    spyOn(es, 'close');

    es.onmessage!({ data: JSON.stringify({ type: 'party-ended' }) } as MessageEvent);

    expect(comp.partyEnded()).toBe(true);
    expect(es.close).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('marks a failed search so the connection message is shown', async () => {
    spyOn(console, 'error');
    trackApi.searchTracks.and.returnValue(throwError(() => new Error('offline')));

    await comp.search('query');

    expect(comp.searchFailed()).toBe(true);
  });

  it('remembers the searched term for the "Keine Treffer" message', async () => {
    trackApi.searchTracks.and.returnValue(of({ tracks: { items: [] } }));

    await comp.search('xyzxyzxyz');

    expect(comp.tracks()).toEqual([]);
    expect(comp.lastSearchedTerm()).toBe('xyzxyzxyz');
  });

  it('searches in guest mode so banned artists are removed by the backend', async () => {
    trackApi.searchTracks.and.returnValue(of({ tracks: { items: [] }, hiddenHint: null }));

    await comp.search('drake');

    expect(trackApi.searchTracks).toHaveBeenCalledWith('drake', { guest: true });
  });

  it('shows the artist hint when the guest searched for a banned artist', async () => {
    trackApi.searchTracks.and.returnValue(of({ tracks: { items: [] }, hiddenHint: 'ARTIST' }));

    await comp.search('drake');

    expect(comp.hiddenHintText()).toBe('Dieser Artist ist nicht zulässig.');
  });

  it('shows the general hint when other songs were hidden', async () => {
    trackApi.searchTracks.and.returnValue(of({ tracks: { items: [{ id: 't1' }] }, hiddenHint: 'SOME' }));

    await comp.search('hotline');

    expect(comp.hiddenHintText()).toBe('Einige Ergebnisse sind auf dieser Party nicht zulässig.');
  });

  it('shows the general hint when a result is greyed out', async () => {
    trackApi.searchTracks.and.returnValue(of({ tracks: { items: [{ id: 't1', blocked: true }, { id: 't2', blocked: false }] }, hiddenHint: null }));

    await comp.search('live');

    expect(comp.hiddenHintText()).toBe('Einige Ergebnisse sind auf dieser Party nicht zulässig.');
  });

  it('keeps the artist hint when greyed-out results are shown as well', async () => {
    trackApi.searchTracks.and.returnValue(of({ tracks: { items: [{ id: 't1', blocked: true }] }, hiddenHint: 'ARTIST' }));

    await comp.search('drake');

    expect(comp.hiddenHintText()).toBe('Dieser Artist ist nicht zulässig.');
  });

  it('has no hint when no result is blocked', async () => {
    trackApi.searchTracks.and.returnValue(of({ tracks: { items: [{ id: 't1', blocked: false }] }, hiddenHint: null }));

    await comp.search('queen');

    expect(comp.hiddenHintText()).toBeNull();
  });

  it('has no hint when nothing was hidden, and clears it on an empty query or error', async () => {
    trackApi.searchTracks.and.returnValue(of({ tracks: { items: [] }, hiddenHint: 'ARTIST' }));
    await comp.search('drake');
    trackApi.searchTracks.and.returnValue(of({ tracks: { items: [] }, hiddenHint: null }));
    await comp.search('queen');
    expect(comp.hiddenHintText()).toBeNull();

    trackApi.searchTracks.and.returnValue(of({ tracks: { items: [] }, hiddenHint: 'SOME' }));
    await comp.search('drake');
    await comp.search('   ');
    expect(comp.hiddenHint()).toBeNull();

    spyOn(console, 'error');
    trackApi.searchTracks.and.returnValue(of({ tracks: { items: [] }, hiddenHint: 'SOME' }));
    await comp.search('drake');
    trackApi.searchTracks.and.returnValue(throwError(() => new Error('offline')));
    await comp.search('drake');
    expect(comp.hiddenHint()).toBeNull();
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

// The hint below the search field when songs by banned artists were removed (search spec).
describe('Guest hidden-results hint (DOM)', () => {
  function render(response: any) {
    TestBed.configureTestingModule({
      imports: [Guest],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: PartyService, useValue: { currentPartyId: 'party-1' } },
        { provide: TrackService, useValue: { searchTracks: () => of(response) } },
        { provide: SpotifyWebPlayerService, useValue: { addToPlaylist: () => of({}) } },
        { provide: QueueStateService, useValue: { inQueueUris$: new BehaviorSubject<Set<string>>(new Set()), refresh: () => {} } },
      ],
    });
    return TestBed.createComponent(Guest);
  }

  async function searchAndRender(fixture: any, term: string) {
    await fixture.componentInstance.search(term);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('.search-status').textContent as string;
  }

  it('replaces "Keine Treffer" with the artist hint when every result was hidden', async () => {
    const fixture = render({ tracks: { items: [] }, hiddenHint: 'ARTIST' });
    fixture.detectChanges();

    const status = await searchAndRender(fixture, 'Drake');

    expect(status).toContain('Dieser Artist ist nicht zulässig.');
    expect(status).not.toContain('Keine Treffer');
    fixture.destroy();
  });

  it('shows the general hint next to the remaining results', async () => {
    const fixture = render({
      tracks: { items: [{ id: 't2', uri: 'spotify:track:t2', name: 'Other', artists: [{ name: 'B' }], blocked: false }] },
      hiddenHint: 'SOME',
    });
    fixture.detectChanges();

    const status = await searchAndRender(fixture, 'hotline');

    expect(status).toContain('Einige Ergebnisse sind auf dieser Party nicht zulässig.');
    expect(fixture.nativeElement.querySelectorAll('.track-card').length).toBe(1);
    fixture.destroy();
  });

  it('shows the general hint above a greyed-out result', async () => {
    const fixture = render({
      tracks: { items: [{ id: 't1', uri: 'spotify:track:t1', name: 'Song X (Live)', artists: [{ name: 'A' }], blocked: true }] },
      hiddenHint: null,
    });
    fixture.detectChanges();

    const status = await searchAndRender(fixture, 'song x');

    expect(status).toContain('Einige Ergebnisse sind auf dieser Party nicht zulässig.');
    const card: HTMLElement = fixture.nativeElement.querySelector('.track-card');
    expect(card.classList).toContain('blocked');
    expect(card.textContent).not.toContain('nicht zulässig');
    fixture.destroy();
  });

  it('still shows "Keine Treffer" when nothing was hidden', async () => {
    const fixture = render({ tracks: { items: [] }, hiddenHint: null });
    fixture.detectChanges();

    const status = await searchAndRender(fixture, 'xyz');

    expect(status).toContain('Keine Treffer für „xyz“');
    expect(status).not.toContain('nicht zulässig');
    fixture.destroy();
  });
});

// Feedback states of the real template (guest spec "Guest Search and Add Give Feedback").
describe('Guest feedback (DOM)', () => {
  let addResult: () => any;

  function setup() {
    TestBed.configureTestingModule({
      imports: [Guest],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: PartyService, useValue: { currentPartyId: 'party-1', clearParty: () => {} } },
        { provide: TrackService, useValue: { searchTracks: () => of({}) } },
        { provide: SpotifyWebPlayerService, useValue: { addToPlaylist: () => addResult() } },
        { provide: QueueStateService, useValue: { inQueueUris$: new BehaviorSubject<Set<string>>(new Set()), refresh: () => {} } },
      ],
    });
    const fixture = TestBed.createComponent(Guest);
    fixture.detectChanges();
    return fixture;
  }

  const songX = { id: 't1', uri: 'spotify:track:t1', name: 'Song X', artists: [{ name: 'A' }], album: { images: [] } };

  it('shows "Keine Treffer für „…“" after an empty search', () => {
    const fixture = setup();
    fixture.componentInstance.lastSearchedTerm.set('xyzxyzxyz');
    fixture.componentInstance.tracks.set([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.search-status').textContent).toContain('Keine Treffer für „xyzxyzxyz“');
    fixture.destroy();
  });

  it('shows the connection message when the search failed', () => {
    const fixture = setup();
    fixture.componentInstance.searchFailed.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Verbindung verloren – versuch es gleich nochmal.');
    fixture.destroy();
  });

  it('confirms a successful add with "Song hinzugefügt"', async () => {
    addResult = () => of({});
    const fixture = setup();
    fixture.componentInstance.tracks.set([songX]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.add-button') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mv-toast [aria-live="polite"]').textContent).toContain('Song hinzugefügt');
    fixture.destroy();
  });

  it('announces a backend rejection in the alert region', async () => {
    addResult = () => throwError(() => ({ error: { error: 'Song ist schon in der Warteschlange.' } }));
    spyOn(console, 'error');
    const fixture = setup();
    fixture.componentInstance.tracks.set([songX]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.add-button') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mv-toast [role="alert"]').textContent).toContain('Song ist schon in der Warteschlange.');
    fixture.destroy();
  });

  it('labels add buttons and gives blocked results "Nicht verfügbar" without a reason', () => {
    const fixture = setup();
    fixture.componentInstance.tracks.set([{ ...songX, blocked: true }, { ...songX, id: 't2', uri: 'spotify:track:t2' }]);
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.add-button'));
    expect(buttons[0].getAttribute('aria-label')).toBe('Nicht verfügbar');
    expect(buttons[0].getAttribute('title')).toBe('Nicht verfügbar');
    expect(buttons[1].getAttribute('aria-label')).toBe('Song hinzufügen');
    expect(fixture.nativeElement.textContent).not.toContain('Nicht erlaubt.');
    fixture.destroy();
  });

  it('shows the goodbye screen when the party ends', () => {
    const fixture = setup();
    fixture.componentInstance.partyEnded.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mv-party-ended').textContent).toContain('Die Party ist beendet.');
    fixture.destroy();
  });
});
