import {Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, signal, effect} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { TrackService } from '../../services/spotify-tracks';
import { lastValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {Router, RouterLink} from '@angular/router';

@Component({
  selector: 'app-guest',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './guest.html',
  styleUrls: ['./guest.css'],
})
export class Guest implements OnInit, OnDestroy {
  searchQuery = signal<string>('');
  tracks = signal<any[]>([]);
  isSearching = signal<boolean>(false);
  menuOpen = false;
  addingTrackId: string | null = null;
  private eventSource?: EventSource;

  private searchAutoTrigger = toObservable(this.searchQuery).pipe(
    debounceTime(400),
    distinctUntilChanged()
  ).subscribe(query => this.search(query));

  constructor(
    private trackApi: TrackService,
    private spotifyService: SpotifyWebPlayerService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.eventSource = new EventSource('/api/spotify/events?source=web');
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === 'party-ended') {
          this.ngZone.run(() => this.router.navigate(['/']));
        }
      } catch { /* ignore malformed events */ }
    };
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
    this.searchAutoTrigger.unsubscribe();
  }

  /** Suche nach Tracks */
  async search(query?: string) {
    const searchTerm = (query ?? this.searchQuery()).trim();
    if (searchTerm.length < 1) {
      this.tracks.set([]);
      return;
    }

    this.isSearching.set(true);

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
      }
    } catch (err) {
      console.error('Fehler bei der Suche:', err);
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
      console.log(`${track.name} wurde zur Playlist hinzugefügt`);
    } catch (err) {
      console.error('Fehler beim Hinzufügen:', err);
    } finally {
      this.addingTrackId = null;
      this.cdr.detectChanges();
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  trackById(index: number, track: any): string {
    return track.id + '-' + index;
  }

  goToVoting() {
    this.router.navigate(['/vote']);
  }

  goToAddSongs() {
    this.router.navigate(['/guest']);
  }

}
