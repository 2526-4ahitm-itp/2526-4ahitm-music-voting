import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { TrackService } from '../../services/spotify-tracks';
import { lastValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-host',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host.html',
  styleUrls: ['./host.css']
})
export class Host implements OnInit {
  tracks: any[] = [];
  isSearching = false;

  constructor(
    private spotifyService: SpotifyWebPlayerService,
    private trackApi: TrackService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private router: Router
  ) {}

  async ngOnInit() {
    try {
      const token = await lastValueFrom(this.http.get('/api/spotify/token', { responseType: 'text' }));
      if (token) {
        // already logged in -> go to dashboard
        this.router.navigate(['/dashboard-host']);
      } else {
        // not logged in -> start spotify login flow
        this.loginSpotify();
      }
    } catch (err) {
      // token check failed -> start login flow
      this.loginSpotify();
    }
  }

  /**
   * Suche nach Tracks
   */
  async search(query: string = "Taylor Swift") {
    this.isSearching = true;
    this.tracks = [];
    try {
      const res: any = await lastValueFrom(this.trackApi.searchTracks(query));
      if (res?.tracks?.items) {
        this.tracks = res.tracks.items;
        this.cdr.detectChanges();
      }
    } catch (err) {
      console.error("Fehler bei der Suche:", err);
    } finally {
      this.isSearching = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Spotify Login
   */
  loginSpotify() {
    this.spotifyService.login();
  }


  async addToPlaylist(uri: string) {
    try {
      await lastValueFrom(this.spotifyService.addToPlaylist(uri));
      console.log('Track zur Playlist hinzugefügt:', uri);
    } catch (err) {
      console.error('Fehler beim Hinzufügen zur Playlist:', err);
    }
  }
}
