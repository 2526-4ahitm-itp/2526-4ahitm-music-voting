import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { SpotifyWebPlayerService } from './spotify-player';
import { PartyService } from './party.service';

describe('SpotifyWebPlayerService', () => {
  let service: SpotifyWebPlayerService;
  let httpMock: HttpTestingController;
  let partyService: { currentPartyId: string | null };

  beforeEach(() => {
    partyService = { currentPartyId: null };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PartyService, useValue: partyService },
      ],
    });
    service = TestBed.inject(SpotifyWebPlayerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getQueue requests the queue endpoint for the active party', () => {
    partyService.currentPartyId = 'party-1';

    service.getQueue().subscribe();

    const req = httpMock.expectOne('/api/party/party-1/track/queue');
    expect(req.request.method).toBe('GET');
    req.flush({ queue: [] });
  });

  it('getQueue returns EMPTY when there is no active party', (done) => {
    spyOn(console, 'warn');

    service.getQueue().subscribe({ complete: () => done() });

    httpMock.expectNone('/api/party/null/track/queue');
    expect(console.warn).toHaveBeenCalled();
  });

  it('addToPlaylist posts the uri and emits a queue update', () => {
    partyService.currentPartyId = 'party-1';
    const updates: void[] = [];
    service.getQueueUpdates().subscribe(() => updates.push(undefined));

    service.addToPlaylist('spotify:track:abc').subscribe();

    const req = httpMock.expectOne('/api/party/party-1/track/addToPlaylist');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(['spotify:track:abc']);
    req.flush({ status: 'added' });

    expect(updates.length).toBe(1);
  });

  it('addToPlaylist returns EMPTY when there is no active party', (done) => {
    spyOn(console, 'warn');

    service.addToPlaylist('spotify:track:abc').subscribe({ complete: () => done() });

    httpMock.expectNone('/api/party/null/track/addToPlaylist');
    expect(console.warn).toHaveBeenCalled();
  });

  it('playTrack puts the uri to the play endpoint', () => {
    partyService.currentPartyId = 'party-1';

    service.playTrack('spotify:track:abc');

    const req = httpMock.expectOne('/api/party/party-1/track/play');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ uri: 'spotify:track:abc' });
    req.flush({});
  });

  it('playTrack does nothing when there is no active party', () => {
    spyOn(console, 'warn');

    service.playTrack('spotify:track:abc');

    httpMock.expectNone('/api/party/null/track/play');
    expect(console.warn).toHaveBeenCalled();
  });

  it('login does nothing when there is no active party', () => {
    spyOn(console, 'warn');

    service.login();

    expect(console.warn).toHaveBeenCalled();
  });

  it('getCurrentState returns null when no player is connected', async () => {
    const result = await service.getCurrentState();

    expect(result).toBeNull();
  });

  it('getCurrentState returns the SDK state when a player is connected', async () => {
    const player = { getCurrentState: jasmine.createSpy('getCurrentState').and.resolveTo({ position: 1000 }) };
    (service as any).player = player;

    const result = await service.getCurrentState();

    expect(result).toEqual({ position: 1000 });
  });

  it('getCurrentState returns null and warns when the SDK call throws', async () => {
    spyOn(console, 'warn');
    const player = { getCurrentState: jasmine.createSpy('getCurrentState').and.rejectWith(new Error('boom')) };
    (service as any).player = player;

    const result = await service.getCurrentState();

    expect(result).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('initPlayer does nothing outside of /startpage', async () => {
    expect(window.location.pathname).not.toContain('/startpage');

    await service.initPlayer(true);

    httpMock.expectNone(() => true);
  });

  it('disconnectPlayer does nothing when no player is connected', async () => {
    await expectAsync(service.disconnectPlayer()).toBeResolved();
  });

  it('disconnectPlayer pauses and disconnects the SDK player', async () => {
    const player = {
      pause: jasmine.createSpy('pause').and.resolveTo(undefined),
      disconnect: jasmine.createSpy('disconnect').and.resolveTo(undefined),
    };
    (service as any).player = player;

    await service.disconnectPlayer();

    expect(player.pause).toHaveBeenCalled();
    expect(player.disconnect).toHaveBeenCalled();
    expect((service as any).player).toBeNull();
  });

  it('getPlayerStatus emits player state changes', () => {
    const states: any[] = [];
    service.getPlayerStatus().subscribe((state) => states.push(state));

    (service as any).playerStateSubject.next({ position: 5000 });

    expect(states).toEqual([{ position: 5000 }]);
  });

  it('getQueueUpdates emits when the queue is updated', () => {
    let updates = 0;
    service.getQueueUpdates().subscribe(() => updates++);

    (service as any).queueUpdatedSubject.next();

    expect(updates).toBe(1);
  });

  it('getQueue with a deviceId appends it as a query param', () => {
    partyService.currentPartyId = 'party-1';

    service.getQueue('my-device').subscribe();

    const req = httpMock.expectOne('/api/party/party-1/track/queue?deviceId=my-device');
    expect(req.request.method).toBe('GET');
    req.flush({ queue: [] });
  });

  it('getQueue without a deviceId uses the plain queue endpoint', () => {
    partyService.currentPartyId = 'party-1';

    service.getQueue().subscribe();

    const req = httpMock.expectOne('/api/party/party-1/track/queue');
    expect(req.request.method).toBe('GET');
    req.flush({ queue: [] });
  });

  it('toggleVote posts uri and deviceId to the vote endpoint', () => {
    partyService.currentPartyId = 'party-1';

    service.toggleVote('spotify:track:abc', 'device-1').subscribe();

    const req = httpMock.expectOne('/api/party/party-1/track/vote');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ uri: 'spotify:track:abc', deviceId: 'device-1' });
    req.flush({ liked: true, likeCount: 1 });
  });

  it('toggleVote returns EMPTY when there is no active party', (done) => {
    spyOn(console, 'warn');

    service.toggleVote('spotify:track:abc', 'device-1').subscribe({ complete: () => done() });

    httpMock.expectNone(() => true);
    expect(console.warn).toHaveBeenCalled();
  });
});
