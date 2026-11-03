import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID, Type, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject, NEVER, of } from 'rxjs';
import { Guest } from './guest/guest';
import { VotingComp } from './voting-comp/voting-comp';
import { SelectBlacklist } from './select-blacklist/select-blacklist';
import { Startpage } from './startpage/startpage';
import { PartyReady } from './party-ready/party-ready';
import { CodeInput } from './code-input/code-input';
import { HostOptions } from './host-options/host-options';
import { CreateParty } from './create-party/create-party';
import { SpotifyWebPlayerService } from '../services/spotify-player';
import { PartyService } from '../services/party.service';
import { TrackService } from '../services/spotify-tracks';
import { QueueStateService } from '../services/queue-state';

/**
 * Accessibility baseline for the pages not covered by the host and entry page
 * DOM specs (tasks 5.1–5.6): guest views, blacklist, TV page and go-live step.
 * Every page is rendered with real content, so the icon buttons inside lists
 * (add, like, remove) are checked too, not just the empty state.
 */
describe('Accessibility baseline (DOM)', () => {
  const song = (id: string, extra: any = {}) => ({
    id,
    uri: `spotify:track:${id}`,
    name: `Song ${id}`,
    artists: [{ name: 'Artist' }],
    album: { images: [] },
    likeCount: 0,
    ...extra,
  });

  beforeEach(async () => {
    // ngOnInit opens SSE / polls the backend; these tests check the markup with fixed state.
    for (const type of [Guest, VotingComp, SelectBlacklist, Startpage, PartyReady, CodeInput]) {
      spyOn(type.prototype as any, 'ngOnInit').and.returnValue(undefined);
    }

    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null }, paramMap: { get: () => null } } } },
        {
          provide: SpotifyWebPlayerService,
          useValue: { getQueue: () => of({ queue: [] }), getQueueUpdates: () => NEVER, addToPlaylist: () => of({}), disconnectPlayer: () => {} },
        },
        {
          provide: PartyService,
          useValue: {
            currentPartyId: 'party-1', currentPin: '47291', currentHostPin: '99999', deviceId: 'device-1',
            setCurrentPartyId: () => {}, getParty: () => of({ pin: '47291' }),
          },
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

  /** No interactive element inside another, and every icon-only button has a name. */
  function expectAccessibleControls(root: HTMLElement) {
    expect(root.querySelectorAll('button button, button a, a button, a a').length).toBe(0);
    root.querySelectorAll('button').forEach((b) => {
      const hasText = (b.textContent ?? '').trim().length > 0;
      expect(hasText || !!b.getAttribute('aria-label')).withContext(b.outerHTML).toBe(true);
    });
  }

  it('guest search: add buttons are labelled, also for blocked songs', () => {
    const fixture = render(Guest, (c) => {
      c.searchQuery.set('abba');
      c.lastSearchedTerm.set('abba');
      c.tracks.set([song('a'), song('b', { blocked: true })]);
    });
    const root: HTMLElement = fixture.nativeElement;

    const addButtons = root.querySelectorAll('button.add-button');
    expect(addButtons.length).toBe(2);
    addButtons.forEach((b) => expect(b.getAttribute('aria-label')).toBeTruthy());
    expectAccessibleControls(root);
    fixture.destroy();
  });

  it('guest voting: like buttons are labelled toggles, the welcome sheet button has text', () => {
    const fixture = render(VotingComp, (c) => {
      c.tracks.set([song('a', { hasVoted: true, likeCount: 2 }), song('b')]);
      c.showWelcome.set(true);
    });
    const root: HTMLElement = fixture.nativeElement;

    const likes = root.querySelectorAll('button.vote-button');
    expect(likes.length).toBe(2);
    likes.forEach((b) => {
      expect(b.getAttribute('aria-label')).toMatch(/^(Song liken|Like entfernen)$/);
      expect(b.getAttribute('aria-pressed')).toMatch(/^(true|false)$/);
    });
    expect(root.querySelector('.welcome-sheet button')?.textContent).toContain("Los geht's");
    expectAccessibleControls(root);
    fixture.destroy();
  });

  it('blacklist: tabs, results and remove buttons are labelled real buttons', () => {
    const fixture = render(SelectBlacklist, (c) => {
      c.partyId = 'party-1';
      c.isLoading = false;
      c.entries = [{ id: 'e1', kind: 'WORD', value: 'live', label: 'live', imageUrl: null } as any];
      c.artistResults = [{ id: 'ar1', name: 'ABBA', imageUrl: null } as any];
    });
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelectorAll('[role="tab"]').length).toBe(2);
    expect(root.querySelector('button.artist-result')).not.toBeNull();
    expect(root.querySelector('button.remove-btn')?.getAttribute('aria-label')).toBe('live entfernen');
    expectAccessibleControls(root);
    fixture.destroy();
  });

  it('TV page: has no controls at all (dashboard spec "No Host Controls on Dashboard")', () => {
    const fixture = render(Startpage);
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelectorAll('button, a[href], input').length).toBe(0);
    fixture.destroy();
  });

  it('go-live step: every control is a labelled real button', () => {
    const fixture = render(PartyReady, (c) => { c.partyId = 'party-1'; c.pin = '47291'; });

    expectAccessibleControls(fixture.nativeElement);
    fixture.destroy();
  });

  // Back arrows used to be <div (click)>, which keyboards cannot reach. A native
  // <button type="button"> is focusable and fires click on Enter and Space.
  for (const [name, type, label] of [
    ['join page', CodeInput, 'Zurück'],
    ['host options', HostOptions, 'Zurück zur Startseite'],
    ['Party erstellen', CreateParty, 'Zurück zu den Gastgeber-Optionen'],
  ] as const) {
    it(`${name}: the back arrow is a keyboard-reachable button with a label`, () => {
      const fixture = render(type as Type<any>);
      const back = fixture.nativeElement.querySelector(`[aria-label="${label}"]`) as HTMLElement;

      expect(back).withContext(name).not.toBeNull();
      expect(back.tagName).toBe('BUTTON');
      expect(back.getAttribute('type')).toBe('button');
      expect(back.tabIndex).toBe(0);
      fixture.destroy();
    });
  }

  it('the global focus ring cannot be replaced by a component box-shadow', () => {
    // Host options cards draw their outline with an inset box-shadow; the global
    // :focus-visible ring must still win, or keyboard users lose track of focus.
    const rule = [...document.styleSheets]
      .flatMap((s) => { try { return [...s.cssRules]; } catch { return []; } })
      .find((r) => r instanceof CSSStyleRule && r.selectorText === ':focus-visible') as CSSStyleRule | undefined;

    expect(rule).toBeDefined();
    expect(rule!.style.getPropertyPriority('box-shadow')).toBe('important');
  });
});
