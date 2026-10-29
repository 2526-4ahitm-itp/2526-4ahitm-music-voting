import { Component, OnInit, OnDestroy, NgZone, signal, computed, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { lastValueFrom } from 'rxjs';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { Router, RouterLink } from '@angular/router';
import { PartyService } from '../../services/party.service';
import { GuestFeedbackService } from '../../services/guest-feedback';
import { GuestToast } from '../../components/guest-toast/guest-toast';

@Component({
  selector: 'app-voting-comp',
  standalone: true,
  imports: [FormsModule, RouterLink, GuestToast],
  templateUrl: './voting-comp.html',
  styleUrl: './voting-comp.css',
})
export class VotingComp implements OnInit, OnDestroy {
  tracks = signal<any[]>([]);
  searchQuery = signal<string>('');
  /** URIs, deren Like-Zahl gerade kurz hervorgehoben wird (CSS-Klasse `bumped`). */
  bumpedUris = signal<ReadonlySet<string>>(new Set());

  /**
   * URIs mit laufendem Vote-Request. Weitere Taps darauf werden ignoriert, damit ein
   * Doppel-Tap nicht liked und sofort wieder entliked (voting spec: Double-tap).
   */
  private pendingVotes = new Set<string>();

  private eventSource?: EventSource;
  private deviceId: string;

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
    private feedback: GuestFeedbackService
  ) {
    this.deviceId = this.partyService.deviceId;
  }

  ngOnInit() {
    this.loadPlaylist();
    const partyId = this.partyService.currentPartyId;
    const partyQuery = partyId ? `&partyId=${encodeURIComponent(partyId)}` : '';
    this.eventSource = new EventSource(`/api/spotify/events?source=web${partyQuery}`);
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === 'party-ended') {
          this.ngZone.run(() => this.router.navigate(['/']));
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
      const queue: any[] = Array.isArray(res?.queue) ? res.queue : [];
      this.ngZone.run(() => {
        // Ein SSE-Reload während eines laufenden Votes darf den optimistischen Zustand nicht
        // kurz zurücksetzen; die Server-Antwort des Votes gleicht ihn danach ab.
        const current = new Map(this.tracks().map(t => [t.uri, t]));
        this.tracks.set(queue.map(t => {
          const optimistic = this.pendingVotes.has(t.uri) ? current.get(t.uri) : undefined;
          return optimistic ? { ...t, hasVoted: optimistic.hasVoted, likeCount: optimistic.likeCount } : t;
        }));
      });
    } catch (err) {
      console.error('Fehler beim Laden der Playlist:', err);
    }
  }

  /**
   * Like setzen oder zurücknehmen. Herz und Zahl ändern sich sofort (optimistisch),
   * die Antwort des Servers ist danach die Quelle der Wahrheit. Bei einem Fehler wird
   * der vorherige Zustand wiederhergestellt und der Gast bekommt eine Meldung.
   */
  async toggleVote(track: any) {
    if (this.pendingVotes.has(track.uri)) return;
    this.pendingVotes.add(track.uri);

    const before = { hasVoted: !!track.hasVoted, likeCount: track.likeCount ?? 0 };
    this.applyVote(track.uri, !before.hasVoted, before.likeCount + (before.hasVoted ? -1 : 1));

    try {
      const res: any = await lastValueFrom(
        this.spotifyService.toggleVote(track.uri, this.deviceId)
      );
      this.ngZone.run(() => this.applyVote(track.uri, res.liked, res.likeCount));
    } catch (err) {
      console.error('Fehler beim Abstimmen:', err);
      this.ngZone.run(() => {
        this.applyVote(track.uri, before.hasVoted, before.likeCount);
        this.feedback.show('Das Liken hat nicht geklappt. Versuch es nochmal.', 'error');
      });
    } finally {
      this.pendingVotes.delete(track.uri);
    }
  }

  /** Setzt Like-Zustand und -Zahl eines Songs und hebt eine geänderte Zahl kurz hervor. */
  private applyVote(uri: string, hasVoted: boolean, likeCount: number) {
    let countChanged = false;
    this.tracks.update(list =>
      list.map(t => {
        if (t.uri !== uri) return t;
        countChanged = t.likeCount !== likeCount;
        return { ...t, hasVoted, likeCount };
      })
    );
    if (countChanged) this.bump(uri);
  }

  /** Markiert eine URI für die Zähler-Animation und entfernt die Markierung danach wieder. */
  private bump(uri: string) {
    this.bumpedUris.update(set => new Set(set).add(uri));
    setTimeout(() => this.bumpedUris.update(set => {
      const next = new Set(set);
      next.delete(uri);
      return next;
    }), 300);
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }
}
