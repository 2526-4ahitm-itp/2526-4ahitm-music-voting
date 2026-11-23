import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
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
        provideHttpClient(withXhr()),
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

  it('searchTracks in guest mode asks for the guest view', () => {
    partyService.currentPartyId = 'party-1';

    service.searchTracks('drake', { guest: true }).subscribe();

    const req = httpMock.expectOne('/api/party/party-1/track/search?q=drake&audience=guest');
    expect(req.request.method).toBe('GET');
    req.flush({ tracks: { items: [] }, hiddenHint: null });
  });

  it('searchTracks returns EMPTY when there is no active party', (done) => {
    spyOn(console, 'warn');

    service.searchTracks('x').subscribe({
      complete: () => done(),
    });

    httpMock.expectNone('/api/party/null/track/search?q=x');
    expect(console.warn).toHaveBeenCalled();
  });
});
