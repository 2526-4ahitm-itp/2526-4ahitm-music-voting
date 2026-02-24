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

  constructor(
    private spotifyService: SpotifyWebPlayerService,
    private ngZone: NgZone,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    // Player initialisieren (DeviceID etc.)
    await this.spotifyService.initPlayer();

    // Aktuelle Playlist laden
    this.loadPlaylist();

    // Optional: Polling alle 5s, um die Playlist aktuell zu halten
    setInterval(() => this.loadPlaylist(), 5000);
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
