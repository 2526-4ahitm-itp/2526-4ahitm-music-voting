import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Type, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NEVER, Subject, of, throwError } from 'rxjs';
import { HostDashboard } from './host-dashboard/host-dashboard';
import { SpotifyWebPlayerService } from '../services/spotify-player';
import { PartyService } from '../services/party.service';
import { TrackService } from '../services/spotify-tracks';

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

    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: SpotifyWebPlayerService,
          useValue: { getQueue: () => of({ queue: [] }), getQueueUpdates: () => NEVER, addToPlaylist: () => of({}) },
        },
        {
          provide: PartyService,
          useValue: { currentPartyId: 'party-1', currentPin: '47291', currentHostPin: '99999', pin$: of('47291'), endParty: () => of(null), clearParty: () => {} },
        },
        { provide: TrackService, useValue: { searchTracks: () => of({}) } },
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

  // The former voting and search pages are part of the dashboard now; it is the only host page with a queue.
  for (const [name, type, active] of [
    ['dashboard', HostDashboard, 'Dashboard'],
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
    for (const type of [HostDashboard] as Type<any>[]) {
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
    expect(text).toContain('Nicht weitergeben – damit öffnest du Dashboard und Player auf einem anderen Gerät.');
    expect(text).not.toContain('Host-PIN');
    fixture.destroy();
  });

  it('dashboard: the Gastgeber-PIN is hidden as "•••••" until "Anzeigen", and sits below the party actions', () => {
    const fixture = render(HostDashboard, (c) => {
      c.pin = '47291';
      c.hostPin = '83615';
    });
    const root: HTMLElement = fixture.nativeElement;
    const card = root.querySelector('.host-pin') as HTMLElement;
    const toggle = card.querySelector('.pin-toggle') as HTMLButtonElement;

    expect(card.querySelector('.pin-value')!.textContent!.trim()).toBe('•••••');
    expect(root.textContent).not.toContain('83615');
    expect(toggle.textContent!.trim()).toBe('Anzeigen');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    // The hint stays visible while the PIN is hidden.
    expect(card.textContent).toContain('Nicht weitergeben – damit öffnest du Dashboard und Player auf einem anderen Gerät.');

    toggle.click();
    fixture.detectChanges();
    expect(card.querySelector('.pin-value')!.textContent!.trim()).toBe('83615');
    expect(toggle.textContent!.trim()).toBe('Verbergen');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    toggle.click();
    fixture.detectChanges();
    expect(card.querySelector('.pin-value')!.textContent!.trim()).toBe('•••••');

    // Order in the side column: join (QR + Voting-PIN), party actions, then the Gastgeber-PIN.
    const order = Array.from(root.querySelectorAll('.side-col > section')).map((sec) => sec.getAttribute('aria-label'));
    expect(order).toEqual(['Mitmachen', 'Party', 'Gastgeber-PIN']);
    fixture.destroy();
  });

  it('dashboard: the Gastgeber-PIN is hidden again on every load', () => {
    const first = render(HostDashboard, (c) => { c.hostPin = '83615'; });
    (first.nativeElement.querySelector('.pin-toggle') as HTMLButtonElement).click();
    first.destroy();

    const second = render(HostDashboard, (c) => { c.hostPin = '83615'; });
    expect(second.nativeElement.querySelector('.host-pin .pin-value').textContent.trim()).toBe('•••••');
    second.destroy();
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

  it('dashboard: the removal question offers "Entfernen und sperren" only for waiting songs', () => {
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
    expect(buttonsOf(waitingFixture.nativeElement)).toEqual(['Entfernen und sperren', 'Nur entfernen', 'Abbrechen']);
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

  // ---------- One queue (host spec "Host Dashboard Shows the Whole Queue on Every Screen") ----------

  it('dashboard: rows keep rank, likes and remove at phone width, with a smaller cover', () => {
    const fixture = render(HostDashboard, (c) => { c.tracks = [song('b', 3), song('c', 1)]; });
    const root: HTMLElement = fixture.nativeElement;
    root.style.width = '390px';
    document.body.appendChild(root);
    // Media queries follow the viewport, not the element: check the rule itself.
    const rule = [...document.styleSheets].flatMap((sh) => { try { return [...sh.cssRules]; } catch { return []; } })
      .find((r: any) => r.conditionText?.includes('max-width: 560px') && r.cssText.includes('.queue-row')) as CSSMediaRule | undefined;
    expect(rule).withContext('phone rule for queue rows').toBeDefined();
    expect(rule!.cssText).not.toContain('display: none');
    expect(rule!.cssText).toContain('40px');

    const first = root.querySelector('.queue-row') as HTMLElement;
    expect(first.querySelector('.rank')!.textContent!.trim()).toBe('1');
    expect(first.querySelector('.host-likes-count')!.textContent!.trim()).toBe('3 Likes');
    expect(first.querySelector('button.like')).not.toBeNull();
    expect(first.querySelector('button[aria-label="Song entfernen"]')).not.toBeNull();
    root.remove();
    fixture.destroy();
  });

  // ---------- Search like on the guest page (host spec "Host Searches and Adds Songs on the Dashboard") ----------

  describe('dashboard search', () => {
    let trackApi: TrackService;
    let spotify: any;

    beforeEach(() => {
      trackApi = TestBed.inject(TrackService);
      spotify = TestBed.inject(SpotifyWebPlayerService);
    });

    async function searchFor(fixture: ComponentFixture<HostDashboard>, term: string, items: any[]) {
      (trackApi as any).searchTracks = jasmine.createSpy('searchTracks').and.returnValue(of({ tracks: { items } }));
      const c = fixture.componentInstance;
      c.onSearchInput(term);
      await c.search(term);
      fixture.detectChanges();
    }

    const rows = (f: ComponentFixture<HostDashboard>) => Array.from(f.nativeElement.querySelectorAll('.result-row')) as HTMLElement[];

    it('has one search field and no "+ Song" button or separate filter', () => {
      const fixture = render(HostDashboard, (c) => { c.tracks = [song('a', 0)]; });
      const root: HTMLElement = fixture.nativeElement;

      const inputs = root.querySelectorAll('.host-search input');
      expect(inputs.length).toBe(1);
      expect(inputs[0].getAttribute('aria-label')).toBe('Song oder Künstler suchen');
      expect(root.querySelector('button.add-song')).toBeNull();
      expect(root.querySelector('mv-host-song-search')).toBeNull();
      fixture.destroy();
    });

    it('replaces the queue with results while searching and shows the queue again when emptied', async () => {
      const fixture = render(HostDashboard, (c) => { c.tracks = [song('a', 2), song('b', 1)]; });
      await searchFor(fixture, 'daft', [song('x'), song('y')]);

      expect(fixture.nativeElement.querySelector('.queue-row')).toBeNull();
      expect(fixture.nativeElement.querySelector('.list-label').textContent).toContain('Suchergebnisse');
      expect(rows(fixture).length).toBe(2);

      fixture.componentInstance.onSearchInput('');
      fixture.detectChanges();
      const ranks = Array.from(fixture.nativeElement.querySelectorAll('.queue-row .rank')).map((r: any) => r.textContent.trim());
      expect(ranks).toEqual(['1', '2']);
      fixture.destroy();
    });

    it('shows a queued result with its likes and like button, others with "+", blocked ones with "Nicht erlaubt."', async () => {
      const fixture = render(HostDashboard, (c) => { c.tracks = [song('q', 2)]; });
      await searchFor(fixture, 'x', [song('q'), song('new'), song('live', 0, { blocked: true })]);
      const [queued, addable, blocked] = rows(fixture);

      expect(queued.querySelector('.host-likes-count')!.textContent).toContain('2');
      expect(queued.querySelector('button.like')!.getAttribute('aria-label')).toBe('Song liken');
      expect(queued.querySelector('button.add')).toBeNull();
      expect((addable.querySelector('button.add') as HTMLButtonElement).disabled).toBe(false);
      expect(blocked.textContent).toContain('Nicht erlaubt.');
      expect((blocked.querySelector('button.add') as HTMLButtonElement).disabled).toBe(true);
      fixture.destroy();
    });

    it('adds a song without leaving the dashboard; the result then offers the like', async () => {
      // Started party: before the start the dashboard shows the first queued song as "now playing".
      const fixture = render(HostDashboard, (c) => { c.tracks = []; c.partyId = 'party-1'; c.partyStarted = true; });
      spotify.addToPlaylist = jasmine.createSpy('addToPlaylist').and.returnValue(of({}));
      const http = TestBed.inject(HttpTestingController);
      await searchFor(fixture, 'x', [song('new')]);

      const done = fixture.componentInstance.addToPlaylist(song('new'));
      // Let the add request resolve, so the queue reload is pending.
      await new Promise((r) => setTimeout(r));
      http.expectOne((r) => r.url.startsWith('/api/party/party-1/track/queue')).flush({ queue: [song('new', 0)] });
      await done;
      fixture.detectChanges();

      expect(spotify.addToPlaylist).toHaveBeenCalledWith('spotify:track:new');
      expect(rows(fixture)[0].querySelector('button.like')).not.toBeNull();
      fixture.destroy();
    });

    it('shows a backend rejection verbatim', async () => {
      spyOn(console, 'error');
      const fixture = render(HostDashboard, (c) => { c.tracks = []; });
      spotify.addToPlaylist = () => throwError(() => ({ error: { error: 'Nicht erlaubt.' } }));
      await searchFor(fixture, 'x', [song('new')]);

      await fixture.componentInstance.addToPlaylist(song('new'));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Nicht erlaubt.');
      fixture.destroy();
    });

    it('"Suche leeren" empties the field in one click, shows the queue and keeps the focus', async () => {
      const fixture = render(HostDashboard, (c) => { c.tracks = [song('a', 1)]; });
      document.body.appendChild(fixture.nativeElement);
      expect(fixture.nativeElement.querySelector('button.search-clear')).toBeNull();
      await searchFor(fixture, 'abba', [song('x')]);

      const clear = fixture.nativeElement.querySelector('button.search-clear') as HTMLButtonElement;
      expect(clear.getAttribute('aria-label')).toBe('Suche leeren');
      clear.click();
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector('.host-search input') as HTMLInputElement;
      expect(input.value).toBe('');
      expect(fixture.nativeElement.querySelector('.queue-row')).not.toBeNull();
      expect(document.activeElement).toBe(input);
      fixture.nativeElement.remove();
      fixture.destroy();
    });
  });

  // ---------- Host likes (host spec "Host Can Like Songs") ----------

  describe('dashboard likes', () => {
    it('likes and un-likes a waiting song optimistically, with this device id', () => {
      const vote = new Subject<any>();
      const spotify: any = TestBed.inject(SpotifyWebPlayerService);
      spotify.toggleVote = jasmine.createSpy('toggleVote').and.callFake(() => vote.asObservable());
      (TestBed.inject(PartyService) as any).deviceId = 'device-host';
      const fixture = render(HostDashboard, (c) => { c.tracks = [song('b', 2)]; });
      const btn = () => fixture.nativeElement.querySelector('.queue-row button.like') as HTMLButtonElement;
      const count = () => fixture.nativeElement.querySelector('.queue-row .host-likes-count').textContent.trim();

      btn().click();
      fixture.detectChanges();
      expect(spotify.toggleVote).toHaveBeenCalledWith('spotify:track:b', 'device-host');
      expect(count()).toContain('3');
      expect(btn().getAttribute('aria-pressed')).toBe('true');
      expect(btn().getAttribute('aria-label')).toBe('Like entfernen');

      vote.next({ likeCount: 3, liked: true });
      vote.complete();
      fixture.detectChanges();
      fixture.destroy();
    });

    it('restores the like state when the request fails', async () => {
      spyOn(console, 'error');
      const spotify: any = TestBed.inject(SpotifyWebPlayerService);
      spotify.toggleVote = () => throwError(() => new Error('offline'));
      const fixture = render(HostDashboard, (c) => { c.tracks = [song('b', 2)]; });

      await fixture.componentInstance.toggleVote(fixture.componentInstance.tracks[0]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.queue-row .host-likes-count').textContent).toContain('2');
      expect(fixture.nativeElement.querySelector('.queue-row button.like').getAttribute('aria-pressed')).toBe('false');
      fixture.destroy();
    });

    it('offers no like button for the playing song', () => {
      const fixture = render(HostDashboard, (c) => { c.tracks = [{ ...song('now', 1), isCurrentlyPlaying: true }]; });

      expect(fixture.nativeElement.querySelector('.queue-row button.like')).toBeNull();
      fixture.destroy();
    });
  });

  it('dashboard: "Player auf diesem Gerät öffnen" with the five steps for another device below', () => {
    const fixture = render(HostDashboard);
    const actions = fixture.nativeElement.querySelector('.actions') as HTMLElement;

    expect(actions.querySelector('button.action strong')!.textContent!.trim()).toBe('Player auf diesem Gerät öffnen');
    expect(actions.querySelector('mv-other-device-steps .title')!.textContent!.trim()).toBe('Player auf anderem Gerät öffnen');
    expect(actions.querySelectorAll('mv-other-device-steps ol > li').length).toBe(5);
    expect(actions.querySelector('mv-other-device-steps a')!.getAttribute('href')).toBe('https://it220241.cloud.htl-leonding.ac.at/');
    expect(actions.querySelector('mv-other-device-steps a')!.textContent!.trim()).toBe('it220241.cloud.htl-leonding.ac.at');
    fixture.destroy();
  });

  it('dashboard: tags the codes "für Gäste" and "nur für dich"', () => {
    const fixture = render(HostDashboard, (c) => { c.pin = '47291'; });
    const labels = Array.from(fixture.nativeElement.querySelectorAll('.pin-label')).map((l: any) => l.textContent.replace(/\s+/g, ' ').trim());

    expect(labels).toEqual(['Voting-PIN für Gäste', 'Gastgeber-PIN nur für dich']);
    fixture.destroy();
  });

  // ---------- Focus in the confirms (host spec "Dashboard Confirmations Manage Focus") ----------

  describe('dashboard confirmations', () => {
    async function open(setup: (c: HostDashboard) => void) {
      const fixture = render(HostDashboard, setup);
      document.body.appendChild(fixture.nativeElement);
      await fixture.whenStable();
      return fixture;
    }

    function close(fixture: ComponentFixture<HostDashboard>) {
      fixture.nativeElement.remove();
      fixture.destroy();
    }

    it('"Song entfernen" moves focus to "Entfernen und sperren"', async () => {
      const fixture = await open((c) => { c.tracks = [song('a', 2)]; });
      (fixture.nativeElement.querySelector('button[aria-label="Song entfernen"]') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect((document.activeElement as HTMLElement).textContent!.trim()).toBe('Entfernen und sperren');
      close(fixture);
    });

    it('for the playing song the focus goes to "Nur entfernen"', async () => {
      const playing = { ...song('now'), isCurrentlyPlaying: true };
      const fixture = await open((c) => { c.tracks = [playing]; });
      (fixture.nativeElement.querySelector('button[aria-label="Song entfernen"]') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect((document.activeElement as HTMLElement).textContent!.trim()).toBe('Nur entfernen');
      close(fixture);
    });

    it('Escape closes the removal question and returns focus to its trigger', async () => {
      const fixture = await open((c) => { c.tracks = [song('a', 2)]; });
      const trigger = fixture.nativeElement.querySelector('button[aria-label="Song entfernen"]') as HTMLButtonElement;
      trigger.click();
      await fixture.whenStable();

      (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeNull();
      expect(fixture.componentInstance.tracks.length).toBe(1);
      expect(document.activeElement).toBe(trigger);
      close(fixture);
    });

    it('after a removal the focus is on the queue heading', async () => {
      const fixture = await open((c) => { c.tracks = [song('a', 2)]; });
      spyOn(fixture.componentInstance, 'onDeleteTrack').and.resolveTo();
      (fixture.nativeElement.querySelector('button[aria-label="Song entfernen"]') as HTMLButtonElement).click();
      await fixture.whenStable();

      await fixture.componentInstance.confirmRemoveOnly(fixture.componentInstance.tracks[0]);

      expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#queue-title'));
      close(fixture);
    });

    it('"Party beenden" moves focus to "Abbrechen"; Escape closes and refocuses "Party beenden"', async () => {
      const fixture = await open(() => {});
      (fixture.nativeElement.querySelector('button.action.end') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect((document.activeElement as HTMLElement).textContent!.trim()).toBe('Abbrechen');

      (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.confirm.end')).toBeNull();
      expect(document.activeElement).toBe(fixture.nativeElement.querySelector('button.action.end'));
      close(fixture);
    });
  });
});
