import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { SelectBlacklist } from './select-blacklist';

/**
 * Edit mode of the blacklist page (?mode=edit), opened from the host
 * navigation during the party (host spec "Host Manages Party Blacklist",
 * scenario "Host edits the full blacklist during the party").
 */
describe('SelectBlacklist edit mode (DOM)', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    const params: Record<string, string> = { partyId: 'party-x', mode: 'edit' };
    TestBed.configureTestingModule({
      imports: [SelectBlacklist],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: (k: string) => params[k] ?? null } } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  async function createLoaded(entries: any[]) {
    const fixture = TestBed.createComponent(SelectBlacklist);
    fixture.detectChanges();
    httpMock.expectOne('/api/party/party-x/blacklist').flush(entries);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('shows the host navigation with Blacklist as the current page', async () => {
    const fixture = await createLoaded([]);

    expect(fixture.nativeElement.querySelector('mv-host-menu [aria-current="page"]')?.textContent?.trim()).toBe('Blacklist');
    expect(fixture.nativeElement.querySelector('.host-stage')).toBeTruthy();
  });

  it('shows a single "Fertig" instead of "Weiter" and "Ohne Blacklist fortfahren"', async () => {
    const fixture = await createLoaded([{ id: 'e1', kind: 'WORD', value: 'live', label: 'live', imageUrl: null }]);

    expect(fixture.nativeElement.querySelector('.continue-btn')).toBeNull();
    expect(fixture.nativeElement.querySelector('.skip-btn')).toBeNull();
    expect(fixture.nativeElement.querySelector('.done-btn')?.textContent?.trim()).toBe('Fertig');
  });

  it('"Fertig" returns to the dashboard', async () => {
    const fixture = await createLoaded([]);
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    (fixture.nativeElement.querySelector('.done-btn') as HTMLButtonElement).click();

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], { queryParams: { partyId: 'party-x' } });
  });

  it('keeps the full editing: word form, artist and song tabs, and labelled remove buttons', async () => {
    const fixture = await createLoaded([{ id: 'e1', kind: 'WORD', value: 'live', label: 'live', imageUrl: null }]);
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelector('input[name="word"]')).toBeTruthy();
    expect(Array.from(root.querySelectorAll('.tab')).map((t) => t.textContent?.trim())).toEqual(['Künstler', 'Songs']);
    expect(root.querySelector('.remove-btn')?.getAttribute('aria-label')).toBe('live entfernen');
  });

  it('loads the existing entries and saves adds and removes right away', async () => {
    const fixture = await createLoaded([{ id: 'e1', kind: 'ARTIST', value: 'a1', label: 'ABBA', imageUrl: null }]);
    const comp = fixture.componentInstance;
    const entries = () => fixture.nativeElement.querySelectorAll('.entry');

    // The entries from setup are there when the host opens the page mid-party.
    expect(entries().length).toBe(1);
    expect(entries()[0].textContent).toContain('ABBA');

    // Adding saves immediately: there is no separate save button in edit mode.
    comp.wordInput = 'explicit';
    const adding = comp.addWord();
    const post = httpMock.expectOne('/api/party/party-x/blacklist');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ kind: 'WORD', value: 'explicit' });
    post.flush({ id: 'e2', kind: 'WORD', value: 'explicit', label: 'explicit', imageUrl: null });
    await adding;
    await fixture.whenStable();
    fixture.detectChanges();
    expect(entries().length).toBe(2);

    // Removing the artist from setup also saves immediately.
    (fixture.nativeElement.querySelector('.remove-btn[aria-label="ABBA entfernen"]') as HTMLButtonElement).click();
    const del = httpMock.expectOne('/api/party/party-x/blacklist/e1');
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(entries().length).toBe(1);
    expect(entries()[0].textContent).toContain('explicit');
  });
});
