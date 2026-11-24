import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { MvHostMenu } from './mv-host-menu';
import { PartyService } from '../services/party.service';

describe('MvHostMenu', () => {
  // The real test browser width decides nothing: matchMedia is faked so each test
  // chooses burger (narrow) or rail (from 1024 px) and can simulate a resize.
  let wide = false;
  let mediaListener: ((e: MediaQueryListEvent) => void) | null = null;

  function resizeTo(isWide: boolean) {
    wide = isWide;
    mediaListener?.({ matches: isWide } as MediaQueryListEvent);
  }

  beforeEach(async () => {
    wide = false;
    mediaListener = null;
    spyOn(window, 'matchMedia').and.callFake((query: string) => ({
      matches: query === MvHostMenu.RAIL_QUERY ? wide : false,
      addEventListener: (_: string, l: any) => { mediaListener = l; },
      removeEventListener: () => { mediaListener = null; },
    }) as unknown as MediaQueryList);

    await TestBed.configureTestingModule({
      imports: [MvHostMenu],
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(withXhr())],
    }).compileComponents();
    TestBed.inject(PartyService).setCurrentPartyId('party-1');
  });

  function create(active = 'dashboard') {
    const fixture = TestBed.createComponent(MvHostMenu);
    fixture.componentRef.setInput('active', active);
    fixture.detectChanges();
    return fixture;
  }

  it('lists only Dashboard and Blocklist (no Startseite, Voting or Suchen)', () => {
    const fixture = create();
    const labels = Array.from(fixture.nativeElement.querySelectorAll('nav a')).map((a: any) => a.textContent.trim());

    expect(labels).toEqual(['Dashboard', 'Blocklist']);
  });

  it('shows the logo instead of the text and the badge "Party läuft · <Voting-PIN>"', () => {
    TestBed.inject(PartyService).pin$.next('47291');
    const fixture = create();
    const head: HTMLElement = fixture.nativeElement.querySelector('.panel-head');

    expect(head.querySelector('img.brand-logo')!.getAttribute('alt')).toBe('MusicVoting');
    expect(head.querySelector('.live-badge')!.textContent!.trim()).toBe('Party läuft · 47291');
  });

  it('hides the badge while no Voting-PIN is known', () => {
    TestBed.inject(PartyService).pin$.next(null as any);
    const fixture = create();

    expect(fixture.nativeElement.querySelector('.live-badge')).toBeNull();
  });

  it('links Blocklist to the edit mode of the blocklist page for the current party', () => {
    const fixture = create();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelectorAll('nav a')[1];

    expect(link.getAttribute('href')).toBe('/select-blocklist?partyId=party-1&mode=edit');
  });

  it('marks the active page with aria-current', () => {
    const fixture = create('blocklist');
    const current = fixture.nativeElement.querySelector('[aria-current="page"]');

    expect(current.textContent.trim()).toBe('Blocklist');
  });

  it('opens with a labelled burger button and closes on Escape', () => {
    const fixture = create();
    const burger: HTMLButtonElement = fixture.nativeElement.querySelector('button.burger');
    expect(burger.getAttribute('aria-label')).toBe('Menü öffnen');

    burger.click();
    fixture.detectChanges();
    expect(burger.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('.panel.open')).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.panel.open')).toBeNull();
  });

  it('moves focus into the panel on open and back to the burger on Escape (WCAG 2.4.3)', async () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    const burger = root.querySelector('button.burger') as HTMLButtonElement;

    burger.focus();
    burger.click();
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('button.close'));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(root.querySelector('nav')!.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(burger);
  });

  it('returns focus to the burger when closed with the close button', async () => {
    const fixture = create();
    const root: HTMLElement = fixture.nativeElement;
    const burger = root.querySelector('button.burger') as HTMLButtonElement;

    burger.click();
    await fixture.whenStable();
    (root.querySelector('button.close') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(document.activeElement).toBe(burger);
  });

  describe('from 1024 px (rail)', () => {
    beforeEach(() => { wide = true; });

    it('shows the navigation permanently, without burger, close button or overlay', () => {
      const fixture = create('blocklist');
      const root: HTMLElement = fixture.nativeElement;
      const nav = root.querySelector('nav')!;

      expect(root.querySelector('button.burger')).toBeNull();
      expect(root.querySelector('button.close')).toBeNull();
      expect(nav.classList).toContain('rail');
      expect(nav.hasAttribute('inert')).toBe(false);
      expect(root.querySelector('[aria-current="page"]')!.textContent!.trim()).toBe('Blocklist');
    });

    it('lists the same entries as the burger menu', () => {
      const fixture = create();
      const labels = Array.from(fixture.nativeElement.querySelectorAll('nav a')).map((a: any) => a.textContent.trim());

      expect(labels).toEqual(['Dashboard', 'Blocklist']);
    });

    it('switches back to the burger when the window gets narrower, and closes an open slide-in when it grows', () => {
      const fixture = create();
      const root: HTMLElement = fixture.nativeElement;

      resizeTo(false);
      fixture.detectChanges();
      expect(root.querySelector('button.burger')).toBeTruthy();
      expect(root.querySelector('nav')!.hasAttribute('inert')).toBe(true);

      (root.querySelector('button.burger') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.open()).toBe(true);

      resizeTo(true);
      fixture.detectChanges();
      expect(fixture.componentInstance.open()).toBe(false);
      expect(root.querySelector('.overlay')).toBeNull();
      expect(root.querySelector('nav')!.classList).toContain('rail');
    });

    it('stops listening to the viewport when destroyed', () => {
      const fixture = create();
      fixture.destroy();

      expect(mediaListener).toBeNull();
    });
  });
});
