import { DOCUMENT, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type MvTheme = 'dark' | 'light';

/**
 * Which setting a page uses (web-ui spec "Host Can Switch Between Dark and
 * Light Mode"):
 * - `host`: host pages, TV page and the shared entry pages (landing, host options, setup).
 * - `guest`: the guest pages (join, voting, add songs).
 */
export type ThemeScope = 'host' | 'guest';

/** localStorage key for the host / TV / entry pages. */
export const THEME_KEY = 'mv-theme';

/** localStorage key for the guest pages, kept apart from the host choice. */
export const GUEST_THEME_KEY = 'mv-guest-theme';

/** Path prefixes of the guest pages: join by code or QR link, voting, add songs. */
const GUEST_PATHS = ['/code', '/join', '/voting', '/guest'];

/**
 * Maps a router URL to its theme scope. Query string and fragment are ignored,
 * so `/voting?partyId=…` is a guest page.
 */
export function themeScopeForUrl(url: string): ThemeScope {
  const path = url.split(/[?#]/)[0];
  return GUEST_PATHS.some((p) => path === p || path.startsWith(`${p}/`)) ? 'guest' : 'host';
}

/**
 * Dark / light mode for the stage pages.
 *
 * The theme is applied as `data-theme` on <html>; styles.css swaps the
 * --mv-stage-* tokens for `light`, so no page needs its own theme CSS.
 * Dark is the default.
 *
 * Guests and the host keep separate choices: a host who also votes on the
 * same phone, or tests with several tabs, should not flip the TV or the
 * dashboard by switching on a guest page (and vice versa). The guest choice
 * starts from the device's host/entry choice until the guest picks one,
 * so a mode chosen on the landing page carries over to joining.
 *
 * A `storage` event keeps other tabs of the same browser in sync within the
 * same scope, so the TV page follows the host's switch without a reload.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  /** The active theme. */
  readonly theme = signal<MvTheme>('dark');

  /** Which setting the current page reads and writes. */
  readonly scope = signal<ThemeScope>('host');

  constructor() {
    this.apply(this.read());
    if (this.browser) {
      // Another tab changed the theme (e.g. the host dashboard while the TV page is open).
      window.addEventListener('storage', (e) => {
        if (e.key === THEME_KEY || e.key === GUEST_THEME_KEY) this.apply(this.read());
      });
    }
  }

  /** Switches to the setting of the given scope; called on every navigation. */
  useScope(scope: ThemeScope): void {
    if (scope === this.scope()) return;
    this.scope.set(scope);
    this.apply(this.read());
  }

  /** Switches between dark and light and remembers the choice. */
  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  /** Sets the theme for the current scope only. */
  set(theme: MvTheme): void {
    if (this.browser) {
      try { localStorage.setItem(this.keyFor(this.scope()), theme); } catch { /* private mode: apply anyway */ }
    }
    this.apply(theme);
  }

  private keyFor(scope: ThemeScope): string {
    return scope === 'guest' ? GUEST_THEME_KEY : THEME_KEY;
  }

  private read(): MvTheme {
    if (!this.browser) return 'dark';
    try {
      // Guests without an own choice yet start from the device's host/entry choice.
      const stored = this.scope() === 'guest'
        ? localStorage.getItem(GUEST_THEME_KEY) ?? localStorage.getItem(THEME_KEY)
        : localStorage.getItem(THEME_KEY);
      return stored === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  }

  private apply(theme: MvTheme): void {
    this.theme.set(theme);
    this.doc.documentElement.dataset['theme'] = theme;
  }
}
