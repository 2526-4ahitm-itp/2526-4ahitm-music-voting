import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Type, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, NEVER, of } from 'rxjs';
import { HostDashboard } from './host-dashboard/host-dashboard';
import { SearchHost } from './search-host/search-host';
import { VotingHost } from './voting-host/voting-host';
import { SpotifyWebPlayerService } from '../services/spotify-player';
import { PartyService } from '../services/party.service';
import { TrackService } from '../services/spotify-tracks';
import { QueueStateService } from '../services/queue-state';

/**
 * DOM tests for the host pages in the stage look: shared menu, labelled
 * controls, no nested buttons, PIN names (web-ui spec, host spec "Host Sees
 * PIN and QR Code After Creation").
 */
describe('Host pages in stage look (DOM)', () => {
  const song = (id: string, likeCount = 0, extra: any = {}) => ({
    id,
    uri: `spotify:track:${id}`,
    name: `Song ${id}`,
    artists: [{ name: 'Artist' }],
    album: { images: [] },
    likeCount,
    ...extra,
  });

  beforeEach(async () => {
    // ngOnInit opens SSE and loads data; the layout is tested with fixed state.
    spyOn(HostDashboard.prototype, 'ngOnInit').and.resolveTo();
    spyOn(SearchHost.prototype, 'ngOnInit');
    spyOn(VotingHost.prototype, 'ngOnInit');

    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: SpotifyWebPlayerService,
          useValue: { getQueue: () => of({ queue: [] }), getQueueUpdates: () => NEVER, addToPlaylist: () => of({}) },
        },
        {
          provide: PartyService,
          useValue: { currentPartyId: 'party-1', currentPin: '47291', currentHostPin: '99999', endParty: () => of(null), clearParty: () => {} },
        },
        { provide: TrackService, useValue: { searchTracks: () => of({}) } },
        { provide: QueueStateService, useValue: { inQueueUris$: new BehaviorSubject<Set<string>>(new Set()), refresh: () => {} } },
      ],
    }).compileComponents();
  });

  function render<T>(type: Type<T>, setup: (c: T) => void = () => {}): ComponentFixture<T> {
    const fixture = TestBed.createComponent(type);
    setup(fixture.componentInstance);
    fixture.detectChanges();
    return fixture;
  }

  function expectAccessibleControls(root: HTMLElement) {
    // No button or link inside another button or link.
    expect(root.querySelectorAll('button button, button a, a button, a a').length).toBe(0);
    // Every button without visible text has an aria-label.
    root.querySelectorAll('button').forEach((b) => {
      const hasText = (b.textContent ?? '').trim().length > 0;
      expect(hasText || !!b.getAttribute('aria-label')).withContext(b.outerHTML).toBe(true);
    });
  }

  for (const [name, type, active] of [
    ['dashboard', HostDashboard, 'Dashboard'],
    ['voting', VotingHost, 'Voting'],
    ['search', SearchHost, 'Suchen'],
  ] as const) {
    it(`${name}: uses the stage look with the shared host menu`, () => {
      const fixture = render(type as Type<any>);
      const root: HTMLElement = fixture.nativeElement;

      expect(root.querySelector('.host-stage')).toBeTruthy();
      // The burger lives in the sticky top bar, so it is always reachable.
      expect(root.querySelector('.host-top mv-host-menu button.burger')?.getAttribute('aria-label')).toBe('Menü öffnen');
      expect(getComputedStyle(root.querySelector('.host-top')!).position).toBe('sticky');
      expect(root.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe(active);
      expect(root.textContent).not.toContain('Startseite');
      expectAccessibleControls(root);
      fixture.destroy();
    });
  }

  it('every host page shows the "Heller Modus" switch in the top bar', () => {
    for (const type of [HostDashboard, VotingHost, SearchHost] as Type<any>[]) {
      const fixture = render(type);
      expect(fixture.nativeElement.querySelector('.host-top [role="switch"]')?.getAttribute('aria-label')).toBe('Heller Modus');
      fixture.destroy();
    }
  });

  it('dashboard: the light mode switch changes the stage to a light background', () => {
    const fixture = render(HostDashboard);
    const stage = () => getComputedStyle(fixture.nativeElement.querySelector('.host-stage')).backgroundColor;
    const dark = stage();

    (fixture.nativeElement.querySelector('[role="switch"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(stage()).not.toBe(dark);
    expect(stage()).toBe('rgb(250, 246, 252)');
    document.documentElement.dataset['theme'] = 'dark';
    localStorage.removeItem('mv-theme');
    fixture.destroy();
  });

  it('dashboard: names the codes Voting-PIN and Gastgeber-PIN, with the hint, and never Host-PIN', () => {
    const fixture = render(HostDashboard, (c) => {
      c.pin = '47291';
      c.hostPin = '99999';
    });
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Voting-PIN');
    expect(text).toContain('47291');
    expect(text).toContain('Gastgeber-PIN');
    expect(text).toContain('Geheim – damit kommst du zurück ins Dashboard.');
    expect(text).not.toContain('Host-PIN');
    fixture.destroy();
  });

  it('dashboard: labels player controls and queue actions, with no nested buttons in the end-party confirmation', () => {
    const fixture = render(HostDashboard, (c) => {
      c.currentTrack = song('now');
      c.tracks = [song('a', 2), song('b', 0)];
      c.confirmEnd = true;
    });
    const root: HTMLElement = fixture.nativeElement;
    const labels = Array.from(root.querySelectorAll('button[aria-label]')).map((b) => b.getAttribute('aria-label'));

    expect(labels).toContain('Song neu starten');
    expect(labels).toContain('Nächster Song');
    // Blocking moved into the removal question (design D7): no separate ban button per row.
    expect(labels).not.toContain('Song sperren');
    expect(labels.filter((l) => l === 'Song entfernen').length).toBe(2);
    expect(root.textContent).toContain('Party wirklich beenden?');
    expectAccessibleControls(root);
    fixture.destroy();
  });

  it('dashboard: the removal question offers "Auch sperren" only for waiting songs', () => {
    const playing = { ...song('now'), isCurrentlyPlaying: true };
    const waiting = song('a', 2);
    const buttonsOf = (root: HTMLElement) =>
      Array.from(root.querySelectorAll('[role="alertdialog"] button')).map((b) => (b.textContent ?? '').trim());

    const waitingFixture = render(HostDashboard, (c) => {
      c.tracks = [playing, waiting];
      c.confirmRemoveUri = waiting.uri;
    });
    const dialog = waitingFixture.nativeElement.querySelector('[role="alertdialog"]') as HTMLElement;
    expect(dialog.getAttribute('aria-label')).toBe('Song entfernen bestätigen');
    expect(dialog.textContent).toContain('aus der Warteschlange entfernen?');
    expect(buttonsOf(waitingFixture.nativeElement)).toEqual(['Auch sperren', 'Nur entfernen', 'Abbrechen']);
    waitingFixture.destroy();

    const playingFixture = render(HostDashboard, (c) => {
      c.tracks = [playing, waiting];
      c.confirmRemoveUri = playing.uri;
    });
    expect(buttonsOf(playingFixture.nativeElement)).toEqual(['Nur entfernen', 'Abbrechen']);
    playingFixture.destroy();
  });

  it('dashboard: shows no HTL credit (only TV and landing page carry it)', () => {
    const fixture = render(HostDashboard);

    expect(fixture.nativeElement.textContent).not.toContain('powered by');
    fixture.destroy();
  });

  it('voting: shows the like count per song instead of a dead heart button', () => {
    const fixture = render(VotingHost, (c) => c.tracks.set([song('a', 3), song('b', 0)]));
    const counts = Array.from(fixture.nativeElement.querySelectorAll('.host-likes-count')).map((e: any) => e.textContent.trim());

    expect(counts).toEqual(['3', '0']);
    expect(fixture.nativeElement.querySelectorAll('.vote-button').length).toBe(0);
    fixture.destroy();
  });

  it('search: keeps the "Nicht erlaubt." hint for blocked songs and disables their add button', () => {
    const fixture = render(SearchHost, (c) => c.tracks.set([song('a', 0, { blocked: true }), song('b')]));
    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.search-row'));

    expect(rows[0].textContent).toContain('Nicht erlaubt.');
    expect((rows[0].querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    expect((rows[1].querySelector('button') as HTMLButtonElement).getAttribute('aria-label')).toBe('Song hinzufügen');
    fixture.destroy();
  });
});
