import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { Guest } from './guest';
import { TrackService } from '../../services/spotify-tracks';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { QueueStateService } from '../../services/queue-state';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

describe('Guest', () => {
  let trackApi: { searchTracks: jasmine.Spy };
  let spotifyService: { addToPlaylist: jasmine.Spy };
  let queueState: { inQueueUris$: BehaviorSubject<Set<string>>; refresh: jasmine.Spy };
  let cdr: { detectChanges: jasmine.Spy };
  let router: { navigate: jasmine.Spy };
  let ngZone: { run: jasmine.Spy };
  let feedback: { show: jasmine.Spy };
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

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    comp = TestBed.runInInjectionContext(
      () => new Guest(trackApi as any, spotifyService as any, queueState as any, cdr as any, router as any, ngZone as any, feedback as any)
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

    expect(spotifyService.addToPlaylist).toHaveBeenCalledWith('spotify:track:t1');
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
