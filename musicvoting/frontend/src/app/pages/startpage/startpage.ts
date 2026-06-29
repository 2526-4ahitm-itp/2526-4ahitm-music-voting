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

  // Per-track end detection. The Spotify SDK reports `paused && position === 0`
  // both when a track *ends* and briefly while the next track is *loading*. A single
  // shared flag gets confused when the queue source switches rapidly between
  // guest-added and auto-filled songs and can swallow a real end → playback stalls.
  // Instead we key the detection to the playing track's URI: only treat paused/0 as
  // an end after we've actually seen that URI play, and handle each URI's end once.
  private playingUri: string | null = null;
  private sawPlaybackForUri = false;
  private endHandledForUri = false;

  currentPosition = 0;
  currentDuration = 0;
  progressPercent = 0;
  progressInterval: any;
  private queueUpdatesSub?: Subscription;

  private partyId: string | null = null;
  private isAdvancing = false;
  private preparedNextForUri: string | null = null;
  private readonly PREPARE_NEXT_LEAD_MS = 3000;
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

    if (this.partyId) {
      try {
        const res: any = await lastValueFrom(
          this.http.get(`/api/party/${this.partyId}/track/current`)
        );
        const hasTrack = !!res?.track;
        if (hasTrack) {
          this.currentTrack = res.track;
        }
        await this.spotifyService.initPlayer(true);
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
        this.currentDuration = state.duration || 0;
        this.updateProgressPercent();
        this.publishProgress(!!state.paused);

        if (!state.paused) {
          this.startProgressTimer();
        } else {
          this.stopProgressTimer();
        }

        this.maybeAdvanceOnEnd(state);

        this.cd.detectChanges();
      });
    });

    this.queueUpdatesSub = this.spotifyService.getQueueUpdates().subscribe(() => {
      this.loadPlaylist();
      this.ensurePlaybackIfIdle();
    });
  }

  /**
   * Decides whether the current track has ended and autoplay should advance.
   *
   * The decision is keyed to the playing track's URI so it survives rapid
   * transitions between guest-added and auto-filled songs:
   * - a new URI resets the per-track state (and is not yet considered "playing");
   * - any non-paused / position > 0 state confirms that URI is genuinely playing;
   * - a paused, ended state is only acted on once we've seen the URI play, and each
   *   URI's end fires `playNext` exactly once.
   *
   * Called from BOTH the `player_state_changed` event and the 1-second progress poll,
   * so autoplay still advances even if the SDK drops the end event after several rapid
   * track changes (a known cause of "the next song shows but doesn't play"). The
   * per-URI guard makes the two paths idempotent.
   */
  private maybeAdvanceOnEnd(state: any) {
    if (!state) return;
    const uri = state?.track_window?.current_track?.uri ?? null;
    if (uri && uri !== this.playingUri) {
      this.playingUri = uri;
      this.sawPlaybackForUri = false;
      this.endHandledForUri = false;
    }

    if (!state.paused || state.position > 0) {
      this.sawPlaybackForUri = true;
    }

    const duration = state.duration || 0;
    const position = state.position || 0;

    // Advance when the track has ended — paused at position 0 (the SDK resets to 0) or paused
    // right at its duration (the SDK occasionally leaves it there). A mid-song manual pause sits
    // well inside the track, so it is not mistaken for an end. Advancing only at the natural end
    // (not early) keeps the displayed song in sync with the audio.
    const ended = state.paused
      && (position === 0 || (duration > 0 && position >= duration - 2000));

    if (this.sawPlaybackForUri && !this.endHandledForUri && ended) {
      this.endHandledForUri = true;
      this.playNext();
    }
  }

  /**
   * Third, SDK-event-independent end-detection path: once the elapsed position reaches
   * the current track's duration, the song is over — advance.
   *
   * This is the safety net for the worst case behind "the next song shows but stays
   * paused": the Spotify SDK can fail to emit the `player_state_changed` end event AND
   * `getCurrentState()` returns `null` the moment the web player stops being the active
   * device — so both other paths go blind exactly at the end of a track. Elapsed time
   * still gets there (the progress timer interpolates when the SDK is silent). Keyed per
   * URI via `endHandledForUri`, so it advances at most once per track.
   */
  private maybeAdvanceOnElapsed() {
    if (!this.playingUri || !this.sawPlaybackForUri || this.endHandledForUri) return;
    const duration = this.currentDuration || this.currentTrack?.duration_ms || 0;
    if (duration > 0 && this.currentPosition >= duration) {
      this.endHandledForUri = true;
      this.playNext();
    }
  }

  startProgressTimer() {
    if (this.progressInterval) return;
    this.progressInterval = setInterval(async () => {
      // Echte Position aus dem SDK lesen, statt lokal hochzuzählen (verhindert Drift).
      const state = await this.spotifyService.getCurrentState();
      this.ngZone.run(() => {
        let paused = false;
        if (state) {
          this.currentPosition = state.position || 0;
          this.currentDuration = state.duration || this.currentDuration;
          paused = !!state.paused;
          if (paused) {
            this.stopProgressTimer();
          }
        } else {
          // Fallback: SDK liefert keinen Zustand -> lokal interpolieren.
          this.currentPosition += 1000;
        }
        this.updateProgressPercent();
        this.maybePrepareNext(state, paused);
        // Second end-detection path: if the SDK dropped the player_state_changed
        // event at the track end, this poll still catches the ended state and advances.
        this.maybeAdvanceOnEnd(state);
        // Third path: elapsed time reached the duration (covers a null SDK state).
        this.maybeAdvanceOnElapsed();
        this.publishProgress(paused);
        this.cd.detectChanges();
      });
    }, 1000);
  }

  /**
   * ~3 seconds before the current song ends, ask the backend to preload one playlist song (only
   * if the queue is empty) so autoplay continues without a load gap. Fires once per track, so the
   * "up next" list stays empty during most of the song — long enough for guests to add their own
   * songs, which then take precedence over the auto-fill.
   */
  private maybePrepareNext(state: any, paused: boolean) {
    if (paused || !this.partyId) return;
    const uri = state?.track_window?.current_track?.uri ?? this.currentTrack?.uri;
    const duration = state?.duration ?? this.currentDuration;
    const position = state?.position ?? this.currentPosition;
    if (!uri || !duration || duration <= 0) return;
    const remaining = duration - position;
    if (remaining > 0 && remaining <= this.PREPARE_NEXT_LEAD_MS && this.preparedNextForUri !== uri) {
      this.preparedNextForUri = uri;
      this.http.post(`/api/party/${this.partyId}/track/prepare-next`, {})
        .subscribe({ error: () => { /* best-effort preload */ } });
    }
  }

  stopProgressTimer() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  updateProgressPercent() {
    // SDK-Dauer bevorzugen; auf Queue-Metadaten zurückfallen, falls noch kein SDK-Zustand vorliegt.
    const duration = this.currentDuration || this.currentTrack?.duration_ms || 0;
    if (duration > 0) {
      this.progressPercent = Math.min((this.currentPosition / duration) * 100, 100);
    }
  }

  /**
   * Broadcasts the current playback position over the existing SSE bus (via a
   * lightweight POST) so the host dashboard can mirror this progress bar.
   */
  private publishProgress(paused: boolean) {
    if (!this.partyId) return;
    this.http.post(`/api/party/${this.partyId}/track/progress`, {
      position: this.currentPosition,
      duration: this.currentDuration,
      paused,
    }).subscribe({ error: () => { /* progress is best-effort */ } });
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
    if (!this.partyId || this.isAdvancing) return;
    this.isAdvancing = true;
    try {
      const response: any = await lastValueFrom(this.http.post(`/api/party/${this.partyId}/track/next`, {}));
      if (response && response.status === 'empty') {
        console.warn('playNext: queue is empty');
      }
      await this.loadCurrentTrack();
      this.loadPlaylist();
    } catch (err) {
      console.error('Fehler beim Weiterschalten:', err);
      // Reset flag on error so next song can be attempted
      this.isAdvancing = false;
    } finally {
      if (this.isAdvancing) {
        setTimeout(() => { this.isAdvancing = false; }, 3000);
      }
    }
  }

  /**
   * Starts playback when a song is added to an *idle* party.
   *
   * Autoplay otherwise only advances on a track-end transition, which never comes
   * when nothing is playing — so after the queue drains and playback stops, a freshly
   * added song would just sit there paused until someone presses play. This bridges
   * that gap, but ONLY when the backend reports no active track: a song that is
   * currently playing (or intentionally paused by the host) stays untouched, so this
   * never hijacks normal playback or a deliberate pause.
   */
  private async ensurePlaybackIfIdle() {
    if (!this.partyId || this.isAdvancing) return;
    try {
      const current: any = await lastValueFrom(
        this.http.get(`/api/party/${this.partyId}/track/current`)
      );
      if (current?.track) return; // something is already current — don't interfere

      const queueRes: any = await lastValueFrom(this.spotifyService.getQueue());
      const waiting = Array.isArray(queueRes?.queue)
        ? queueRes.queue.filter((t: any) => !t?.isCurrentlyPlaying)
        : [];
      if (waiting.length === 0) return;

      // With nothing playing, advancing starts the first queued song.
      await this.playNext();
    } catch {
      // best-effort — a failed probe must not break anything
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
            if (track?.isCurrentlyPlaying) return false;
            if (currentUri && track?.uri === currentUri) return false;
            if (currentId && track?.id === currentId) return false;
            return true;
          });
          // Reset prepareNext flag when queue changes so autoplay can trigger again
          this.preparedNextForUri = null;
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
    this.spotifyService.disconnectPlayer();
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
          this.ensurePlaybackIfIdle();
        } else if (data?.type === 'track-changed') {
          this.loadCurrentTrack();
          this.loadPlaylist();
        } else if (data?.type === 'party-ended') {
          this.spotifyService.disconnectPlayer().then(() => {
            this.ngZone.run(() => this.router.navigate(['/']));
          });
        }
      } catch {
        // ignore malformed events
      }
    };
  }
}
