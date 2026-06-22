import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { hostAuthInterceptor } from './host-auth.interceptor';

describe('hostAuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([hostAuthInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('adds an Authorization header when a host pin is stored', () => {
    localStorage.setItem('mv_party_host_pin', 'abc123');

    http.get('/api/party/p1').subscribe();

    const req = httpMock.expectOne('/api/party/p1');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc123');
    req.flush({});
  });

  it('does not add an Authorization header when no host pin is stored', () => {
    http.get('/api/party/p1').subscribe();

    const req = httpMock.expectOne('/api/party/p1');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
