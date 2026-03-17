import { Component, NgZone, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  private lastTrackUri: string | null = null;

  partyStarted = false;
  isPaused = false;

  constructor(
    private ngZone: NgZone,
    private http: HttpClient,
    private cd: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadCurrentPlayback();
    await this.loadPlaylist();

    setInterval(() => this.loadCurrentPlayback(), 5000);
    setInterval(() => this.loadPlaylist(), 10000);
  }

  async loadPlaylist() {
    try {
      const res: any = await lastValueFrom(this.http.get('/api/track/queue'));
      this.ngZone.run(() => {
        if (res && Array.isArray(res.queue)) {
          const currentUri = this.currentTrack?.uri;
          const currentId = this.currentTrack?.id;
          const filtered = res.queue.filter((track: any) => {
            if (currentUri && track?.uri === currentUri) return false;
            if (currentId && track?.id === currentId) return false;
            return true;
          });

          // Fallback: if backend has no current playing, show first in queue as current
          if (!this.currentTrack && res.queue.length > 0) {
            this.currentTrack = res.queue[0];
          }
          this.tracks = filtered;
        }
        this.cd.detectChanges();
      });
    } catch (err) {
      console.error('Fehler Dashboard Playlist:', err);
    }
  }

  async loadCurrentPlayback() {
    try {
      const res: any = await lastValueFrom(this.http.get('/api/track/current'));
      this.ngZone.run(() => {
        if (res?.track) {
          const newUri = res.track?.uri ?? null;
          const changed = newUri && newUri !== this.lastTrackUri;
          this.currentTrack = res.track;
          this.partyStarted = true;
          if (newUri) {
            this.lastTrackUri = newUri;
          }
          if (changed) {
            this.loadPlaylist();
          }
        }
        if (typeof res?.isPlaying === 'boolean') {
          this.isPaused = !res.isPlaying;
        }
        this.cd.detectChanges();
      });
    } catch (err) {
      console.error('Fehler beim Laden des aktuellen Songs:', err);
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  startParty() {
    this.http.post('/api/track/next', {}).subscribe(() => {
      this.partyStarted = true;
      this.loadCurrentPlayback().then(() => this.loadPlaylist());
    });
  }
}
