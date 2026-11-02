import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SelectBlacklist } from './select-blacklist';

// These tests assert on the rendered DOM, not only on component fields: the app is zoneless,
// so a missing detectChanges() after an await would leave the view stale.
describe('SelectBlacklist', () => {
  let httpMock: HttpTestingController;
  let router: { navigate: jasmine.Spy };

  async function createLoaded(entries: any[] = []) {
    const fixture = TestBed.createComponent(SelectBlacklist);
    fixture.detectChanges(); // ngOnInit
    httpMock.expectOne('/api/party/party-x/blacklist').flush(entries);
    await fixture.whenStable();
    return fixture;
  }

  function text(fixture: any): string {
    return fixture.nativeElement.textContent;
  }

  function click(fixture: any, selector: string) {
    (fixture.nativeElement.querySelector(selector) as HTMLElement).click();
  }

  beforeEach(() => {
    localStorage.clear();
    router = { navigate: jasmine.createSpy('navigate') };
    TestBed.configureTestingModule({
      imports: [SelectBlacklist],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => 'party-x' } } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('loads and renders the existing entries', async () => {
    const fixture = await createLoaded([
      { id: 'e1', kind: 'WORD', value: 'live', label: 'live', imageUrl: null },
      { id: 'e2', kind: 'ARTIST', value: 'a1', label: 'ABBA', imageUrl: null },
    ]);

    expect(text(fixture)).toContain('Blacklist festlegen');
    expect(text(fixture)).toContain('live');
    expect(text(fixture)).toContain('ABBA');
    expect(text(fixture)).not.toContain('Blacklist wird geladen');
    expect(fixture.nativeElement.querySelectorAll('.entry').length).toBe(2);
  });

  it('shows an empty hint when nothing is blocked yet', async () => {
    const fixture = await createLoaded([]);

    expect(text(fixture)).toContain('Noch nichts gesperrt.');
  });

  it('adds a word and clears the input', async () => {
    const fixture = await createLoaded([]);
    const comp = fixture.componentInstance;

    comp.wordInput = 'Live';
    const done = comp.addWord();
    const req = httpMock.expectOne('/api/party/party-x/blacklist');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ kind: 'WORD', value: 'Live' });
    req.flush({ id: 'e1', kind: 'WORD', value: 'live', label: 'live', imageUrl: null });
    await done;
    await fixture.whenStable();

    expect(comp.wordInput).toBe('');
    const entries = fixture.nativeElement.querySelectorAll('.entry');
    expect(entries.length).toBe(1);
    expect(entries[0].textContent).toContain('Wort');
    expect(entries[0].textContent).toContain('live');
  });

  it('removes an entry', async () => {
    const fixture = await createLoaded([{ id: 'e1', kind: 'WORD', value: 'live', label: 'live', imageUrl: null }]);

    click(fixture, '.remove-btn');
    const req = httpMock.expectOne('/api/party/party-x/blacklist/e1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('.entry').length).toBe(0);
    expect(text(fixture)).toContain('Noch nichts gesperrt.');
  });

  it('artist search result becomes an ARTIST entry', async () => {
    const fixture = await createLoaded([]);
    const comp = fixture.componentInstance;

    comp.searchQuery = 'abba';
    const searching = comp.search();
    httpMock.expectOne('/api/party/party-x/blacklist/artists?q=abba')
      .flush([{ id: 'a1', name: 'ABBA', imageUrl: 'http://img/a' }]);
    await searching;
    await fixture.whenStable();
    expect(text(fixture)).toContain('ABBA');

    click(fixture, '.artist-result');
    const req = httpMock.expectOne('/api/party/party-x/blacklist');
    expect(req.request.body).toEqual({ kind: 'ARTIST', value: 'a1', label: 'ABBA', imageUrl: 'http://img/a' });
    req.flush({ id: 'e2', kind: 'ARTIST', value: 'a1', label: 'ABBA', imageUrl: 'http://img/a' });
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.entry[data-kind="ARTIST"]').textContent).toContain('ABBA');
    expect((fixture.nativeElement.querySelector('.artist-result') as HTMLButtonElement).disabled).toBe(true);
  });

  it('song search result becomes a TRACK entry', async () => {
    const fixture = await createLoaded([]);
    const comp = fixture.componentInstance;

    comp.selectTab('songs');
    comp.searchQuery = 'dancing';
    const searching = comp.search();
    httpMock.expectOne('/api/party/party-x/track/search?q=dancing').flush({
      tracks: {
        items: [
          null,
          { uri: 'spotify:track:t1', name: 'Dancing Queen', artists: [{ name: 'ABBA' }], album: { images: [{ url: 'http://img/t' }] } },
        ],
      },
    });
    await searching;
    await fixture.whenStable();
    expect(text(fixture)).toContain('Dancing Queen');

    click(fixture, '.song-result');
    const req = httpMock.expectOne('/api/party/party-x/blacklist');
    expect(req.request.body).toEqual({
      kind: 'TRACK', value: 'spotify:track:t1', label: 'Dancing Queen – ABBA', imageUrl: 'http://img/t',
    });
    req.flush({ id: 'e3', kind: 'TRACK', value: 'spotify:track:t1', label: 'Dancing Queen – ABBA', imageUrl: 'http://img/t' });
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.entry[data-kind="TRACK"]').textContent).toContain('Dancing Queen – ABBA');
  });

  it('"Weiter" navigates to the dashboard', async () => {
    const fixture = await createLoaded([]);

    click(fixture, '.continue-btn');

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], { queryParams: { partyId: 'party-x' } });
  });

  it('"Ohne Blacklist fortfahren" navigates to the dashboard without saving anything', async () => {
    const fixture = await createLoaded([]);

    click(fixture, '.skip-btn');

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], { queryParams: { partyId: 'party-x' } });
    httpMock.expectNone('/api/party/party-x/blacklist');
  });
});
