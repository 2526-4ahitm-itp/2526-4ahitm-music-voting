import {Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, signal, effect, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { TrackService } from '../../services/spotify-tracks';
import { QueueStateService } from '../../services/queue-state';
import { PartyService } from '../../services/party.service';
import { lastValueFrom, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MvCover } from '../../shared/mv-cover';
import { MvIcon } from '../../shared/mv-icon';
import { MvSpinner } from '../../shared/mv-spinner';
import { MvToast } from '../../shared/mv-toast';
import { MvPartyEnded } from '../../shared/mv-party-ended';
import { ToastService } from '../../shared/toast.service';
import { MvThemeToggle } from '../../shared/mv-theme-toggle';
import { MvGuestTabs } from '../../shared/mv-guest-tabs';

@Component({
  selector: 'app-guest',
  standalone: true,
  imports: [CommonModule, FormsModule, MvCover, MvIcon, MvSpinner, MvToast, MvPartyEnded, MvThemeToggle, MvGuestTabs],
  templateUrl: './guest.html',
  // Shared stage look first, page layout second (design D1/D2).
  styleUrls: ['../../shared/stage.css', './guest.css'],
})
/**
 * Guest add/search view. Every step gives feedback (guest spec "Guest Search
 * and Add Give Feedback"): a spinner while searching, "Keine Treffer" for an
 * empty result, a connection message on errors, and a toast after adding.
 */
export class Guest implements OnInit, OnDestroy {
  searchQuery = signal<string>('');
  tracks = signal<any[]>([]);
  isSearching = signal<boolean>(false);
  /** The term of the last finished search; drives the "Keine Treffer" text. */
  lastSearchedTerm = signal<string>('');
  /** Set when the last search failed (network or server error). */
  searchFailed = signal<boolean>(false);
  /** Set when the host ended the party; shows the goodbye screen. */
  partyEnded = signal<boolean>(false);
  /** Shown for search and connection problems. */
  readonly connectionLostText = 'Verbindung verloren – versuch es gleich nochmal.';
  addingTrackId: string | null = null;
  /** Last add rejection from the backend, shown verbatim above the results. */
  addError: string | null = null;
  inQueueUris = new Set<string>();
  private eventSource?: EventSource;
  private queueStateSubscription?: Subscription;
  private partyService = inject(PartyService);
  private toast = inject(ToastService);

  private searchAutoTrigger = toObservable(this.searchQuery).pipe(
    debounceTime(400),
    distinctUntilChanged()
  ).subscribe(query => this.search(query));

  constructor(
    private trackApi: TrackService,
    private spotifyService: SpotifyWebPlayerService,
    private queueState: QueueStateService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.queueStateSubscription = this.queueState.inQueueUris$.subscribe(uris => {
      this.inQueueUris = uris;
      this.cdr.detectChanges();
    });

    // The backend only forwards party events (queue-updated, blacklist-updated, …) to
    // subscribers that name their party, so the party ID must be part of the URL.
    const partyId = this.partyService.currentPartyId;
    const partyQuery = partyId ? `&partyId=${encodeURIComponent(partyId)}` : '';
    this.eventSource = new EventSource(`/api/spotify/events?source=web${partyQuery}`);
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === 'party-ended') {
          // Show the goodbye screen, forget the session and stop talking to this party.
          this.ngZone.run(() => {
            this.eventSource?.close();
            this.partyService.clearParty?.();
            this.partyEnded.set(true);
            this.cdr.detectChanges();
          });
        } else if (data?.type === 'queue-updated') {
          this.queueState.refresh();
        } else if (data?.type === 'blacklist-updated' && this.searchQuery().trim()) {
          // The host blocked or unblocked something: search again so the greyed-out state is current.
          this.search(this.searchQuery());
        }
      } catch { /* ignore malformed events */ }
    };
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
    this.searchAutoTrigger.unsubscribe();
    this.queueStateSubscription?.unsubscribe();
  }

  /** Suche nach Tracks */
  async search(query?: string) {
    const searchTerm = (query ?? this.searchQuery()).trim();
    if (searchTerm.length < 1) {
      this.tracks.set([]);
      this.lastSearchedTerm.set('');
      this.searchFailed.set(false);
      return;
    }

    this.isSearching.set(true);
    this.searchFailed.set(false);

    try {
      const res: any = await lastValueFrom(this.trackApi.searchTracks(searchTerm));

      if (res?.tracks?.items) {
        const seen = new Set<string>();
        this.tracks.set(
          res.tracks.items
            .filter((track: any) => track?.id && !seen.has(track.id))
            .map((track: any) => {
              seen.add(track.id);
              return track;
            })
            .slice(0, 25)
        );
      } else {
        this.tracks.set([]);
      }
      this.lastSearchedTerm.set(searchTerm);
    } catch (err) {
      console.error('Fehler bei der Suche:', err);
      this.searchFailed.set(true);
    } finally {
      this.isSearching.set(false);
    }
  }

  /** Track zur Playlist hinzufügen */
  async addToPlaylist(track: any) {
    if (track?.blocked) return; // on the party blacklist — the backend would reject it anyway
    this.addingTrackId = track.id;
    this.addError = null;
    this.cdr.detectChanges();

    try {
      await lastValueFrom(this.spotifyService.addToPlaylist(track.uri));
      this.queueState.refresh();
      this.toast.show('Song hinzugefügt');
    } catch (err: any) {
      console.error('Fehler beim Hinzufügen:', err);
      // The backend sends German messages meant to be shown verbatim, e.g. "Nicht erlaubt."
      // (blacklist, 403) or "Song ist schon in der Warteschlange." (409).
      const message = err?.error?.error;
      this.addError = typeof message === 'string' ? message : null;
      this.toast.error(this.addError ?? this.connectionLostText);
    } finally {
      this.addingTrackId = null;
      this.cdr.detectChanges();
    }
  }

  trackById(index: number, track: any): string {
    return track.id + '-' + index;
  }

  /** Accessible name of the add button for a result. */
  addLabel(track: any): string {
    if (track?.blocked) return 'Nicht verfügbar';
    if (this.inQueueUris.has(track?.uri)) return 'Schon in der Warteschlange';
    return 'Song hinzufügen';
  }

}
