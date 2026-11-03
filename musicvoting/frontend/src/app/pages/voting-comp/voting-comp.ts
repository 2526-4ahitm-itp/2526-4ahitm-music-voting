import { Component, OnInit, OnDestroy, NgZone, signal, computed, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { lastValueFrom } from 'rxjs';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { Router } from '@angular/router';
import { PartyService } from '../../services/party.service';
import { MvCover } from '../../shared/mv-cover';
import { MvIcon } from '../../shared/mv-icon';
import { MvToast } from '../../shared/mv-toast';
import { ToastService } from '../../shared/toast.service';
import { MvPartyEnded } from '../../shared/mv-party-ended';
import { MvThemeToggle } from '../../shared/mv-theme-toggle';
import { MvGuestTabs } from '../../shared/mv-guest-tabs';

/** localStorage key prefix for "welcome already seen" per party. */
export const WELCOME_KEY_PREFIX = 'mv-welcome-';

@Component({
  selector: 'app-voting-comp',
  standalone: true,
  imports: [FormsModule, MvCover, MvIcon, MvToast, MvPartyEnded, MvThemeToggle, MvGuestTabs],
  templateUrl: './voting-comp.html',
  // Shared stage look first, page layout second (design D1/D2).
  styleUrls: ['../../shared/stage.css', './voting-comp.css'],
})
/**
 * Guest voting view: the queue sorted by likes, with a heart per song.
 *
 * Votes are optimistic and toggleable (voting spec "Optimistic Vote UI",
 * "Likes Are Togglable", "Voted State Is Highlighted, Not Disabled"): a tap
 * flips the heart and count at once, the request runs in the background and
 * the previous state comes back if it fails.
 */
export class VotingComp implements OnInit, OnDestroy {
  tracks = signal<any[]>([]);
  searchQuery = signal<string>('');
  menuOpen = false;

  private eventSource?: EventSource;
  private deviceId: string;

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

  /** Set when the host ended the party; shows the goodbye screen. */
  readonly partyEnded = signal(false);

  filteredTracks = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.tracks();
    return this.tracks().filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.artists[0]?.name.toLowerCase().includes(query)
    );
  });

  constructor(
    private spotifyService: SpotifyWebPlayerService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private partyService: PartyService,
    private toast?: ToastService,
  ) {
    this.deviceId = this.partyService.deviceId;
  }

  ngOnInit() {
    this.loadPlaylist();
    const partyId = this.partyService.currentPartyId;
    this.showWelcome.set(!!partyId && !this.readWelcomeSeen(partyId));
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
          this.loadPlaylist();
        }
      } catch { /* ignore malformed events */ }
    };
  }

  ngOnDestroy() {
    this.eventSource?.close();
  }

  async loadPlaylist() {
    try {
      const res: any = await lastValueFrom(this.spotifyService.getQueue(this.deviceId));
      this.ngZone.run(() => {
        const queue: any[] = Array.isArray(res?.queue) ? res.queue : [];
        // Keep optimistic state for songs whose vote request is still running.
        this.tracks.set(
          queue.map((t) => {
            const pending = t?.uri ? this.pendingVotes.get(t.uri) : undefined;
            return pending ? { ...t, ...pending } : t;
          }),
        );
      });
    } catch (err) {
      console.error('Fehler beim Laden der Playlist:', err);
    }
  }

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

    try {
      const res: any = await lastValueFrom(
        this.spotifyService.toggleVote(track.uri, this.deviceId)
      );
      this.pendingVotes.delete(track.uri);
      if (res && typeof res.likeCount === 'number') {
        this.applyVote(track.uri, { likeCount: res.likeCount, hasVoted: !!res.liked });
      }
    } catch (err) {
      this.pendingVotes.delete(track.uri);
      this.applyVote(track.uri, before);
      console.error('Fehler beim Abstimmen:', err);
      this.toast?.error('Like hat nicht geklappt – versuch es gleich nochmal.');
    }
  }

  /** Writes like state for one song into the list and re-renders. */
  private applyVote(uri: string, state: { likeCount: number; hasVoted: boolean }) {
    this.ngZone.run(() => {
      this.tracks.update((list) => list.map((t) => (t.uri === uri ? { ...t, ...state } : t)));
      this.cdr?.detectChanges();
    });
  }

  /** Closes the welcome sheet and remembers it for this party on this device. */
  dismissWelcome() {
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

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }
}
