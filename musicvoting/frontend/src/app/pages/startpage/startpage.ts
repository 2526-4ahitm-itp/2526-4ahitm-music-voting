import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Subscription } from 'rxjs';
import { PartyService } from '../../services/party.service';

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
  private eventSource?: EventSource;
  private ignoreInitialEndedState = true;

  currentPosition = 0;
  progressPercent = 0;
  progressInterval: any;
  private queueUpdatesSub?: Subscription;

  private partyId: string | null = null;
  pin: string | null = null;
  qrUrl: string | null = null;

  constructor(
    private spotifyService: SpotifyWebPlayerService,
    private ngZone: NgZone,
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private partyService: PartyService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit() {
    const partyIdFromUrl = this.route.snapshot.queryParamMap.get('partyId');
    if (partyIdFromUrl) {
      this.partyService.setCurrentPartyId(partyIdFromUrl);
    }

    this.partyId = this.partyService.currentPartyId;
    this.pin = this.partyService.currentPin;
    if (this.partyId) {
      this.qrUrl = `/api/party/${this.partyId}/qr`;
      try {
        const party = await lastValueFrom(this.partyService.getParty(this.partyId));
        this.pin = party.pin;
      } catch {
        if (!this.pin) {
          this.pin = 'nicht verfügbar';
        }
      }
    }
    this.startLoginEventStream();
    this.ignoreInitialEndedState = true;

    if (this.partyId) {
      try {
        const res: any = await lastValueFrom(
          this.http.get(`/api/party/${this.partyId}/track/current`)
        );
        const isPlaying = !!res?.isPlaying;
        const hasTrack = !!res?.track;
        if (hasTrack) {
          this.currentTrack = res.track;
        }
        const register = !(isPlaying || hasTrack);
        await this.spotifyService.initPlayer(register);
      } catch {
        await this.spotifyService.initPlayer(true);
      }
    } else {
      await this.spotifyService.initPlayer(true);
    }

    this.loadPlaylist();

    this.spotifyService.getPlayerStatus().subscribe(state => {
      if (!state) return;

      this.ngZone.run(() => {
        this.currentPosition = state.position || 0;
        this.updateProgressPercent();

        if (!state.paused) {
          this.startProgressTimer();
        } else {
          this.stopProgressTimer();
        }

        if (!state.paused || state.position > 0) {
          this.ignoreInitialEndedState = false;
        }

        if (
          !this.ignoreInitialEndedState &&
          state.paused &&
          state.position === 0 &&
          state.track_window.previous_tracks.length > 0
        ) {
          this.playNext();
        }

        this.cd.detectChanges();
      });
    });

    this.queueUpdatesSub = this.spotifyService.getQueueUpdates().subscribe(() => {
      this.loadPlaylist();
    });
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

  async loadCurrentTrack() {
    if (!this.partyId) return;
    try {
      const res: any = await lastValueFrom(
        this.http.get(`/api/party/${this.partyId}/track/current`)
      );
      this.ngZone.run(() => {
        this.currentTrack = res?.track ?? null;
        this.cd.detectChanges();
      });
    } catch (err) {
      console.error('Fehler beim Laden des aktuellen Songs:', err);
    }
  }

  async playNext() {
    if (!this.partyId) return;
    try {
      await lastValueFrom(this.http.post(`/api/party/${this.partyId}/track/next`, {}));
      await this.loadCurrentTrack();
      this.loadPlaylist();
    } catch (err) {
      console.error('Fehler beim Weiterschalten', err);
    }
  }

  async loadPlaylist() {
    if (!this.partyId) return;
    try {
      const res: any = await lastValueFrom(this.spotifyService.getQueue());
      this.ngZone.run(() => {
        if (Array.isArray(res.queue)) {
          const currentUri = this.currentTrack?.uri;
          const currentId = this.currentTrack?.id;
          this.tracks = res.queue.filter((track: any) => {
            if (currentUri && track?.uri === currentUri) return false;
            if (currentId && track?.id === currentId) return false;
            return true;
          });
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
    this.queueUpdatesSub?.unsubscribe();
    this.eventSource?.close();
  }

  private startLoginEventStream() {
    this.eventSource?.close();
    const partyQuery = this.partyId ? `&partyId=${encodeURIComponent(this.partyId)}` : '';
    this.eventSource = new EventSource(`/api/spotify/events?source=web${partyQuery}`);
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === 'login-success') {
          window.location.reload();
        } else if (data?.type === 'queue-updated' || data?.type === 'vote-updated') {
          this.loadPlaylist();
        } else if (data?.type === 'track-changed') {
          this.loadCurrentTrack();
          this.loadPlaylist();
        } else if (data?.type === 'party-ended') {
          this.ngZone.run(() => this.router.navigate(['/']));
        }
      } catch {
        // ignore malformed events
      }
    };
  }
}
