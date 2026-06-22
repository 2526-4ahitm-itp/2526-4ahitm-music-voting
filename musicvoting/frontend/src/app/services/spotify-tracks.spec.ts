import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TrackService } from './spotify-tracks';
import { PartyService } from './party.service';

describe('TrackService', () => {
  let service: TrackService;
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
    service = TestBed.inject(TrackService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('searchTracks requests the search endpoint with an encoded query', () => {
    partyService.currentPartyId = 'party-1';

    service.searchTracks('a b').subscribe();

    const req = httpMock.expectOne('/api/party/party-1/track/search?q=a%20b');
    expect(req.request.method).toBe('GET');
    req.flush({ tracks: [] });
  });

  it('searchTracks returns EMPTY when there is no active party', (done) => {
    spyOn(console, 'warn');

    service.searchTracks('x').subscribe({
      complete: () => done(),
    });

    httpMock.expectNone('/api/party/null/track/search?q=x');
    expect(console.warn).toHaveBeenCalled();
  });

  it('startParty posts to the next-track endpoint', () => {
    partyService.currentPartyId = 'party-2';

    service.startParty().subscribe();

    const req = httpMock.expectOne('/api/party/party-2/track/next');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('startParty returns EMPTY when there is no active party', (done) => {
    spyOn(console, 'warn');

    service.startParty().subscribe({
      complete: () => done(),
    });

    httpMock.expectNone('/api/party/null/track/next');
    expect(console.warn).toHaveBeenCalled();
  });
});
