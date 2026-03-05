import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-startpage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './startpage.html',
  styleUrls: ['./startpage.css'],
})


export class Startpage implements OnInit {
  tracks: any[] = [];
  menuOpen = false;

  currentTrack: any = null;

  constructor(
    private spotifyService: SpotifyWebPlayerService,
    private ngZone: NgZone,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    await this.spotifyService.initPlayer(true);
    this.loadPlaylist();

    this.spotifyService.getPlayerStatus().subscribe(state => {
      if (!state) return;

      this.ngZone.run(() => {
        this.currentTrack = state.track_window.current_track;
      });

      if (state.paused && state.position === 0 && state.track_window.previous_tracks.length > 0) {
        this.playNext();
      }
    });

    setInterval(() => this.loadPlaylist(), 5000);
  }

  formatTime(ms: number): string {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  async playNext() {
    try {
      await lastValueFrom(this.http.post('/api/track/next', {}));
      this.loadPlaylist();
    } catch (err) {
      console.error("Fehler beim Weiterschalten", err);
    }
  }

  /**
   * Aktuelle „Musicvoting party“ Playlist laden
   */
  async loadPlaylist() {
    try {
      const res: any = await lastValueFrom(this.spotifyService.getQueue());

      this.ngZone.run(() => {
        // Res hat das Format { queue: [...] }
        if (Array.isArray(res.queue)) {
          this.tracks = res.queue;
          console.log('Tracks geladen:', this.tracks);
        } else {
          this.tracks = [];
        }
      });
    } catch (err) {
      console.error('Fehler beim Laden der Playlist:', err);
      this.tracks = [];
    }
  }

  trackById(index: number, track: any) {
    return track.id || track.uri || index;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

}
