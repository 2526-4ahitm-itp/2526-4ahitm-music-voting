import { Component, OnInit, OnDestroy, NgZone, signal, computed, ChangeDetectorRef, ChangeDetectionStrategy, inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { TrackService } from '../../services/spotify-tracks';
import { PartyService } from '../../services/party.service';
import { AddCooldownService } from '../../services/add-cooldown';
import { MvCover } from '../../shared/mv-cover';
import { MvIcon } from '../../shared/mv-icon';
import { MvSpinner } from '../../shared/mv-spinner';
import { MvToast } from '../../shared/mv-toast';
import { ToastService } from '../../shared/toast.service';
import { MvPartyEnded } from '../../shared/mv-party-ended';
import { MvThemeToggle } from '../../shared/mv-theme-toggle';
import { MvGuestParty } from '../../shared/mv-guest-party';

/** localStorage key prefix for "welcome already seen" per party. */
export const WELCOME_KEY_PREFIX = 'mv-welcome-';

/**
 * How long a confirmation ("Song hinzugefügt", "Geliked") stays: short, because the
 * row itself already shows the result; errors keep the toast's longer default.
 */
export const CONFIRM_MS = 1500;

/** What a search result offers: greyed out, a like (already queued) or "+". */
export type ResultState = 'blocked' | 'queued' | 'addable';

@Component({
  selector: 'app-voting-comp',
  standalone: true,
  imports: [MvCover, MvIcon, MvSpinner, MvToast, MvPartyEnded, MvThemeToggle, MvGuestParty],
  templateUrl: './voting-comp.html',
  // Shared stage look first, page layout second (design D1/D2).
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../../shared/stage.css', './voting-comp.css'],
})
/**
 * The single guest page (guest spec "Guest Uses One Page for Queue and Search").
 *
 * It always shows the queue sorted by likes, with a heart per song. The search
 * field above it searches the party's provider; while it holds text, the
 * results replace the list. A result whose song is already queued gets the
 * same heart as in the queue instead of "+", so guests never need a second page
 * to vote on what they found.
 *
 * Votes are optimistic and toggleable (voting spec "Optimistic Vote UI",
 * "Likes Are Togglable", "Voted State Is Highlighted, Not Disabled"): a tap
 * flips the heart and count at once, the request runs in the background and
 * the previous state comes back if it fails.
 */
export class VotingComp implements OnInit, OnDestroy {
  /** The queue as the server sends it, including the playing song. */
  tracks = signal<any[]>([]);
  searchQuery = signal<string>('');

  // ---------- Search state ----------
  /** Provider search results for the current term (max. 25, de-duplicated). */
  results = signal<any[]>([]);
  isSearching = signal<boolean>(false);
  /** The term of the last finished search; drives the "Keine Treffer" text. */
  lastSearchedTerm = signal<string>('');
  /** Set when the last search failed (network or server error). */
  searchFailed = signal<boolean>(false);
  /**
   * Why songs are missing from the last result: songs by banned artists are removed by the
   * backend (search spec "Blacklisted Search Results Cannot Be Added"), and without this hint
   * the list would just look incomplete. 'ARTIST' = the guest typed a banned artist's name.
   */
  hiddenHint = signal<'ARTIST' | 'SOME' | null>(null);
  /** Result whose add request is running; its button shows a checkmark meanwhile. */
  addingTrackId: string | null = null;
  /** Shown for search and connection problems. */
  readonly connectionLostText = 'Verbindung verloren – versuch es gleich nochmal.';
  /**
   * Countdown after the add limit was hit (guest spec "Web Guest Sees When Adding Is Possible
   * Again"); a root service so it is still right when the guest leaves the page and returns.
   */
  readonly cooldown = inject(AddCooldownService);

  private eventSource?: EventSource;
  private deviceId: string;

  /**
   * Searches while the guest types. The debounce keeps one request per pause
   * instead of one per key; an empty term clears the results at once.
   */
  private searchAutoTrigger = toObservable(this.searchQuery).pipe(
    debounceTime(400),
    distinctUntilChanged()
  ).subscribe(query => this.search(query));

  /**
   * URIs whose vote request is still in flight. A second tap on the same
   * song waits for the first request (no double requests), and a queue
   * reload that arrives meanwhile keeps the local, optimistic state for
   * these songs instead of flipping them back.
   */
  private readonly pendingVotes = new Map<string, { likeCount: number; hasVoted: boolean }>();

  /** URI of the song whose heart should play the "pop" animation once. */
  readonly poppedUri = signal<string | null>(null);

  /** One-time welcome after joining (guest spec "Guest Is Welcomed After Joining"). */
  readonly showWelcome = signal(false);
  /** The welcome closes by itself after this time; it only explains, nothing to decide. */
  static readonly WELCOME_MS = 10000;
  private welcomeTimer: ReturnType<typeof setTimeout> | null = null;

  /** Set when the host ended the party; shows the goodbye screen. */
  readonly partyEnded = signal(false);

  /** The song that is playing right now; shown in the bar on top, not in the list. */
  nowPlaying = computed(() => this.tracks().find((t) => t.isCurrentlyPlaying) ?? null);

  /** Waiting songs in queue order (the server already sorts by likes). */
  waiting = computed(() => this.tracks().filter((t) => !t.isCurrentlyPlaying));

  /** Rank per song URI, counted from 1 in queue order. */
  rankOf = computed(() => new Map(this.waiting().map((t, i) => [t.uri, i + 1] as const)));

  /**
   * Queue entry per URI. Search results look their song up here, so a queued
   * result shows the live like count and liked state of the queue (design D2):
   * one source of truth, and SSE reloads update both lists at once.
   */
  queueByUri = computed(() => new Map(this.tracks().filter((t) => t?.uri).map((t) => [t.uri, t] as const)));

  /** True while the field holds text: the results replace the queue list. */
  isSearchMode = computed(() => this.searchQuery().trim().length > 0);

  /**
   * Song the guest just liked. Its row is highlighted for a moment so the
   * guest can follow it when the next queue reload moves it up.
   */
  readonly highlightedUri = signal<string | null>(null);
  private highlightTimer: ReturnType<typeof setTimeout> | null = null;
  static readonly HIGHLIGHT_MS = 2000;

  constructor(
    private spotifyService: SpotifyWebPlayerService,
    private trackApi: TrackService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private partyService: PartyService,
    private toast?: ToastService,
  ) {
    this.deviceId = this.partyService.deviceId;
  }

  ngOnInit() {
    this.loadPlaylist();
    const partyId = this.partyService.currentPartyId;
    this.showWelcome.set(!!partyId && !this.readWelcomeSeen(partyId));
    if (this.showWelcome()) {
      this.welcomeTimer = setTimeout(() => {
        this.welcomeTimer = null;
        this.dismissWelcome();
        this.cdr?.detectChanges();
      }, VotingComp.WELCOME_MS);
    }
    // The backend only forwards party events to subscribers that name their party.
    const partyQuery = partyId ? `&partyId=${encodeURIComponent(partyId)}` : '';
    this.eventSource = new EventSource(`/api/spotify/events?source=web${partyQuery}`);
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === 'party-ended') {
          // Goodbye screen instead of a silent redirect; forget the session and stop listening.
          this.ngZone.run(() => {
            this.eventSource?.close();
            this.partyService.clearParty?.();
            this.partyEnded.set(true);
            this.cdr?.detectChanges();
          });
        } else if (data?.type === 'queue-updated' || data?.type === 'vote-updated' || data?.type === 'track-changed') {
          // Also refreshes the result states: they are derived from the queue.
          this.loadPlaylist();
        } else if (data?.type === 'blacklist-updated' && this.searchQuery().trim()) {
          // The host blocked or unblocked something: search again so greyed-out songs, removed
          // banned-artist songs and the hint below the search field are current.
          this.search(this.searchQuery());
        }
      } catch { /* ignore malformed events */ }
    };
  }

  ngOnDestroy() {
    this.eventSource?.close();
    this.searchAutoTrigger.unsubscribe();
    if (this.highlightTimer) clearTimeout(this.highlightTimer);
    if (this.welcomeTimer) clearTimeout(this.welcomeTimer);
  }

  async loadPlaylist() {
    try {
      // getQueue completes without a value when no party is stored (e.g. after "Party verlassen"
      // or without backend); that is an empty queue, not an EmptyError (task 8.5).
      const res: any = await lastValueFrom(this.spotifyService.getQueue(this.deviceId), { defaultValue: null });
      this.ngZone.run(() => {
        const queue: any[] = Array.isArray(res?.queue) ? res.queue : [];
        // Keep optimistic state for songs whose vote request is still running.
        this.tracks.set(
          queue.map((t) => {
            const pending = t?.uri ? this.pendingVotes.get(t.uri) : undefined;
            return pending ? { ...t, ...pending } : t;
          }),
        );
        this.cdr?.detectChanges();
      });
    } catch (err) {
      console.error('Fehler beim Laden der Playlist:', err);
    }
  }

  // ---------- Search and add ----------

  /** Searches the party's provider; an empty term goes back to the queue. */
  async search(query?: string) {
    const searchTerm = (query ?? this.searchQuery()).trim();
    if (searchTerm.length < 1) {
      this.results.set([]);
      this.lastSearchedTerm.set('');
      this.searchFailed.set(false);
      this.hiddenHint.set(null);
      return;
    }

    this.isSearching.set(true);
    this.searchFailed.set(false);

    try {
      const res: any = await lastValueFrom(this.trackApi.searchTracks(searchTerm, { guest: true }));
      this.hiddenHint.set(res?.hiddenHint === 'ARTIST' || res?.hiddenHint === 'SOME' ? res.hiddenHint : null);
      const items: any[] = res?.tracks?.items ?? [];
      const seen = new Set<string>();
      this.results.set(
        items
          .filter((track: any) => track?.id && !seen.has(track.id) && seen.add(track.id))
          .slice(0, 25)
      );
      this.lastSearchedTerm.set(searchTerm);
    } catch (err) {
      console.error('Fehler bei der Suche:', err);
      this.searchFailed.set(true);
      this.hiddenHint.set(null);
    } finally {
      this.isSearching.set(false);
      this.cdr?.detectChanges();
    }
  }

  /**
   * Hint below the search field; null when no result was removed or greyed out. Greyed-out
   * results (blocked by a word or song entry) count too, so guests know why a song cannot be
   * added. The artist hint wins because it is the more specific answer to what the guest typed.
   */
  hiddenHintText(): string | null {
    if (this.hiddenHint() === 'ARTIST') return 'Dieser Artist ist vom Gastgeber gesperrt.';
    if (this.hiddenHint() === 'SOME' || this.results().some(track => track?.blocked)) {
      return 'Einige Ergebnisse sind vom Gastgeber gesperrt.';
    }
    return null;
  }

  /** What a result offers; blocked wins, because a blocked song cannot be in the queue anyway. */
  resultState(track: any): ResultState {
    if (track?.blocked) return 'blocked';
    if (track?.uri && this.queueByUri().has(track.uri)) return 'queued';
    return 'addable';
  }

  /** The queue entry behind a queued result, with its live likes. */
  queued(track: any): any {
    return this.queueByUri().get(track?.uri);
  }

  /** Adds a result to the queue and confirms with its rank (guest spec "Guest Add Is Confirmed"). */
  async addToPlaylist(track: any) {
    if (track?.blocked) return; // on the party blacklist — the backend would reject it anyway
    if (this.cooldown.active()) return; // still over the limit — the backend would answer 429 again
    this.addingTrackId = track.id;
    this.cdr?.detectChanges();

    try {
      await lastValueFrom(this.spotifyService.addToPlaylist(track.uri));
      // Reload right away instead of waiting for the SSE event: the result turns
      // into a heart and the rank for the confirmation is known.
      await this.loadPlaylist();
      const rank = this.rankOf().get(track.uri);
      // No action button: the guest already is on the queue page (decision 2026-11-23).
      this.toast?.show(rank ? `Song hinzugefügt – Platz ${rank}` : 'Song hinzugefügt', { durationMs: CONFIRM_MS, icon: 'check' });
    } catch (err: any) {
      console.error('Fehler beim Hinzufügen:', err);
      // The backend sends German messages meant to be shown verbatim, e.g. "Nicht erlaubt."
      // (blacklist, 403), "Song ist schon in der Warteschlange." (409) or
      // "Zu viele Anfragen — bitte kurz warten." (429, more than 20 songs per minute).
      const message = err?.error?.error;
      this.toast?.error(typeof message === 'string' ? message : this.connectionLostText);
      if (err?.status === 429) {
        // Show how long to wait and lock the "+" buttons until then.
        this.cooldown.start(err?.error?.retryAfterSeconds);
      }
    } finally {
      this.addingTrackId = null;
      this.cdr?.detectChanges();
    }
  }

  /** Accessible name of the add button for a result. */
  addLabel(track: any): string {
    if (track?.blocked) return 'Nicht verfügbar'; // stays blocked after the countdown, too
    return this.cooldown.active() ? 'Bitte kurz warten' : 'Song hinzufügen';
  }

  /** "Suche leeren": empties the field, results and status at once and shows the queue again. */
  clearSearch() {
    this.searchQuery.set('');
    this.search('');
    this.cdr?.detectChanges();
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  // ---------- Voting ----------

  /**
   * Toggles the guest's like on a song.
   *
   * 1. Flip heart and count locally right away (optimistic).
   * 2. Send the request; the server's numbers win when it answers.
   * 3. On error restore the snapshot and tell the guest.
   *
   * The order of the list is not changed locally; the next queue reload
   * (vote-updated SSE) brings the server's sorted order.
   */
  async toggleVote(track: any) {
    if (!track?.uri || this.pendingVotes.has(track.uri)) return;

    const before = { likeCount: track.likeCount ?? 0, hasVoted: !!track.hasVoted };
    const optimistic = {
      hasVoted: !before.hasVoted,
      likeCount: Math.max(0, before.likeCount + (before.hasVoted ? -1 : 1)),
    };
    this.pendingVotes.set(track.uri, optimistic);
    this.applyVote(track.uri, optimistic);
    this.poppedUri.set(optimistic.hasVoted ? track.uri : null);
    if (optimistic.hasVoted) this.highlight(track.uri);

    try {
      const res: any = await lastValueFrom(
        this.spotifyService.toggleVote(track.uri, this.deviceId)
      );
      this.pendingVotes.delete(track.uri);
      if (res && typeof res.likeCount === 'number') {
        this.applyVote(track.uri, { likeCount: res.likeCount, hasVoted: !!res.liked });
      }
      if (optimistic.hasVoted) await this.confirmLike(track.uri);
    } catch (err) {
      this.pendingVotes.delete(track.uri);
      this.applyVote(track.uri, before);
      console.error('Fehler beim Abstimmen:', err);
      this.toast?.error('Like hat nicht geklappt – versuch es gleich nochmal.');
    }
  }

  /**
   * "Geliked – jetzt auf Platz N" (guest spec "Guest Like Is Confirmed with the Rank").
   * The rank is read after a fresh queue load, because the server re-sorts by likes;
   * the local list keeps its old order until then.
   */
  private async confirmLike(uri: string) {
    await this.loadPlaylist();
    const rank = this.rankOf().get(uri);
    this.toast?.show(rank ? `Geliked – jetzt auf Platz ${rank}` : 'Geliked', { durationMs: CONFIRM_MS, icon: 'heart' });
  }

  /** Writes like state for one song into the queue (results read it from there) and re-renders. */
  private applyVote(uri: string, state: { likeCount: number; hasVoted: boolean }) {
    this.ngZone.run(() => {
      this.tracks.update((list) => list.map((t) => (t.uri === uri ? { ...t, ...state } : t)));
      this.cdr?.detectChanges();
    });
  }

  /** Marks a row for HIGHLIGHT_MS; a newer like replaces the older highlight. */
  private highlight(uri: string) {
    if (this.highlightTimer) clearTimeout(this.highlightTimer);
    this.highlightedUri.set(uri);
    this.highlightTimer = setTimeout(() => {
      this.highlightTimer = null;
      this.highlightedUri.set(null);
      this.cdr?.detectChanges();
    }, VotingComp.HIGHLIGHT_MS);
  }

  /** Closes the welcome sheet and remembers it for this party on this device. */
  dismissWelcome() {
    if (this.welcomeTimer) {
      clearTimeout(this.welcomeTimer);
      this.welcomeTimer = null;
    }
    const partyId = this.partyService.currentPartyId;
    if (partyId) {
      try { localStorage.setItem(WELCOME_KEY_PREFIX + partyId, '1'); } catch { /* private mode */ }
    }
    this.showWelcome.set(false);
  }

  private readWelcomeSeen(partyId: string): boolean {
    try { return localStorage.getItem(WELCOME_KEY_PREFIX + partyId) === '1'; } catch { return false; }
  }

  /** Accessible name of the vote button, depending on the current state. */
  voteLabel(track: any): string {
    return track?.hasVoted ? 'Like entfernen' : 'Song liken';
  }
}
