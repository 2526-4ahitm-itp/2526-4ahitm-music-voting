import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { PartyService } from './party.service';

describe('PartyService', () => {
  let service: PartyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    service = TestBed.inject(PartyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('createParty stores id, pin and hostPin in subjects and localStorage', () => {
    let result: any;
    service.createParty('spotify').subscribe(res => result = res);

    const req = httpMock.expectOne('/api/party');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ provider: 'spotify' });
    req.flush({ id: 'party-1', pin: '11111', hostPin: '99999', joinUrl: 'http://x/join/11111' });

    expect(result.id).toBe('party-1');
    expect(service.currentPartyId).toBe('party-1');
    expect(service.currentPin).toBe('11111');
    expect(service.currentHostPin).toBe('99999');
    expect(localStorage.getItem('mv_party_id')).toBe('party-1');
    expect(localStorage.getItem('mv_party_pin')).toBe('11111');
    expect(localStorage.getItem('mv_party_host_pin')).toBe('99999');
  });

  it('resolvePin sets partyId and pin but not hostPin', () => {
    service.resolvePin('22222').subscribe();

    const req = httpMock.expectOne('/api/party/join/22222');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'party-2' });

    expect(service.currentPartyId).toBe('party-2');
    expect(service.currentPin).toBe('22222');
    expect(localStorage.getItem('mv_party_id')).toBe('party-2');
    expect(localStorage.getItem('mv_party_pin')).toBe('22222');
  });

  it('resolveHostPin sets partyId, guestPin and hostPin', () => {
    service.resolveHostPin('88888').subscribe();

    const req = httpMock.expectOne('/api/party/host-join/88888');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'party-3', guestPin: '33333' });

    expect(service.currentPartyId).toBe('party-3');
    expect(service.currentPin).toBe('33333');
    expect(service.currentHostPin).toBe('88888');
    expect(localStorage.getItem('mv_party_host_pin')).toBe('88888');
  });

  it('getParty updates pin and only updates hostPin when present', () => {
    service.getParty('party-4').subscribe();

    const req = httpMock.expectOne('/api/party/party-4');
    req.flush({ id: 'party-4', pin: '44444' });

    expect(service.currentPin).toBe('44444');
    expect(service.currentHostPin).toBeNull();
    expect(localStorage.getItem('mv_party_host_pin')).toBeNull();
  });

  it('endParty clears all party state on success', () => {
    service.setCurrentPartyId('party-5');
    localStorage.setItem('mv_party_pin', '55555');
    localStorage.setItem('mv_party_host_pin', '77777');

    service.endParty('party-5').subscribe();

    const req = httpMock.expectOne('/api/party/party-5');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(service.currentPartyId).toBeNull();
    expect(service.currentPin).toBeNull();
    expect(service.currentHostPin).toBeNull();
    expect(localStorage.getItem('mv_party_id')).toBeNull();
    expect(localStorage.getItem('mv_party_pin')).toBeNull();
    expect(localStorage.getItem('mv_party_host_pin')).toBeNull();
  });

  it('clearParty resets subjects and storage directly', () => {
    service.setCurrentPartyId('party-6');
    service.clearParty();

    expect(service.currentPartyId).toBeNull();
    expect(localStorage.getItem('mv_party_id')).toBeNull();
  });
});
