import { DOCUMENT, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type MvTheme = 'dark' | 'light';

/** localStorage key for the chosen stage theme. */
export const THEME_KEY = 'mv-theme';

/**
 * Dark / light mode for the stage pages (web-ui spec "Host Can Switch
 * Between Dark and Light Mode").
 *
 * The theme is applied as `data-theme` on <html>; styles.css swaps the
 * --mv-stage-* tokens for `light`, so no page needs its own theme CSS.
 * Dark is the default. The choice is stored per device, and a `storage`
 * event keeps other tabs of the same browser in sync, so the TV page follows
 * the host's switch without a reload.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  /** The active theme. */
  readonly theme = signal<MvTheme>('dark');

  constructor() {
    this.apply(this.read());
    if (this.browser) {
      // Another tab changed the theme (e.g. the host dashboard while the TV page is open).
      window.addEventListener('storage', (e) => {
        if (e.key === THEME_KEY) this.apply(this.read());
      });
    }
  }

  /** Switches between dark and light and remembers the choice. */
  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: MvTheme): void {
    if (this.browser) {
      try { localStorage.setItem(THEME_KEY, theme); } catch { /* private mode: apply anyway */ }
    }
    this.apply(theme);
  }

  private read(): MvTheme {
    if (!this.browser) return 'dark';
    try {
      return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  }

  private apply(theme: MvTheme): void {
    this.theme.set(theme);
    this.doc.documentElement.dataset['theme'] = theme;
  }
}
