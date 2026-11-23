import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
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

  const artistUrl = (q: string) => `/api/party/party-x/blacklist/artists?q=${q}`;
  const songUrl = (q: string) => `/api/party/party-x/track/search?q=${q}`;

  /** One search fires both requests (artists and songs) in parallel; answer both. */
  function flushSearch(q: string, artists: any[] = [], songItems: any[] = []) {
    httpMock.expectOne(artistUrl(q)).flush(artists);
    httpMock.expectOne(songUrl(q)).flush({ tracks: { items: songItems } });
  }

  /** Types into the field and runs the search right away (the debounce is tested separately). */
  async function typeAndSearch(fixture: any, q: string, artists: any[] = [], songItems: any[] = []) {
    const comp = fixture.componentInstance as SelectBlacklist;
    // Set the field directly: onSearchQueryChange would also arm the real-time debounce.
    comp.searchQuery = q;
    const searching = comp.search();
    flushSearch(q, artists, songItems);
    await searching;
    await fixture.whenStable();
  }

  const song = (n: number) => ({
    uri: `spotify:track:t${n}`, name: `Song ${n}`, artists: [{ name: 'ABBA' }], album: { images: [] },
  });

  beforeEach(() => {
    localStorage.clear();
    router = { navigate: jasmine.createSpy('navigate') };
    TestBed.configureTestingModule({
      imports: [SelectBlacklist],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withXhr()),
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

    expect(text(fixture)).toContain('Blocklist festlegen');
    expect(text(fixture)).toContain('live');
    expect(text(fixture)).toContain('ABBA');
    expect(text(fixture)).not.toContain('Blocklist wird geladen');
    expect(fixture.nativeElement.querySelectorAll('.entry').length).toBe(2);
  });

  it('shows an empty hint when nothing is blocked yet', async () => {
    const fixture = await createLoaded([]);

    expect(text(fixture)).toContain('Noch nichts gesperrt.');
  });

  it('Enter in the search field blocks the input as a word and empties the field', async () => {
    const fixture = await createLoaded([]);
    const comp = fixture.componentInstance;

    comp.searchQuery = 'Live';
    fixture.nativeElement.querySelector('form.search-form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    const req = httpMock.expectOne('/api/party/party-x/blacklist');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ kind: 'WORD', value: 'Live' });
    req.flush({ id: 'e1', kind: 'WORD', value: 'live', label: 'live', imageUrl: null });
    await fixture.whenStable();

    expect(comp.searchQuery).toBe('');
    expect(fixture.nativeElement.querySelector('.word-result')).toBeNull();
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

  it('shows one search field and no tabs', async () => {
    const fixture = await createLoaded([]);
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelectorAll('input[type="search"]').length).toBe(1);
    expect((root.querySelector('input[name="query"]') as HTMLInputElement).placeholder).toBe('Wort, Künstler oder Song');
    expect(root.querySelector('[role="tablist"]')).toBeNull();
    expect(root.querySelector('input[name="word"]')).toBeNull();
  });

  it('lists the word row first, then artists, then songs', async () => {
    const fixture = await createLoaded([]);

    await typeAndSearch(fixture, 'abba', [{ id: 'a1', name: 'ABBA', imageUrl: null }], [song(1)]);

    const rows = Array.from(fixture.nativeElement.querySelectorAll('.results > *')) as HTMLElement[];
    expect(rows.map((r) => r.className.match(/word-result|artist-result|song-result|result-group/)?.[0]))
      .toEqual(['word-result', 'result-group', 'artist-result', 'result-group', 'song-result']);
    expect(rows[0].textContent).toContain('Wort „abba“ sperren');
    expect(rows[1].textContent?.trim()).toBe('Künstler');
    expect(rows[3].textContent?.trim()).toBe('Songs');
  });

  it('shows at most 3 artists and 5 songs', async () => {
    const fixture = await createLoaded([]);
    const artists = [1, 2, 3, 4, 5].map((n) => ({ id: `a${n}`, name: `Artist ${n}`, imageUrl: null }));

    await typeAndSearch(fixture, 'a', artists, [1, 2, 3, 4, 5, 6, 7].map(song));

    expect(fixture.nativeElement.querySelectorAll('.artist-result').length).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('.song-result').length).toBe(5);
  });

  it('clicking the word row blocks the word', async () => {
    const fixture = await createLoaded([]);
    await typeAndSearch(fixture, 'remix');

    click(fixture, '.word-result');
    const req = httpMock.expectOne('/api/party/party-x/blacklist');
    expect(req.request.body).toEqual({ kind: 'WORD', value: 'remix' });
    req.flush({ id: 'e1', kind: 'WORD', value: 'remix', label: 'remix', imageUrl: null });
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.entry[data-kind="WORD"]').textContent).toContain('remix');
  });

  it('marks the word row as blocked when the word is already on the list', async () => {
    const fixture = await createLoaded([{ id: 'e1', kind: 'WORD', value: 'live', label: 'live', imageUrl: null }]);

    await typeAndSearch(fixture, 'Live');

    const row = fixture.nativeElement.querySelector('.word-result') as HTMLButtonElement;
    expect(row.disabled).toBe(true);
    expect(row.textContent).toContain('Wort „Live“ ist gesperrt');
  });

  it('still shows songs when the artist search fails', async () => {
    const fixture = await createLoaded([]);
    const comp = fixture.componentInstance;

    comp.searchQuery = 'abba';
    const searching = comp.search();
    httpMock.expectOne(artistUrl('abba')).flush('boom', { status: 502, statusText: 'Bad Gateway' });
    httpMock.expectOne(songUrl('abba')).flush({ tracks: { items: [song(1)] } });
    await searching;
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('.song-result').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.artist-result').length).toBe(0);
    expect(comp.error).toBeNull();
  });

  it('shows an error only when both searches fail', async () => {
    const fixture = await createLoaded([]);
    const comp = fixture.componentInstance;

    comp.searchQuery = 'abba';
    const searching = comp.search();
    httpMock.expectOne(artistUrl('abba')).flush('boom', { status: 502, statusText: 'Bad Gateway' });
    httpMock.expectOne(songUrl('abba')).flush('boom', { status: 502, statusText: 'Bad Gateway' });
    await searching;
    await fixture.whenStable();

    expect(text(fixture)).toContain('Suche fehlgeschlagen. Bitte erneut versuchen.');
    // The word row needs no request, so it stays usable.
    expect(fixture.nativeElement.querySelector('.word-result')).toBeTruthy();
  });

  it('artist search result becomes an ARTIST entry', async () => {
    const fixture = await createLoaded([]);

    await typeAndSearch(fixture, 'abba', [{ id: 'a1', name: 'ABBA', imageUrl: 'http://img/a' }]);
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

    await typeAndSearch(fixture, 'dancing', [], [
      null,
      { uri: 'spotify:track:t1', name: 'Dancing Queen', artists: [{ name: 'ABBA' }], album: { images: [{ url: 'http://img/t' }] } },
    ]);
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

  // Live search: jasmine.clock() drives the debounce, so no real waiting is needed. mockDate()
  // is required because rxjs debounceTime measures elapsed time with Date.now().
  describe('search while typing', () => {
    beforeEach(() => {
      jasmine.clock().install();
      jasmine.clock().mockDate();
    });
    afterEach(() => jasmine.clock().uninstall());

    it('has no "Suchen" button — typing alone starts the search', async () => {
      const fixture = await createLoaded([]);

      expect(fixture.nativeElement.querySelector('.search-btn')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Suchen');
    });

    it('shows no "Suche läuft…" while a search is pending', async () => {
      const fixture = await createLoaded([]);

      fixture.componentInstance.onSearchQueryChange('abba');
      jasmine.clock().tick(SelectBlacklist.SEARCH_DEBOUNCE_MS);
      await fixture.whenStable();

      expect(fixture.nativeElement.textContent).not.toContain('Suche läuft');
      flushSearch('abba');
    });

    it('searches after the debounce without pressing a button', async () => {
      const fixture = await createLoaded([]);
      const comp = fixture.componentInstance;

      comp.onSearchQueryChange('a');
      jasmine.clock().tick(SelectBlacklist.SEARCH_DEBOUNCE_MS - 1);
      httpMock.expectNone(artistUrl('a'));
      httpMock.expectNone(songUrl('a'));

      jasmine.clock().tick(1);
      flushSearch('a', [{ id: 'a1', name: 'ABBA', imageUrl: null }], [song(1)]);
      await fixture.whenStable();

      expect(fixture.nativeElement.querySelector('.word-result').textContent).toContain('Wort „a“ sperren');
      expect(fixture.nativeElement.querySelector('.song-result').textContent).toContain('Song 1');

      expect(fixture.nativeElement.querySelector('.artist-result').textContent).toContain('ABBA');
    });

    it('sends only one request for several quick key presses', async () => {
      const fixture = await createLoaded([]);
      const comp = fixture.componentInstance;

      comp.onSearchQueryChange('a');
      jasmine.clock().tick(100);
      comp.onSearchQueryChange('ab');
      jasmine.clock().tick(100);
      comp.onSearchQueryChange('abb');
      jasmine.clock().tick(SelectBlacklist.SEARCH_DEBOUNCE_MS);

      flushSearch('abb');
      httpMock.expectNone(artistUrl('a'));
      httpMock.expectNone(artistUrl('ab'));
      httpMock.expectNone(songUrl('a'));
      httpMock.expectNone(songUrl('ab'));
      // Exactly the one pair of requests for the final text, nothing else is outstanding.
      expect(httpMock.match(() => true).length).toBe(0);
    });

    it('clears the results when the field is emptied, without a request', async () => {
      const fixture = await createLoaded([]);
      const comp = fixture.componentInstance;
      comp.onSearchQueryChange('abba');
      jasmine.clock().tick(SelectBlacklist.SEARCH_DEBOUNCE_MS);
      flushSearch('abba', [{ id: 'a1', name: 'ABBA', imageUrl: null }], [song(1)]);
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelectorAll('.artist-result').length).toBe(1);

      comp.onSearchQueryChange('');
      jasmine.clock().tick(SelectBlacklist.SEARCH_DEBOUNCE_MS);
      await fixture.whenStable();

      expect(comp.artistResults).toEqual([]);
      expect(comp.songResults).toEqual([]);
      expect(fixture.nativeElement.querySelector('.results')).toBeNull();
    });

    it('ignores a slower answer to an older query', async () => {
      const fixture = await createLoaded([]);
      const comp = fixture.componentInstance;

      comp.onSearchQueryChange('ab');
      jasmine.clock().tick(SelectBlacklist.SEARCH_DEBOUNCE_MS);
      const older = httpMock.expectOne(artistUrl('ab'));
      const olderSongs = httpMock.expectOne(songUrl('ab'));
      comp.onSearchQueryChange('abba');
      jasmine.clock().tick(SelectBlacklist.SEARCH_DEBOUNCE_MS);

      flushSearch('abba', [{ id: 'a1', name: 'ABBA', imageUrl: null }]);
      await fixture.whenStable();
      older.flush([{ id: 'a2', name: 'Abbott', imageUrl: null }]);
      olderSongs.flush({ tracks: { items: [] } });
      await fixture.whenStable();

      expect(comp.artistResults.map(a => a.name)).toEqual(['ABBA']);
    });
  });

  it('shows only the short subtitle', async () => {
    const fixture = await createLoaded([]);

    expect(fixture.nativeElement.querySelector('.subtitle').textContent.trim())
      .toBe('Gesperrte Wörter, Künstler und Songs können Gäste nicht hinzufügen.');
  });

  it('"Weiter" is disabled while nothing is blocked', async () => {
    const fixture = await createLoaded([]);

    const continueBtn = fixture.nativeElement.querySelector('.continue-btn') as HTMLButtonElement;
    expect(continueBtn.disabled).toBe(true);
    continueBtn.click();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('"Weiter" becomes enabled after adding a word and is disabled again after removing it', async () => {
    const fixture = await createLoaded([]);
    const continueBtn = () => fixture.nativeElement.querySelector('.continue-btn') as HTMLButtonElement;

    fixture.componentInstance.searchQuery = 'live';
    const adding = fixture.componentInstance.addWord();
    httpMock.expectOne('/api/party/party-x/blacklist')
      .flush({ id: 'e1', kind: 'WORD', value: 'live', label: 'live', imageUrl: null });
    await adding;
    await fixture.whenStable();
    expect(continueBtn().disabled).toBe(false);

    click(fixture, '.remove-btn');
    httpMock.expectOne('/api/party/party-x/blacklist/e1').flush(null);
    await fixture.whenStable();
    expect(continueBtn().disabled).toBe(true);
  });

  it('"Weiter" navigates to the go-live step when entries exist', async () => {
    const fixture = await createLoaded([
      { id: 'e1', kind: 'WORD', value: 'live', label: 'live', imageUrl: null },
    ]);

    click(fixture, '.continue-btn');

    expect(router.navigate).toHaveBeenCalledWith(['/party-ready'], { queryParams: { partyId: 'party-x' } });
  });

  it('"Ohne Blocklist fortfahren" navigates to the go-live step without saving anything', async () => {
    const fixture = await createLoaded([]);

    click(fixture, '.skip-btn');

    expect(router.navigate).toHaveBeenCalledWith(['/party-ready'], { queryParams: { partyId: 'party-x' } });
    httpMock.expectNone('/api/party/party-x/blacklist');
  });
});
