import { Component, NgZone, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-host-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host-dashboard.html',
  styleUrl: './host-dashboard.css',
})
export class HostDashboard implements OnInit {
  tracks: any[] = [];
  menuOpen = false;
  currentTrack: any = null;

  partyStarted = false;
  isPaused = false;

  constructor(
    private spotifyService: SpotifyWebPlayerService,
    private ngZone: NgZone,
    private http: HttpClient,
    private cd: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    // 1. Initiale Playlist laden
    await this.loadPlaylist();

    // 2. Status vom Player auf der Startseite abonnieren
    this.spotifyService.getPlayerStatus().subscribe((state) => {
      if (!state) return;

      this.ngZone.run(() => {
        const sdkTrack = state.track_window?.current_track;
        if (sdkTrack) {
          this.partyStarted = true;
          this.isPaused = state.paused;

          this.currentTrack = {
            ...sdkTrack,
            duration_ms: sdkTrack.duration_ms || sdkTrack.duration
          };
        }
        this.cd.detectChanges();
      });
    });

    // 3. Queue-Update-Intervall
    setInterval(() => this.loadPlaylist(), 5000);
  }

  // Hilfsmethode bleibt nur für die Anzeige der statischen Gesamtdauer im HTML
  formatTime(ms: any): string {
    const msec = parseInt(ms, 10);
    if (isNaN(msec) || msec <= 0) return '0:00';
    const totalSeconds = Math.floor(msec / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  async loadPlaylist() {
    try {
      const res: any = await lastValueFrom(this.spotifyService.getQueue());
      this.ngZone.run(() => {
        if (res && Array.isArray(res.queue) && res.queue.length > 0) {
          if (!this.partyStarted) {
            this.currentTrack = res.queue[0];
            this.tracks = res.queue.slice(1);
          } else {
            this.tracks = res.queue;
          }
        }
        this.cd.detectChanges();
      });
    } catch (err) {
      console.error('Fehler Dashboard Playlist:', err);
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  startParty() {
    this.http.post('/api/track/next', {}).subscribe(() => {
      this.partyStarted = true;
      this.loadPlaylist();
    });
  }


}
