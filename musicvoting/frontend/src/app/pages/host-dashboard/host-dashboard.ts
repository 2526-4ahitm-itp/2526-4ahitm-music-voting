import { Component, NgZone, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-host-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './host-dashboard.html',
  styleUrl: './host-dashboard.css',
})
export class HostDashboard implements OnInit {
  tracks: any[] = [];
  menuOpen = false;
  currentTrack: any = null;
  private lastTrackUri: string | null = null;
  private autoAdvanceInFlight = false;
  private autoAdvanceCooldownUntil: number | null = null;
  private userPaused = false;

  partyStarted = false;
  isPaused = false;
  private suppressPlaybackStateUntil: number | null = null;
  private readonly SUPPRESSION_MS = 1500;

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

  openPlayer() {
    const url = '/startpage';
    window.open(url, '_blank');
  }

  async loadPlaylist() {
    try {
      const res: any = await lastValueFrom(this.http.get('/api/track/queue'));
      this.ngZone.run(() => {
        if (res && Array.isArray(res.queue)) {
          if (!this.partyStarted) {
            this.currentTrack = res.queue.length > 0 ? res.queue[0] : null;
          }

          const currentUri = this.currentTrack?.uri;
          const currentId = this.currentTrack?.id;
          const filtered = res.queue.filter((track: any) => {
            if (currentUri && track?.uri === currentUri) return false;
            if (currentId && track?.id === currentId) return false;
            return true;
          });
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
        const now = Date.now();
        const suppressed = this.suppressPlaybackStateUntil && now < this.suppressPlaybackStateUntil;

        if (res?.track) {
          const newUri = res.track?.uri ?? null;
          const previousUri = this.lastTrackUri;
          const changed = !!newUri && newUri !== previousUri;
          this.currentTrack = res.track;
          this.partyStarted = true;
          if (newUri) {
            this.lastTrackUri = newUri;
          }
          if (changed) {
            this.loadPlaylist();
          }
          const progressMs = typeof res?.progressMs === 'number' ? res.progressMs : null;
          const shouldAutoAdvance =
            !!newUri && !changed && !res.isPlaying && progressMs === 0 && previousUri === newUri;
          if (shouldAutoAdvance && !this.userPaused) {
            this.triggerAutoNext();
          }
        } else {
          const cooldown = this.autoAdvanceCooldownUntil && now < this.autoAdvanceCooldownUntil;
          if (this.partyStarted && !suppressed && !this.autoAdvanceInFlight && !cooldown) {
            this.currentTrack = null;
          }
        }
        if (!suppressed && typeof res?.isPlaying === 'boolean') {
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
    this.onPlayPause();
  }

  async onPlayPause() {
    try {
      if (!this.partyStarted) {
        this.partyStarted = true;
        this.isPaused = false;
        this.userPaused = false;
        this.suppressPlaybackStateUntil = Date.now() + this.SUPPRESSION_MS;
        setTimeout(() => (this.suppressPlaybackStateUntil = null), this.SUPPRESSION_MS + 100);
        await lastValueFrom(this.http.post('/api/track/start', {}));
        await this.loadCurrentPlayback();
        await this.loadPlaylist();
        return;
      }

      if (this.isPaused) {
        this.isPaused = false; // optimistic UI
        this.userPaused = false;
        this.suppressPlaybackStateUntil = Date.now() + this.SUPPRESSION_MS;
        setTimeout(() => (this.suppressPlaybackStateUntil = null), this.SUPPRESSION_MS + 100);
        await lastValueFrom(this.http.post('/api/track/resume', {}));
      } else {
        this.isPaused = true; // optimistic UI
        this.userPaused = true;
        this.suppressPlaybackStateUntil = Date.now() + this.SUPPRESSION_MS;
        setTimeout(() => (this.suppressPlaybackStateUntil = null), this.SUPPRESSION_MS + 100);
        await lastValueFrom(this.http.post('/api/track/pause', {}));
      }

      await this.loadCurrentPlayback();
    } catch (err) {
      console.error('Fehler Play/Pause:', err);
    }
  }

  async onRestartCurrent() {
    if (!this.currentTrack?.uri) return;

    try {
      this.partyStarted = true;
      this.isPaused = false;
      this.userPaused = false;
      this.suppressPlaybackStateUntil = Date.now() + this.SUPPRESSION_MS;
      setTimeout(() => (this.suppressPlaybackStateUntil = null), this.SUPPRESSION_MS + 100);
      await lastValueFrom(this.http.put('/api/track/play', { uri: this.currentTrack.uri }));
      await this.loadCurrentPlayback();
      await this.loadPlaylist();
    } catch (err) {
      console.error('Fehler beim Neustart des Songs:', err);
    }
  }

  async onSkip() {
    await this.playNextTrack();
  }

  async onDeleteTrack(track: any) {
    if (!track?.uri) return;

    try {
      await lastValueFrom(this.http.delete('/api/track/remove', { body: { uri: track.uri } }));
      await this.loadPlaylist();
    } catch (err) {
      console.error('Fehler beim Loeschen des Songs:', err);
    }
  }

  private async triggerAutoNext() {
    await this.playNextTrack();
  }

  private async playNextTrack() {
    const now = Date.now();
    const cooldown = this.autoAdvanceCooldownUntil && now < this.autoAdvanceCooldownUntil;
    if (this.autoAdvanceInFlight || cooldown) return;

    this.autoAdvanceInFlight = true;
    this.autoAdvanceCooldownUntil = now + 4000;
    try {
      this.partyStarted = true;
      this.isPaused = false;
      this.userPaused = false;
      const res: any = await lastValueFrom(this.http.post('/api/track/next', {}));
      if (res?.status === 'empty') {
        this.ngZone.run(() => {
          this.currentTrack = null;
          this.lastTrackUri = null;
          this.partyStarted = false;
          this.isPaused = false;
          this.userPaused = false;
          this.tracks = [];
          this.cd.detectChanges();
        });
        return;
      }

      await this.loadCurrentPlayback();
      await this.loadPlaylist();
    } catch (err) {
      console.error('Fehler beim Auto-Next:', err);
    } finally {
      this.autoAdvanceInFlight = false;
    }
  }
}
