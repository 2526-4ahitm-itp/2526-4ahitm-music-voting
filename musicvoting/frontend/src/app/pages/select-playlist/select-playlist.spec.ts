import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SelectPlaylist } from './select-playlist';

describe('SelectPlaylist', () => {
  let httpMock: HttpTestingController;
  let router: { navigate: jasmine.Spy };
  let queryParam: string | null;

  function createComponent() {
    const fixture = TestBed.createComponent(SelectPlaylist);
    fixture.detectChanges(); // triggers ngOnInit
    return fixture;
  }

  beforeEach(() => {
    localStorage.clear();
    queryParam = 'party-x';
    router = { navigate: jasmine.createSpy('navigate') };
    TestBed.configureTestingModule({
      imports: [SelectPlaylist],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => queryParam } } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('loads the host playlists on init', async () => {
    const fixture = createComponent();

    httpMock.expectOne('/api/party/party-x/spotify/playlists')
      .flush({ playlists: [{ id: 'pl-1', name: 'My List', trackCount: 2, imageUrl: null }] });
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    expect(comp.isLoading).toBe(false);
    expect(comp.playlists.length).toBe(1);
    expect(comp.playlists[0].id).toBe('pl-1');

    // Assert the loaded list actually renders — guards the zoneless change-detection path.
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('My List');
    expect(text).not.toContain('Playlists werden geladen');
  });

  it('choose() stores the playlist and navigates to the dashboard', async () => {
    const fixture = createComponent();
    httpMock.expectOne('/api/party/party-x/spotify/playlists')
      .flush({ playlists: [{ id: 'pl-1', name: 'My List', trackCount: 2, imageUrl: null }] });
    await fixture.whenStable();

    fixture.componentInstance.choose({ id: 'pl-1', name: 'My List', trackCount: 2, imageUrl: null });

    const putReq = httpMock.expectOne('/api/party/party-x/default-playlist');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({ playlistId: 'pl-1' });
    putReq.flush({ defaultPlaylistId: 'pl-1' });
    await fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], { queryParams: { partyId: 'party-x' } });
  });

  it('skip() navigates to the dashboard without setting a default playlist', async () => {
    const fixture = createComponent();
    httpMock.expectOne('/api/party/party-x/spotify/playlists').flush({ playlists: [] });
    await fixture.whenStable();

    fixture.componentInstance.skip();

    httpMock.expectNone('/api/party/party-x/default-playlist');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], { queryParams: { partyId: 'party-x' } });
  });

  it('redirects home when no partyId is available', async () => {
    queryParam = null;
    const fixture = createComponent();
    await fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
    httpMock.expectNone('/api/party/party-x/spotify/playlists');
  });
});
