import { Type } from '@angular/core';
import { CodeInput } from './pages/code-input/code-input';
import { CreateParty } from './pages/create-party/create-party';
import { Guest } from './pages/guest/guest';
import { Home } from './pages/home/home';
import { HostDashboard } from './pages/host-dashboard/host-dashboard';
import { HostOptions } from './pages/host-options/host-options';
import { SearchHost } from './pages/search-host/search-host';
import { SelectPlaylist } from './pages/select-playlist/select-playlist';
import { Startpage } from './pages/startpage/startpage';
import { VotingComp } from './pages/voting-comp/voting-comp';
import { VotingHost } from './pages/voting-host/voting-host';

/**
 * Guards the web design system (spec: web-design-system).
 * Tokens live in src/styles.css; page stylesheets must reference them instead of
 * hard-coding colors, and must not contain html/body rules (Angular's emulated
 * encapsulation scopes those to the component, so they never apply).
 */
describe('Design tokens', () => {
  const pages: Record<string, Type<unknown>> = {
    CodeInput, CreateParty, Guest, Home, HostDashboard, HostOptions,
    SearchHost, SelectPlaylist, Startpage, VotingComp, VotingHost,
  };

  /**
   * Reads the compiled component CSS from Angular's component definition.
   * ɵcmp is private API; it is fine in a test, and the non-empty check below
   * makes an Angular upgrade that changes it fail loudly instead of passing silently.
   */
  function compiledStyles(component: Type<unknown>): string {
    return ((component as any).ɵcmp?.styles ?? []).join('\n');
  }

  function rootToken(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  it('defines the brand tokens on :root', () => {
    expect(rootToken('--color-primary')).toBe('#8403a6');
    expect(rootToken('--color-accent')).toBe('#f2594b');
    // The browser reformats whitespace in custom property values, so normalize before comparing.
    expect(rootToken('--gradient-brand').replace(/\s+/g, ''))
      .toBe('linear-gradient(135deg,#8403a6,#f2594b)');
  });

  it('resolves var(--color-primary) to the brand purple on an element', () => {
    const el = document.createElement('div');
    el.style.background = 'var(--color-primary)';
    document.body.appendChild(el);
    try {
      expect(getComputedStyle(el).backgroundColor).toBe('rgb(132, 3, 166)');
    } finally {
      el.remove();
    }
  });

  for (const [name, component] of Object.entries(pages)) {
    describe(name, () => {
      const css = compiledStyles(component);

      it('has compiled styles to inspect', () => {
        expect(css.length).toBeGreaterThan(0);
      });

      it('uses no hex color literals', () => {
        // Only match hex values inside declarations ("prop: … #abc"), not #id selectors.
        const hex = css.match(/:[^;{}]*#[0-9a-f]{3,8}\b/gi) ?? [];
        expect(hex).withContext(hex.join('\n')).toEqual([]);
      });

      it('contains no html/body selectors', () => {
        const globals = css.match(/(^|[\s,}])(html|body)\b(?![-\w])/g) ?? [];
        expect(globals).withContext(globals.join('\n')).toEqual([]);
      });
    });
  }
});
