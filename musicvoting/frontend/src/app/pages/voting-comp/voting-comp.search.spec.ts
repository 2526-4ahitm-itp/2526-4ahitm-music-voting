import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { VotingComp } from './voting-comp';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { TrackService } from '../../services/spotify-tracks';
import { PartyService } from '../../services/party.service';
import { AddCooldownService } from '../../services/add-cooldown';

/**
 * DOM tests of the single guest page with the search field in use (guest spec
 * "Guest Uses One Page for Queue and Search", "Guest Votes on Queued Songs from
 * Search Results", "Guest Search and Add Give Feedback", search spec
 * "Blacklisted Search Results Cannot Be Added").
 */
describe('VotingComp search (DOM)', () => {
  let fixture: ComponentFixture<VotingComp>;
  let comp: VotingComp;
  let spotify: { getQueue: jasmine.Spy; toggleVote: jasmine.Spy; addToPlaylist: jasmine.Spy };
  let trackApi: { searchTracks: jasmine.Spy };
  let voteResponse: Subject<any>;

  const song = (id: string, extra: any = {}) => ({
    id,
    uri: `spotify:track:${id}`,
    name: `Song ${id}`,
    artists: [{ name: 'Artist' }],
    album: { images: [] },
    ...extra,
  });

  /** Stand-in for AddCooldownService: start() sets the seconds, tests count down by hand. */
  let cooldown: { secondsLeft: ReturnType<typeof signal<number>>; active: () => boolean; start: jasmine.Spy };

  beforeEach(async () => {
    const secondsLeft = signal(0);
    cooldown = {
      secondsLeft,
      active: () => secondsLeft() > 0,
      start: jasmine.createSpy('start').and.callFake((s: number) => secondsLeft.set(s)),
    };
    localStorage.setItem('mv-welcome-party-1', '1');
    voteResponse = new Subject<any>();
    spotify = {
      getQueue: jasmine.createSpy('getQueue').and.returnValue(of({ queue: [] })),
      toggleVote: jasmine.createSpy('toggleVote').and.callFake(() => voteResponse.asObservable()),
      addToPlaylist: jasmine.createSpy('addToPlaylist').and.returnValue(of({})),
    };
    trackApi = { searchTracks: jasmine.createSpy('searchTracks').and.returnValue(of({ tracks: { items: [] } })) };

    await TestBed.configureTestingModule({
      imports: [VotingComp],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: SpotifyWebPlayerService, useValue: spotify },
        { provide: TrackService, useValue: trackApi },
        { provide: PartyService, useValue: { currentPartyId: 'party-1', deviceId: 'device-1', clearParty: () => {} } },
        // Controllable countdown: the real one's timing is covered by add-cooldown.spec.ts.
        // A mock clock here would race Angular's change-detection scheduler.
        { provide: AddCooldownService, useValue: cooldown },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VotingComp);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    localStorage.removeItem('mv-welcome-party-1');
  });

  /** Types a term and runs the search directly (the debounce is covered by the unit tests). */
  async function searchFor(term: string, items: any[], hiddenHint: string | null = null) {
    trackApi.searchTracks.and.returnValue(of({ tracks: { items }, hiddenHint }));
    comp.searchQuery.set(term);
    await comp.search(term);
    fixture.detectChanges();
  }

  function rows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.track-card'));
  }

  function status(): string {
    return fixture.nativeElement.querySelector('.search-status')?.textContent ?? '';
  }

  it('has no tab bar', () => {
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('mv-guest-tabs, nav')).toBeNull();
    // No link to another guest view, and no "Voten" / "Hinzufügen" tab label.
    expect(root.querySelector('a[href="/guest"], a[href="/voting"]')).toBeNull();
    const labels = [...root.querySelectorAll('a, button')].map((el) => el.textContent?.trim());
    expect(labels).not.toContain('Voten');
    expect(labels).not.toContain('Hinzufügen');
  });

  it('shows the provider search field and the title "Warteschlange"', () => {
    const input = fixture.nativeElement.querySelector('.host-search input') as HTMLInputElement;
    expect(input.getAttribute('aria-label')).toBe('Song oder Künstler suchen');
    expect(fixture.nativeElement.querySelector('.host-title').textContent.trim()).toBe('Warteschlange');
  });

  it('replaces the queue with the results while searching, labelled "Suchergebnisse"', async () => {
    comp.tracks.set([song('b', { likeCount: 3 })]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ol.track-list')).not.toBeNull();

    await searchFor('daft', [song('x'), song('y')]);

    expect(fixture.nativeElement.querySelector('ol.track-list')).toBeNull();
    expect(fixture.nativeElement.querySelector('.list-label').textContent).toContain('Suchergebnisse');
    expect(rows().length).toBe(2);
    // Results are not in queue order, so they carry no rank.
    expect(fixture.nativeElement.querySelector('.results .rank')).toBeNull();
  });

  it('keeps the ranks after a search is cleared ("Filter keeps the ranks")', async () => {
    comp.tracks.set([song('b', { likeCount: 3 }), song('c', { likeCount: 1 })]);
    await searchFor('Song c', [song('c')]);

    comp.searchQuery.set('');
    await comp.search('');
    fixture.detectChanges();

    const ranks = rows().map((r) => r.querySelector('.rank')!.textContent!.replace('Platz', '').trim());
    expect(ranks).toEqual(['1', '2']);
    expect(rows()[1].textContent).toContain('Song c');
  });

  it('keeps the "Läuft gerade" bar while searching', async () => {
    comp.tracks.set([song('now', { isCurrentlyPlaying: true })]);
    await searchFor('other', [song('x')]);

    expect(fixture.nativeElement.querySelector('.now-bar').textContent).toContain('Song now');
  });

  it('shows a queued result with its likes and heart instead of "+", and likes it like in the queue', async () => {
    comp.tracks.set([song('q', { likeCount: 2, hasVoted: false })]);
    await searchFor('q', [song('q'), song('new')]);

    const [queued, addable] = rows();
    expect(queued.querySelector('.add-button')).toBeNull();
    expect(queued.querySelector('.like-count')!.textContent).toContain('2');
    expect(addable.querySelector('.add-button')).not.toBeNull();
    expect(addable.querySelector('.vote-button')).toBeNull();

    (queued.querySelector('.vote-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(spotify.toggleVote).toHaveBeenCalledWith('spotify:track:q', 'device-1');
    expect(rows()[0].querySelector('.like-count')!.textContent).toContain('3');
    expect(rows()[0].querySelector('.vote-button')!.getAttribute('aria-pressed')).toBe('true');
    // The queue entry itself carries the like, so the queue shows it after clearing the search.
    expect(comp.tracks()[0].likeCount).toBe(3);
  });

  it('turns "+" into the heart when the song is added by someone else', async () => {
    await searchFor('y', [song('y')]);
    expect(rows()[0].querySelector('.add-button')).not.toBeNull();

    spotify.getQueue.and.returnValue(of({ queue: [song('y', { likeCount: 0 })] }));
    (comp as any).eventSource.onmessage({ data: JSON.stringify({ type: 'queue-updated' }) });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(rows()[0].querySelector('.add-button')).toBeNull();
    expect(rows()[0].querySelector('.vote-button')).not.toBeNull();
  });

  it('confirms an add with the rank and no action button, and the result becomes a heart', async () => {
    await searchFor('x', [song('x')]);
    spotify.getQueue.and.returnValue(of({ queue: [song('a'), song('b'), song('c'), song('x')] }));

    (rows()[0].querySelector('.add-button') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    const toast = fixture.nativeElement.querySelector('mv-toast') as HTMLElement;
    expect(toast.textContent).toContain('Song hinzugefügt – Platz 4');
    expect(toast.querySelector('button')).toBeNull();
    expect(rows()[0].querySelector('.vote-button')).not.toBeNull();
  });

  it('announces a backend rejection in the alert region', async () => {
    spyOn(console, 'error');
    spotify.addToPlaylist.and.returnValue(throwError(() => ({ error: { error: 'Song ist schon in der Warteschlange.' } })));
    await searchFor('x', [song('x')]);

    (rows()[0].querySelector('.add-button') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mv-toast [role="alert"]').textContent).toContain('Song ist schon in der Warteschlange.');
  });

  it('greys out blocked results with "Nicht verfügbar" and no reason', async () => {
    await searchFor('live', [song('t1', { blocked: true }), song('t2')]);

    const [blocked, ok] = rows();
    const blockedBtn = blocked.querySelector('.add-button') as HTMLButtonElement;
    expect(blocked.classList).toContain('blocked');
    expect(blockedBtn.disabled).toBe(true);
    expect(blockedBtn.getAttribute('aria-label')).toBe('Nicht verfügbar');
    expect(blockedBtn.getAttribute('title')).toBe('Nicht verfügbar');
    expect((ok.querySelector('.add-button') as HTMLButtonElement).getAttribute('aria-label')).toBe('Song hinzufügen');
    expect(fixture.nativeElement.textContent).not.toContain('Nicht erlaubt.');
    expect(status()).toContain('Einige Ergebnisse sind vom Gastgeber gesperrt.');
  });

  it('replaces "Keine Treffer" with the artist hint when every result was hidden', async () => {
    await searchFor('Drake', [], 'ARTIST');

    expect(status()).toContain('Dieser Artist ist vom Gastgeber gesperrt.');
    expect(status()).not.toContain('Keine Treffer');
  });

  it('shows "Keine Treffer für „…“" when nothing was found', async () => {
    await searchFor('xyzxyzxyz', []);

    expect(status()).toContain('Keine Treffer für „xyzxyzxyz“');
  });

  it('shows the connection message when the search failed', async () => {
    spyOn(console, 'error');
    trackApi.searchTracks.and.returnValue(throwError(() => new Error('offline')));
    comp.searchQuery.set('x');
    await comp.search('x');
    fixture.detectChanges();

    expect(status()).toContain('Verbindung verloren – versuch es gleich nochmal.');
  });

  describe('clear button (host spec "Search Field Has a Clear Button")', () => {
    const clearBtn = () => fixture.nativeElement.querySelector('button.search-clear') as HTMLButtonElement | null;

    it('is not shown while the field is empty', () => {
      expect(clearBtn()).toBeNull();
    });

    it('empties the field in one click, shows the queue again and keeps the focus in the field', async () => {
      document.body.appendChild(fixture.nativeElement);
      comp.tracks.set([song('b', { likeCount: 3 })]);
      await searchFor('abba', [song('x')]);
      expect(clearBtn()!.getAttribute('aria-label')).toBe('Suche leeren');

      clearBtn()!.click();
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector('.host-search input') as HTMLInputElement;
      expect(comp.searchQuery()).toBe('');
      expect(input.value).toBe('');
      expect(comp.results()).toEqual([]);
      expect(fixture.nativeElement.querySelector('ol.track-list')).not.toBeNull();
      expect(document.activeElement).toBe(input);
      expect(clearBtn()).toBeNull();
      fixture.nativeElement.remove();
    });
  });

  describe('countdown after the add limit (guest spec "Web Guest Sees When Adding Is Possible Again")', () => {
    const rateLimited = (retryAfterSeconds: number) => throwError(() => ({
      status: 429,
      error: { error: 'Zu viele Anfragen — bitte kurz warten.', retryAfterSeconds },
    }));
    const addButtons = (): HTMLButtonElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('.add-button'));
    const countdown = (): string =>
      fixture.nativeElement.querySelector('.host-status.cooldown')?.textContent?.trim() ?? '';

    beforeEach(() => spyOn(console, 'error'));

    it('a 429 shows the countdown and locks every "+"', async () => {
      await searchFor('daft', [song('x'), song('y'), song('b', { blocked: true })]);
      spotify.addToPlaylist.and.returnValue(rateLimited(30));

      await comp.addToPlaylist(song('x'));
      fixture.detectChanges();

      expect(cooldown.start).toHaveBeenCalledWith(30);
      expect(countdown()).toBe('Du kannst in 30 s wieder Songs hinzufügen.');
      expect(addButtons().every((b) => b.disabled)).toBeTrue();
      expect(addButtons().map((b) => b.getAttribute('aria-label')))
        .toEqual(['Bitte kurz warten', 'Bitte kurz warten', 'Nicht verfügbar']);
    });

    it('counts down and unlocks the "+" when it runs out', async () => {
      await searchFor('daft', [song('x')]);
      spotify.addToPlaylist.and.returnValue(rateLimited(2));
      await comp.addToPlaylist(song('x'));

      cooldown.secondsLeft.set(1);
      fixture.detectChanges();
      expect(countdown()).toBe('Du kannst in 1 s wieder Songs hinzufügen.');

      cooldown.secondsLeft.set(0);
      fixture.detectChanges();
      expect(countdown()).toBe('');
      expect(addButtons()[0].disabled).toBeFalse();
      expect(addButtons()[0].getAttribute('aria-label')).toBe('Song hinzufügen');
    });

    it('does not send another add while the countdown runs', async () => {
      spotify.addToPlaylist.and.returnValue(rateLimited(30));
      await comp.addToPlaylist(song('x'));
      spotify.addToPlaylist.calls.reset();

      await comp.addToPlaylist(song('y'));

      expect(spotify.addToPlaylist).not.toHaveBeenCalled();
    });

    it('other errors do not start a countdown', async () => {
      spotify.addToPlaylist.and.returnValue(
        throwError(() => ({ status: 409, error: { error: 'Song ist schon in der Warteschlange.' } }))
      );

      await comp.addToPlaylist(song('x'));

      expect(cooldown.start).not.toHaveBeenCalled();
    });

    it('a page opened again uses the same countdown (it lives in a root service)', async () => {
      spotify.addToPlaylist.and.returnValue(rateLimited(40));
      await comp.addToPlaylist(song('x'));
      fixture.destroy(); // guest leaves /voting

      fixture = TestBed.createComponent(VotingComp);
      comp = fixture.componentInstance;
      await searchFor('daft', [song('y')]);

      expect(countdown()).toBe('Du kannst in 40 s wieder Songs hinzufügen.');
      expect(addButtons()[0].disabled).toBeTrue();
    });
  });
});
