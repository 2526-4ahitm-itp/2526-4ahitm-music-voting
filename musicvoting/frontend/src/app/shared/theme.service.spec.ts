import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { GUEST_THEME_KEY, THEME_KEY, ThemeService, themeScopeForUrl } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.removeItem(THEME_KEY);
    localStorage.removeItem(GUEST_THEME_KEY);
    delete document.documentElement.dataset['theme'];
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => {
    localStorage.removeItem(THEME_KEY);
    localStorage.removeItem(GUEST_THEME_KEY);
    document.documentElement.dataset['theme'] = 'dark';
  });

  it('defaults to dark on a device that never chose a mode', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('switches to light, applies it to <html> and remembers the choice', () => {
    const service = TestBed.inject(ThemeService);

    service.toggle();

    expect(service.theme()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  it('restores the stored choice on the next visit', () => {
    localStorage.setItem(THEME_KEY, 'light');

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('light');
  });

  it('follows a change made in another tab (storage event)', () => {
    const service = TestBed.inject(ThemeService);

    localStorage.setItem(THEME_KEY, 'light');
    window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY, newValue: 'light' }));

    expect(service.theme()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('swaps the stage tokens: light mode has a light background and dark text', () => {
    TestBed.inject(ThemeService).set('light');
    const css = getComputedStyle(document.documentElement);

    expect(css.getPropertyValue('--mv-stage').trim().toUpperCase()).toBe('#FAF6FC');
    expect(css.getPropertyValue('--mv-on-stage').trim().toUpperCase()).toBe('#1D0A24');
  });

  describe('guest and host keep separate choices', () => {
    it('a guest switch does not change the host / TV choice', () => {
      const service = TestBed.inject(ThemeService);
      service.useScope('guest');

      service.set('light');

      expect(localStorage.getItem(GUEST_THEME_KEY)).toBe('light');
      expect(localStorage.getItem(THEME_KEY)).toBeNull();

      service.useScope('host');
      expect(service.theme()).toBe('dark');
      expect(document.documentElement.dataset['theme']).toBe('dark');
    });

    it('a host switch does not change a guest who already chose', () => {
      localStorage.setItem(GUEST_THEME_KEY, 'dark');
      const service = TestBed.inject(ThemeService);

      service.set('light'); // host scope is the default

      service.useScope('guest');
      expect(service.theme()).toBe('dark');
      expect(localStorage.getItem(THEME_KEY)).toBe('light');
    });

    it('a guest without an own choice starts from the device choice of the entry pages', () => {
      localStorage.setItem(THEME_KEY, 'light');
      const service = TestBed.inject(ThemeService);

      service.useScope('guest');

      expect(service.theme()).toBe('light');
    });

    it('another tab changing the host choice does not flip a guest page that has its own choice', () => {
      localStorage.setItem(GUEST_THEME_KEY, 'dark');
      const service = TestBed.inject(ThemeService);
      service.useScope('guest');

      localStorage.setItem(THEME_KEY, 'light');
      window.dispatchEvent(new StorageEvent('storage', { key: THEME_KEY, newValue: 'light' }));

      expect(service.theme()).toBe('dark');
    });

    it('maps join, voting and add-songs pages to the guest scope, everything else to host', () => {
      for (const url of ['/code', '/join/12345', '/voting', '/voting?partyId=p1', '/guest']) {
        expect(themeScopeForUrl(url)).withContext(url).toBe('guest');
      }
      for (const url of ['/', '/host-options', '/dashboard', '/startpage?partyId=p1', '/party-ready', '/codex']) {
        expect(themeScopeForUrl(url)).withContext(url).toBe('host');
      }
    });
  });
});
