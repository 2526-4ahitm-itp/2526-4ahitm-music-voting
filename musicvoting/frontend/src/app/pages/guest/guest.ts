import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { TrackService } from '../../services/spotify-tracks';
import { lastValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-guest',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './guest.html',
  styleUrls: ['./guest.css'],
})
export class Guest implements OnInit {
  tracks: any[] = [];
  searchQuery: string = '';
  isSearching = false;
  addingTrackId: string | null = null;

  constructor(
    private trackApi: TrackService,
    private spotifyService: SpotifyWebPlayerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {}

  /** Suche nach Tracks */
  async search(query?: string) {
    const searchTerm = query || this.searchQuery?.trim();
    if (!searchTerm) return;

    this.isSearching = true;
    this.tracks = [];
    this.cdr.detectChanges();

    try {
      const res: any = await lastValueFrom(this.trackApi.searchTracks(searchTerm));
      console.log('Search Response:', res); // Debug

      if (res?.tracks?.items?.length) {
        const seen = new Set<string>();
        this.tracks = res.tracks.items
          .filter((track: any) => track?.id && !seen.has(track.id) && seen.add(track.id))
          .slice(0, 10);

      }
    } catch (err) {
      console.error('Fehler bei der Suche:', err);
    } finally {
      this.isSearching = false;
      this.cdr.detectChanges();
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

  trackById(index: number, track: any): string {
    return track.id + '-' + index;
  }

}
