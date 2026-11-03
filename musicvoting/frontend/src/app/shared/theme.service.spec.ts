import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { THEME_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.removeItem(THEME_KEY);
    delete document.documentElement.dataset['theme'];
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => {
    localStorage.removeItem(THEME_KEY);
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
});
