import {Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, signal, effect} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { TrackService } from '../../services/spotify-tracks';
import { QueueStateService } from '../../services/queue-state';
import { lastValueFrom, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import { GuestFeedbackService, addErrorMessage } from '../../services/guest-feedback';
import { GuestToast } from '../../components/guest-toast/guest-toast';

@Component({
  selector: 'app-guest',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, GuestToast],
  templateUrl: './guest.html',
  styleUrls: ['./guest.css'],
})
export class Guest implements OnInit, OnDestroy {
  searchQuery = signal<string>('');
  tracks = signal<any[]>([]);
  isSearching = signal<boolean>(false);
  /** true, wenn die letzte abgeschlossene Suche keine Treffer hatte („Keine Songs gefunden.“). */
  noResults = signal<boolean>(false);
  addingTrackId: string | null = null;
  inQueueUris = new Set<string>();
  private eventSource?: EventSource;
  private queueStateSubscription?: Subscription;

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
    private ngZone: NgZone,
    private feedback: GuestFeedbackService
  ) {}

  ngOnInit(): void {
    this.queueStateSubscription = this.queueState.inQueueUris$.subscribe(uris => {
      this.inQueueUris = uris;
      this.cdr.detectChanges();
    });

    this.eventSource = new EventSource('/api/spotify/events?source=web');
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === 'party-ended') {
          this.ngZone.run(() => this.router.navigate(['/']));
        } else if (data?.type === 'queue-updated') {
          this.queueState.refresh();
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
    this.noResults.set(false);
    if (searchTerm.length < 1) {
      this.tracks.set([]);
      return;
    }

    this.isSearching.set(true);

    try {
      const res: any = await lastValueFrom(this.trackApi.searchTracks(searchTerm));
      const items: any[] = res?.tracks?.items ?? [];
      const seen = new Set<string>();
      this.tracks.set(
        items
          .filter((track: any) => track?.id && !seen.has(track.id))
          .map((track: any) => {
            seen.add(track.id);
            return track;
          })
          .slice(0, 25)
      );
      this.noResults.set(this.tracks().length === 0);
    } catch (err) {
      console.error('Fehler bei der Suche:', err);
      this.feedback.show('Die Suche hat nicht geklappt. Versuch es nochmal.', 'error');
    } finally {
      this.isSearching.set(false);
    }
  }

  /** Track zur Playlist hinzufügen */
  async addToPlaylist(track: any) {
    this.addingTrackId = track.id;
    this.cdr.detectChanges();

    try {
      await lastValueFrom(this.spotifyService.addToPlaylist(track.uri));
      this.queueState.refresh();
      this.feedback.show(`„${track.name}“ ist in der Warteschlange.`);
    } catch (err) {
      console.error('Fehler beim Hinzufügen:', err);
      // 409 (schon in der Warteschlange) und 429 (zu viele Anfragen) bekommen ihre Spec-Texte.
      this.feedback.show(addErrorMessage(err), 'error');
    } finally {
      this.addingTrackId = null;
      this.cdr.detectChanges();
    }
  }
}
