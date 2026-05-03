import {Component, OnInit, ChangeDetectorRef, signal, OnDestroy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { TrackService } from '../../services/spotify-tracks';
import { lastValueFrom } from 'rxjs';
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

  private searchAutoTrigger = toObservable(this.searchQuery).pipe(
    debounceTime(400),
    distinctUntilChanged()
  ).subscribe(query => this.search(query));

  constructor(
    private trackApi: TrackService,
    private spotifyService: SpotifyWebPlayerService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnDestroy(): void {
    this.searchAutoTrigger.unsubscribe();
    }

  ngOnInit(): void {}

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
      console.log('Search Response:', res); // Debug

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
}
