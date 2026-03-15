import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
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
export class Startpage implements OnInit, OnDestroy {
  tracks: any[] = [];
  menuOpen = false;
  currentTrack: any = null;

  // Progress bar & Zeit Logik
  currentPosition = 0;
  progressPercent = 0;
  progressInterval: any;

  constructor(
    private spotifyService: SpotifyWebPlayerService,
    private ngZone: NgZone,
    private http: HttpClient,
    private cd: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.spotifyService.initPlayer();
    this.loadPlaylist();

    this.spotifyService.getPlayerStatus().subscribe(state => {
      if (!state) return;

      this.ngZone.run(() => {
        const sdkTrack = state.track_window.current_track;
        this.currentTrack = {
          ...sdkTrack,
          duration_ms: sdkTrack.duration_ms || sdkTrack.duration
        };

        this.currentPosition = state.position || 0;
        this.updateProgressPercent();

        if (!state.paused) {
          this.startProgressTimer();
        } else {
          this.stopProgressTimer();
        }

        if (state.paused && state.position === 0 && state.track_window.previous_tracks.length > 0) {
          this.playNext();
        }

        this.cd.detectChanges();
      });
    });

    setInterval(() => this.loadPlaylist(), 5000);
  }

  startProgressTimer() {
    if (this.progressInterval) return;
    this.progressInterval = setInterval(() => {
      this.currentPosition += 1000;
      this.updateProgressPercent();
      this.cd.detectChanges();
    }, 1000);
  }

  stopProgressTimer() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  updateProgressPercent() {
    const duration = this.currentTrack?.duration_ms || 0;
    if (duration > 0) {
      this.progressPercent = Math.min((this.currentPosition / duration) * 100, 100);
    }
  }

  formatTime(ms: number): string {
    if (!ms || isNaN(ms)) return '0:00';
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

  async loadPlaylist() {
    try {
      const res: any = await lastValueFrom(this.spotifyService.getQueue());
      this.ngZone.run(() => {
        if (Array.isArray(res.queue)) {
          this.tracks = res.queue;
        }
      });
    } catch (err) {
      console.error('Fehler beim Laden der Playlist:', err);
    }
  }

  trackById(index: number, track: any) {
    return track.id || track.uri || index;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  ngOnDestroy() {
    this.stopProgressTimer();
  }
}
