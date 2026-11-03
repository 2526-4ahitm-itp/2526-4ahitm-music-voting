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
});
