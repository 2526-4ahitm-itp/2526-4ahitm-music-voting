import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { MvGuestParty } from './mv-guest-party';
import { PartyService } from '../services/party.service';

/**
 * "Party 12345" and "Party verlassen" in the guest top bar
 * (guest spec "Guest Sees Which Party They Are In").
 */
describe('MvGuestParty', () => {
  let party: PartyService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [MvGuestParty],
      providers: [provideZonelessChangeDetection(), provideHttpClient(withXhr()), provideRouter([]), { provide: PLATFORM_ID, useValue: 'browser' }],
    }).compileComponents();
    party = TestBed.inject(PartyService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    // A guest who joined party 47291 (what resolvePin stores).
    party.setCurrentPartyId('party-1');
    party.pin$.next('47291');
  });

  afterEach(() => localStorage.clear());

  async function create() {
    const fixture = TestBed.createComponent(MvGuestParty);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  const q = (fixture: any, sel: string) => fixture.nativeElement.querySelector(sel) as HTMLElement | null;

  it('shows the party as "Party 47291" and a "Party verlassen" button', async () => {
    const fixture = await create();

    expect(q(fixture, '.party-id')!.textContent!.replace(/\s+/g, ' ').trim()).toBe('Party 47291');
    expect(q(fixture, 'button.leave')!.textContent!.trim()).toBe('Party verlassen');
  });

  it('asks before leaving and moves focus into the question', async () => {
    const fixture = await create();

    q(fixture, 'button.leave')!.click();
    await fixture.whenStable();

    const dialog = q(fixture, '[role="alertdialog"]')!;
    expect(dialog.textContent).toContain('Party wirklich verlassen?');
    expect(document.activeElement?.textContent?.trim()).toBe('Ja, verlassen');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(party.currentPartyId).toBe('party-1');
  });

  it('"Ja, verlassen" clears the party but keeps the deviceId, and goes to the start page', async () => {
    const deviceId = party.deviceId;
    const fixture = await create();

    q(fixture, 'button.leave')!.click();
    await fixture.whenStable();
    (Array.from(fixture.nativeElement.querySelectorAll('[role="alertdialog"] button')) as HTMLButtonElement[])
      .find((b) => b.textContent!.trim() === 'Ja, verlassen')!.click();
    await fixture.whenStable();

    expect(party.currentPartyId).toBeNull();
    expect(party.currentPin).toBeNull();
    expect(party.deviceId).toBe(deviceId);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('"Abbrechen" and Escape close the question, stay in the party and return focus', async () => {
    const fixture = await create();
    const leave = q(fixture, 'button.leave') as HTMLButtonElement;

    leave.click();
    await fixture.whenStable();
    (Array.from(fixture.nativeElement.querySelectorAll('[role="alertdialog"] button')) as HTMLButtonElement[])
      .find((b) => b.textContent!.trim() === 'Abbrechen')!.click();
    await fixture.whenStable();
    expect(q(fixture, '[role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe(leave);

    leave.click();
    await fixture.whenStable();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(q(fixture, '[role="alertdialog"]')).toBeNull();
    expect(party.currentPartyId).toBe('party-1');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
