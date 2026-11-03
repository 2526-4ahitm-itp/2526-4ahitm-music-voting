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
      const pending = httpMock.expectOne('/api/party/party-x/blacklist/artists?q=abba');
      await fixture.whenStable();

      expect(fixture.nativeElement.textContent).not.toContain('Suche läuft');
      pending.flush([]);
    });

    it('searches after the debounce without pressing a button', async () => {
      const fixture = await createLoaded([]);
      const comp = fixture.componentInstance;

      comp.onSearchQueryChange('a');
      jasmine.clock().tick(SelectBlacklist.SEARCH_DEBOUNCE_MS - 1);
      httpMock.expectNone('/api/party/party-x/blacklist/artists?q=a');

      jasmine.clock().tick(1);
      httpMock.expectOne('/api/party/party-x/blacklist/artists?q=a')
        .flush([{ id: 'a1', name: 'ABBA', imageUrl: null }]);
      await fixture.whenStable();

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

      httpMock.expectOne('/api/party/party-x/blacklist/artists?q=abb').flush([]);
      httpMock.expectNone('/api/party/party-x/blacklist/artists?q=a');
      httpMock.expectNone('/api/party/party-x/blacklist/artists?q=ab');
    });

    it('clears the results when the field is emptied, without a request', async () => {
      const fixture = await createLoaded([]);
      const comp = fixture.componentInstance;
      comp.artistResults = [{ id: 'a1', name: 'ABBA', imageUrl: null }];

      comp.onSearchQueryChange('');
      jasmine.clock().tick(SelectBlacklist.SEARCH_DEBOUNCE_MS);
      await fixture.whenStable();

      expect(comp.artistResults).toEqual([]);
      expect(fixture.nativeElement.querySelectorAll('.artist-result').length).toBe(0);
    });

    it('ignores a slower answer to an older query', async () => {
      const fixture = await createLoaded([]);
      const comp = fixture.componentInstance;

      comp.onSearchQueryChange('ab');
      jasmine.clock().tick(SelectBlacklist.SEARCH_DEBOUNCE_MS);
      const older = httpMock.expectOne('/api/party/party-x/blacklist/artists?q=ab');
      comp.onSearchQueryChange('abba');
      jasmine.clock().tick(SelectBlacklist.SEARCH_DEBOUNCE_MS);
      const newer = httpMock.expectOne('/api/party/party-x/blacklist/artists?q=abba');

      newer.flush([{ id: 'a1', name: 'ABBA', imageUrl: null }]);
      await fixture.whenStable();
      older.flush([{ id: 'a2', name: 'Abbott', imageUrl: null }]);
      await fixture.whenStable();

      expect(comp.artistResults.map(a => a.name)).toEqual(['ABBA']);
    });
  });

  it('shows only the short subtitle and the placeholder "Wort"', async () => {
    const fixture = await createLoaded([]);

    expect(fixture.nativeElement.querySelector('.subtitle').textContent.trim())
      .toBe('Gesperrte Wörter, Künstler und Songs können Gäste nicht hinzufügen.');
    expect(fixture.nativeElement.querySelector('input[name="word"]').placeholder).toBe('Wort');
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

    fixture.componentInstance.wordInput = 'live';
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

  it('"Ohne Blacklist fortfahren" navigates to the go-live step without saving anything', async () => {
    const fixture = await createLoaded([]);

    click(fixture, '.skip-btn');

    expect(router.navigate).toHaveBeenCalledWith(['/party-ready'], { queryParams: { partyId: 'party-x' } });
    httpMock.expectNone('/api/party/party-x/blacklist');
  });
});
