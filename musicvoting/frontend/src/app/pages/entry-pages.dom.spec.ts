import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Type, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Home } from './home/home';
import { CodeInput } from './code-input/code-input';
import { HostOptions } from './host-options/host-options';
import { CreateParty } from './create-party/create-party';
import { SelectPlaylist } from './select-playlist/select-playlist';
import { MvPartyEnded } from '../shared/mv-party-ended';
import { PartyService } from '../services/party.service';

/**
 * DOM tests for the entry and setup pages after they moved to the stage look
 * (web-ui spec "Every Web Page Uses the Stage Look", host spec "Only Supported
 * Providers Are Selectable", PIN names from host spec "Host Sees PIN and QR
 * Code After Creation").
 */
describe('Entry and setup pages in stage look (DOM)', () => {
  beforeEach(async () => {
    // Data loading is not part of the layout; the pages are rendered with fixed state.
    spyOn(SelectPlaylist.prototype, 'ngOnInit').and.resolveTo();
    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PartyService, useValue: { currentPartyId: 'party-1', createParty: () => of({}), resolveHostPin: () => of({}) } },
      ],
    }).compileComponents();
  });

  function render<T>(type: Type<T>, setup: (c: T) => void = () => {}): ComponentFixture<T> {
    const fixture = TestBed.createComponent(type);
    setup(fixture.componentInstance);
    fixture.detectChanges();
    return fixture;
  }

  /** True if any element of the page paints the old full-page brand gradient. */
  function usesGradientBackground(root: HTMLElement): boolean {
    return [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]
      .some((el) => getComputedStyle(el).backgroundImage.includes('linear-gradient'));
  }

  function expectAccessibleControls(root: HTMLElement) {
    expect(root.querySelectorAll('button button, button a, a button, a a').length).toBe(0);
    // Back arrows are real buttons (they used to be clickable divs).
    root.querySelectorAll('[aria-label^="Zurück"]').forEach((el) => expect(el.tagName).toBe('BUTTON'));
    root.querySelectorAll('button').forEach((b) => {
      const hasText = (b.textContent ?? '').trim().length > 0;
      expect(hasText || !!b.getAttribute('aria-label')).withContext(b.outerHTML).toBe(true);
    });
  }

  for (const [name, type] of [
    ['landing page', Home],
    ['join page', CodeInput],
    ['host options', HostOptions],
    ['Party erstellen', CreateParty],
    ['playlist choice', SelectPlaylist],
  ] as const) {
    it(`${name}: uses the stage look with the theme switch and no gradient background`, () => {
      const fixture = render(type as Type<any>, (c: any) => {
        if (c instanceof SelectPlaylist) c.isLoading = false;
      });
      const root: HTMLElement = fixture.nativeElement;

      expect(root.querySelector('.host-stage')).not.toBeNull();
      expect(root.querySelector('.host-top mv-theme-toggle [role="switch"]')).not.toBeNull();
      expect(usesGradientBackground(root)).toBe(false);
      expectAccessibleControls(root);
      fixture.destroy();
    });
  }

  it('landing page: shows the wordmark, both roles and the HTL credit footer', () => {
    const fixture = render(Home);
    const text = fixture.nativeElement.textContent as string;

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('MusicVoting');
    expect(text).toContain('Gast auf einer Party');
    expect(text).toContain('Gastgeber einer Party');
    expect(fixture.nativeElement.querySelector('footer mv-credit-footer')?.textContent).toContain('powered by');
    fixture.destroy();
  });

  it('host options: icons instead of emoji, "Gastgeber-PIN" wording and "Player öffnen"', () => {
    const fixture = render(HostOptions);
    const root: HTMLElement = fixture.nativeElement;

    expect(root.textContent).not.toMatch(/[🪩👑🔊]/u);
    expect(root.querySelectorAll('.option-btn mv-icon').length).toBeGreaterThanOrEqual(3);

    fixture.componentInstance.showPinEntry('pin-startpage');
    fixture.detectChanges();

    expect(root.querySelector('h1')?.textContent).toContain('Player öffnen');
    expect(root.textContent).toContain('Gastgeber-PIN');
    expect(root.textContent).not.toContain('Host-PIN');
    expect(root.textContent).not.toContain('Startseite öffnen');
    expect(root.querySelector('input.pin-input')?.getAttribute('aria-label')).toBe('Gastgeber-PIN');
    fixture.destroy();
  });

  it('Party erstellen: Spotify selectable with the Premium note, YouTube disabled, no Amazon Music', () => {
    const fixture = render(CreateParty);
    const root: HTMLElement = fixture.nativeElement;
    const spotify = root.querySelector<HTMLInputElement>('input[value="spotify"]')!;
    const youtube = root.querySelector<HTMLInputElement>('input[value="youtube"]')!;

    expect(spotify.checked).toBe(true);
    expect(spotify.disabled).toBe(false);
    expect(root.textContent).toContain('Du brauchst Spotify Premium.');
    expect(youtube.disabled).toBe(true);
    expect(root.textContent).toContain('YouTube (bald verfügbar)');
    expect(root.textContent).not.toContain('Amazon');
    expect(root.querySelector('[style*="!important"]')).toBeNull();
    fixture.destroy();
  });

  it('playlist choice: rows use mv-cover so a missing image gets the placeholder', () => {
    const fixture = render(SelectPlaylist, (c) => {
      c.isLoading = false;
      c.playlists = [{ id: 'pl-1', name: 'My List', trackCount: 2, imageUrl: null } as any];
    });

    const row = fixture.nativeElement.querySelector('button.playlist-item') as HTMLElement;
    expect(row.querySelector('mv-cover')).not.toBeNull();
    expect(row.textContent).toContain('My List');
    expect(row.textContent).toContain('2 Songs');
    fixture.destroy();
  });

  it('party ended: stage background and card instead of the gradient fill', () => {
    const fixture = render(MvPartyEnded);
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelector('.host-stage .host-card')).not.toBeNull();
    expect(usesGradientBackground(root)).toBe(false);
    expect(root.querySelector('button.home')?.textContent).toContain('Zur Startseite');
    fixture.destroy();
  });
});
