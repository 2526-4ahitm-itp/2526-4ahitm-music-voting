import {Component, OnInit, ChangeDetectorRef, signal, OnDestroy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { TrackService } from '../../services/spotify-tracks';
import { QueueStateService } from '../../services/queue-state';
import { lastValueFrom, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {toObservable} from '@angular/core/rxjs-interop';
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';

@Component({
  selector: 'app-search-host',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './search-host.html',
  styleUrls: ['./search-host.css'],
})
export class SearchHost implements OnInit, OnDestroy{
  menuOpen = false;
  tracks = signal<any[]>([]);
  searchQuery = signal<string>('');
  isSearching = signal<boolean>(false);
  addingTrackId: string | null = null;
  /** Last add rejection from the backend, shown verbatim above the results. */
  addError: string | null = null;
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
    private router: Router
  ) {}

  ngOnDestroy(): void {
    this.searchAutoTrigger.unsubscribe();
    this.queueStateSubscription?.unsubscribe();
    this.eventSource?.close();
    }

  ngOnInit(): void {
    this.queueStateSubscription = this.queueState.inQueueUris$.subscribe(uris => {
      this.inQueueUris = uris;
      this.cdr.detectChanges();
    });

    this.eventSource = new EventSource('/api/spotify/events?source=web');
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === 'queue-updated') {
          this.queueState.refresh();
        }
      } catch { /* ignore malformed events */ }
    };
  }

  /** Suche nach Tracks */
  async search(query?: string) {
    const searchTerm = query || this.searchQuery().trim();
    if (searchTerm.length < 1) {
      this.tracks.set([]);
      this.isSearching.set(false);
      return;
    }

    this.isSearching.set(true);

    try {
      const res: any = await lastValueFrom(this.trackApi.searchTracks(searchTerm));

      if (res?.tracks?.items) {
        const seen = new Set<string>();
        const uniqueTracks = res.tracks.items
          .filter((track: any) => track?.id && !seen.has(track.id))
          .map((track: any) => {
            seen.add(track.id);
            return track;
          })
          .slice(0, 25);

        this.tracks.set(uniqueTracks);
      } else {
        this.tracks.set([]);
      }
    } catch (err) {
      console.error('Fehler bei der Suche:', err);
      this.tracks.set([]);
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
    } catch (err: any) {
      console.error('Fehler beim Hinzufügen:', err);
      // The backend sends German messages meant to be shown verbatim, e.g. "Nicht erlaubt."
      // (blacklist, 403) or "Song ist schon in der Warteschlange." (409).
      const message = err?.error?.error;
      this.addError = typeof message === 'string' ? message : null;
    } finally {
      this.addingTrackId = null;
      this.cdr.detectChanges();
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }
}
