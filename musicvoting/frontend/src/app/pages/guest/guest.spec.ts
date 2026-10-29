import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { Guest } from './guest';
import { TrackService } from '../../services/spotify-tracks';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { QueueStateService } from '../../services/queue-state';
import { PartyService } from '../../services/party.service';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

describe('Guest', () => {
  let trackApi: { searchTracks: jasmine.Spy };
  let spotifyService: { addToPlaylist: jasmine.Spy };
  let queueState: { inQueueUris$: BehaviorSubject<Set<string>>; refresh: jasmine.Spy };
  let cdr: { detectChanges: jasmine.Spy };
  let router: { navigate: jasmine.Spy };
  let ngZone: { run: jasmine.Spy };
  let feedback: { show: jasmine.Spy };
  let partyService: { deviceId: string; currentPartyId: string };
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
    feedback = { show: jasmine.createSpy('show') };
    partyService = { deviceId: 'device-1', currentPartyId: 'party-1' };

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    comp = TestBed.runInInjectionContext(
      () => new Guest(trackApi as any, spotifyService as any, queueState as any, cdr as any, router as any, ngZone as any, feedback as any, partyService as any)
    );
  });

  afterEach(() => comp.ngOnDestroy());

  it('search with an empty query loads the top charts and labels them', async () => {
    trackApi.searchTracks.and.returnValue(of({ tracks: { items: [{ id: 'top1', name: 'Hit' }] } }));

    await comp.search('');

    expect(trackApi.searchTracks).toHaveBeenCalledWith('');
    expect(comp.tracks().map(t => t.id)).toEqual(['top1']);
    expect(comp.showingTopCharts()).toBe(true);
    expect(comp.noResults()).toBe(false);
  });

  it('keeps the welcome state when there are no top charts', async () => {
    trackApi.searchTracks.and.returnValue(of({ tracks: { items: [] } }));

    await comp.search('');

    expect(comp.tracks()).toEqual([]);
    expect(comp.showingTopCharts()).toBe(false);
    expect(comp.noResults()).toBe(false);
  });

  it('does not label normal search results as top charts', async () => {
    comp.searchQuery.set('abba');
    trackApi.searchTracks.and.returnValue(of({ tracks: { items: [{ id: 'a', name: 'Dancing Queen' }] } }));

    await comp.search('abba');

    expect(comp.showingTopCharts()).toBe(false);
  });

  it('ignores a late answer from an older search', async () => {
    const slow = new Subject<any>();
    trackApi.searchTracks.and.returnValues(slow, of({ tracks: { items: [{ id: 'new', name: 'Neu' }] } }));

    const first = comp.search('');
    await comp.search('abba');
    slow.next({ tracks: { items: [{ id: 'top', name: 'Alt' }] } });
    slow.complete();
    await first;

    expect(comp.tracks().map(t => t.id)).toEqual(['new']);
    expect(comp.showingTopCharts()).toBe(false);
  });

  it('opens the live event stream with its party id', () => {
    comp.ngOnInit();

    expect((comp as any).eventSource.url).toContain('partyId=party-1');
  });

  it('search sets unique tracks limited to 25 from the response', async () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ id: `t${i % 26}`, name: `Song ${i}` }));
    trackApi.searchTracks.and.returnValue(of({ tracks: { items } }));

    await comp.search('query');

    expect(comp.tracks().length).toBe(25);
    expect(comp.isSearching()).toBe(false);
  });

  it('search logs an error and tells the guest when the request fails', async () => {
    spyOn(console, 'error');
    trackApi.searchTracks.and.returnValue(throwError(() => new Error('boom')));

    await comp.search('query');

    expect(console.error).toHaveBeenCalled();
    expect(comp.isSearching()).toBe(false);
    expect(feedback.show).toHaveBeenCalledWith('Die Suche hat nicht geklappt. Versuch es nochmal.', 'error');
  });

  it('search flags no results when the provider returns no tracks', async () => {
    trackApi.searchTracks.and.returnValue(of({ tracks: { items: [] } }));

    await comp.search('xqzvw');

    expect(comp.tracks()).toEqual([]);
    expect(comp.noResults()).toBe(true);
  });

  it('search clears the no-results flag for a new query', async () => {
    comp.noResults.set(true);
    trackApi.searchTracks.and.returnValue(of({ tracks: { items: [{ id: 'a' }] } }));

    await comp.search('abba');

    expect(comp.noResults()).toBe(false);
  });

  it('addToPlaylist adds the track, refreshes the queue state and confirms it', async () => {
    spotifyService.addToPlaylist.and.returnValue(of({}));
    const track = { id: 't1', uri: 'spotify:track:t1', name: 'Song' };

    const promise = comp.addToPlaylist(track);
    expect(comp.addingTrackId).toBe('t1');

    await promise;

    expect(spotifyService.addToPlaylist).toHaveBeenCalledWith('spotify:track:t1', 'device-1');
    expect(queueState.refresh).toHaveBeenCalled();
    expect(comp.addingTrackId).toBeNull();
    expect(feedback.show).toHaveBeenCalledWith('„Song“ ist in der Warteschlange.');
  });

  it('addToPlaylist shows the duplicate message on 409', async () => {
    spyOn(console, 'error');
    spotifyService.addToPlaylist.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));

    await comp.addToPlaylist({ id: 't1', uri: 'spotify:track:t1', name: 'Song' });

    expect(feedback.show).toHaveBeenCalledWith('Song ist schon in der Warteschlange.', 'error');
    expect(comp.addingTrackId).toBeNull();
  });

  it('addToPlaylist shows the rate-limit message on 429', async () => {
    spyOn(console, 'error');
    spotifyService.addToPlaylist.and.returnValue(throwError(() => new HttpErrorResponse({ status: 429 })));

    await comp.addToPlaylist({ id: 't1', uri: 'spotify:track:t1', name: 'Song' });

    expect(feedback.show).toHaveBeenCalledWith('Zu viele Anfragen — bitte kurz warten.', 'error');
  });

  it('addToPlaylist shows a retry message on other failures', async () => {
    spyOn(console, 'error');
    spotifyService.addToPlaylist.and.returnValue(throwError(() => new Error('boom')));

    await comp.addToPlaylist({ id: 't1', uri: 'spotify:track:t1', name: 'Song' });

    expect(console.error).toHaveBeenCalled();
    expect(feedback.show).toHaveBeenCalledWith('Das hat nicht geklappt. Versuch es nochmal.', 'error');
    expect(comp.addingTrackId).toBeNull();
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

describe('Guest template', () => {
  /** Rendert nur das Template; ngOnInit (SSE-Verbindung) wird übersprungen. */
  async function render() {
    TestBed.configureTestingModule({
      imports: [Guest],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: TrackService, useValue: { searchTracks: () => of({ tracks: { items: [] } }) } },
        { provide: SpotifyWebPlayerService, useValue: {} },
        { provide: QueueStateService, useValue: { inQueueUris$: new BehaviorSubject<Set<string>>(new Set()), refresh: () => {} } },
        { provide: PartyService, useValue: { deviceId: 'device-1', currentPartyId: 'party-1' } },
      ],
    });
    spyOn(Guest.prototype, 'ngOnInit');
    const fixture = TestBed.createComponent(Guest);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('marks the Hinzufügen tab as the current page', async () => {
    const el = await render();
    const active = el.querySelector('.bottom-nav-btn.active')!;

    expect(active.textContent).toContain('Hinzufügen');
    expect(active.getAttribute('aria-current')).toBe('page');
  });

  it('names the search field independently of its placeholder', async () => {
    const el = await render();

    expect(el.querySelector('input[type="search"]')!.getAttribute('aria-label')).toBe('Song oder Künstler suchen');
  });

  it('draws the welcome icon as SVG and hides the submit button without inline styles', async () => {
    const el = await render();
    const submit = el.querySelector('button[type="submit"]')!;

    expect(el.querySelector('.icon-circle svg')).not.toBeNull();
    expect(submit.hasAttribute('hidden')).toBe(true);
    expect(submit.hasAttribute('style')).toBe(false);
  });

  it('uses „Warteschlange“ in the welcome text', async () => {
    const el = await render();

    expect(el.querySelector('.welcome-screen p')!.textContent).toContain('füg ihn zur Warteschlange hinzu');
  });
});
