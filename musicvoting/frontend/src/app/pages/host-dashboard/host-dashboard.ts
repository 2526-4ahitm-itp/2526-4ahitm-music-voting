import { Component, NgZone, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, ElementRef, Injector, afterNextRender, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MvHostMenu } from '../../shared/mv-host-menu';
import { MvCover } from '../../shared/mv-cover';
import { MvIcon } from '../../shared/mv-icon';
import { MvThemeToggle } from '../../shared/mv-theme-toggle';
import { MvOtherDeviceSteps } from '../../shared/mv-other-device-steps';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription, lastValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TrackService } from '../../services/spotify-tracks';
import { PartyService } from '../../services/party.service';
import { SpotifyWebPlayerService } from '../../services/spotify-player';

@Component({
  selector: 'app-host-dashboard',
  standalone: true,
  imports: [CommonModule, MvHostMenu, MvCover, MvIcon, MvThemeToggle, MvOtherDeviceSteps],
  templateUrl: './host-dashboard.html',
  // Shared stage look first, page layout second (design D1/D2).
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../../shared/stage.css', './host-dashboard.css'],
})
/**
 * Host dashboard: playback, the whole queue and the party actions in one place. It is
 * the only host view of the queue (host spec "Host Dashboard Shows the Whole Queue on
 * Every Screen"): the former voting and search pages are one search field here that works
 * like the guest page, and the host likes songs like a guest (host spec "Host Can Like Songs").
 */
export class HostDashboard implements OnInit, OnDestroy {
  tracks: any[] = [];

  // ---------- Search state (host spec "Host Searches and Adds Songs on the Dashboard") ----------
  /** Text in the search field; while it is non-empty the results replace the queue. */
  searchQuery = '';
  /** Provider results for the last search (max. 25, de-duplicated). */
  results: any[] = [];
  isSearching = false;
  searchFailed = false;
  /** Term of the last finished search, for "Keine Treffer für „…“". */
  lastSearchedTerm = '';
  addingTrackId: string | null = null;
  /** Last add rejection from the backend, shown verbatim (e.g. "Nicht erlaubt."). */
  addError: string | null = null;
  /** Typed terms, debounced so one request goes out per pause instead of one per key. */
  private readonly searchTerms = new Subject<string>();
  private readonly searchSub = this.searchTerms
    .pipe(debounceTime(400), distinctUntilChanged())
    .subscribe((term) => this.search(term));

  /**
   * URIs whose like request is still running: a second tap waits, and a queue reload
   * meanwhile keeps the optimistic state instead of flipping it back (as on the guest page).
   */
  private readonly pendingVotes = new Map<string, { likeCount: number; hasVoted: boolean }>();
  menuOpen = false;
  currentTrack: any = null;
  currentPosition = 0;
  currentDuration = 0;
  progressPercent = 0;
  private lastTrackUri: string | null = null;
  private autoAdvanceInFlight = false;
  private autoAdvanceCooldownUntil: number | null = null;
  private userPaused = false;

  partyStarted = false;
  isPaused = false;
  deviceActive = true;

  get controlsDisabled(): boolean {
    return !this.deviceActive || (!this.currentTrack && this.tracks.length === 0);
  }
  private suppressPlaybackStateUntil: number | null = null;
  private readonly SUPPRESSION_MS = 1500;

  partyId: string | null = null;
  pin: string | null = null;
  hostPin: string | null = null;
  /**
   * The Gastgeber-PIN starts hidden on every load ("•••••" + "Anzeigen"), so it is
   * not readable by guests around the host's screen (host spec, task 8.4). Not
   * persisted on purpose: a revealed PIN should not stay revealed next time.
   */
  hostPinVisible = false;
  qrUrl: string | null = null;
  confirmEnd = false;
  private sseSource?: EventSource;
  private queueUpdatesSub?: Subscription;

  // Optional: the unit specs build the class without a host element.
  private readonly host = inject(ElementRef<HTMLElement>, { optional: true });
  private readonly injector = inject(Injector);
  /** Button that opened the current confirm; focus goes back there when it closes. */
  private confirmTrigger: HTMLElement | null = null;

  constructor(
    private ngZone: NgZone,
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private partyService: PartyService,
    private spotifyService: SpotifyWebPlayerService,
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
    this.hostPin = this.partyService.currentHostPin;
    this.cd.detectChanges();

    if (this.partyId) {
      this.qrUrl = `/api/party/${this.partyId}/qr`;
      try {
        const party = await lastValueFrom(this.partyService.getParty(this.partyId));
        this.pin = party.pin;
        if (party.hostPin) { this.hostPin = party.hostPin; }
        this.cd.detectChanges();
      } catch {
        if (!this.pin) {
          this.pin = 'nicht verfügbar';
          this.cd.detectChanges();
        }
      }
      this.startPartyEndedStream();
    }

    await this.loadCurrentPlayback();
    await this.loadPlaylist();
    this.queueUpdatesSub = this.spotifyService.getQueueUpdates().subscribe(() => {
      this.loadPlaylist();
    });
  }

  ngOnDestroy() {
    this.searchSub.unsubscribe();
    this.queueUpdatesSub?.unsubscribe();
    this.sseSource?.close();
  }

  private get partyBase(): string {
    return `/api/party/${this.partyId}`;
  }

  private startPartyEndedStream() {
    this.sseSource?.close();
    const partyQuery = this.partyId ? `&partyId=${encodeURIComponent(this.partyId)}` : '';
    this.sseSource = new EventSource(`/api/spotify/events?source=web${partyQuery}`);
    this.sseSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === 'progress') {
          this.applyProgress(data.payload);
        } else if (data?.type === 'queue-updated' || data?.type === 'vote-updated') {
          this.loadPlaylist();
        } else if (data?.type === 'track-changed') {
          this.loadCurrentPlayback();
          this.loadPlaylist();
        } else if (data?.type === 'party-ended' && data?.payload?.partyId === this.partyId) {
          this.ngZone.run(() => {
            this.partyService.clearParty();
            this.router.navigate(['/']);
          });
        }
      } catch { /* ignore malformed events */ }
    };
  }

  // ---------- Search and add ----------

  get isSearchMode(): boolean {
    return this.searchQuery.trim().length > 0;
  }

  /** Field input: show the new text at once, search after the debounce. */
  onSearchInput(value: string) {
    this.searchQuery = value;
    if (!value.trim()) this.clearResults();
    this.searchTerms.next(value);
    this.cd.detectChanges();
  }

  /** "Suche leeren": empties the field and shows the queue again in one step. */
  clearSearch() {
    this.searchQuery = '';
    this.clearResults();
    this.searchTerms.next('');
    this.cd.detectChanges();
  }

  private clearResults() {
    this.results = [];
    this.lastSearchedTerm = '';
    this.searchFailed = false;
    this.addError = null;
  }

  /**
   * Searches the party's provider. Without guest mode, so banned-artist songs stay in the
   * results, greyed out with "Nicht erlaubt." — the host should see what is blocked.
   * TrackService is looked up lazily, so the unit specs can build the class without HTTP.
   */
  async search(query?: string) {
    const term = (query ?? this.searchQuery).trim();
    if (!term) {
      this.clearResults();
      this.cd.detectChanges();
      return;
    }
    this.isSearching = true;
    this.searchFailed = false;
    this.cd.detectChanges();
    try {
      const res: any = await lastValueFrom(this.injector.get(TrackService).searchTracks(term));
      const seen = new Set<string>();
      this.results = (res?.tracks?.items ?? [])
        .filter((t: any) => t?.id && !seen.has(t.id) && seen.add(t.id))
        .slice(0, 25);
      this.lastSearchedTerm = term;
    } catch (err) {
      console.error('Fehler bei der Suche:', err);
      this.searchFailed = true;
      this.results = [];
    } finally {
      this.isSearching = false;
      this.cd.detectChanges();
    }
  }

  /** Queue entry per URI, including the playing song, for the result states. */
  private queueEntry(uri: string | undefined): any {
    if (!uri) return undefined;
    if (this.currentTrack?.uri === uri) return this.currentTrack;
    return this.tracks.find((t) => t?.uri === uri);
  }

  /** What a result offers: greyed out, a like (already queued) or "+". */
  resultState(track: any): 'blocked' | 'queued' | 'addable' {
    if (track?.blocked) return 'blocked';
    return this.queueEntry(track?.uri) ? 'queued' : 'addable';
  }

  /** The queue entry behind a queued result, so the result shows its live likes. */
  queued(track: any): any {
    return this.queueEntry(track?.uri);
  }

  /** Adds a result; the reloaded queue turns its "+" into the like button. */
  async addToPlaylist(track: any) {
    if (track?.blocked) return; // on the party blacklist — the backend would reject it anyway
    this.addingTrackId = track.id;
    this.addError = null;
    this.cd.detectChanges();
    try {
      await lastValueFrom(this.spotifyService.addToPlaylist(track.uri));
      await this.loadPlaylist();
    } catch (err: any) {
      console.error('Fehler beim Hinzufügen:', err);
      // German backend messages such as "Nicht erlaubt." or "Song ist schon in der
      // Warteschlange." are meant to be shown as they are.
      const message = err?.error?.error;
      this.addError = typeof message === 'string' ? message : 'Verbindung verloren – versuch es gleich nochmal.';
    } finally {
      this.addingTrackId = null;
      this.cd.detectChanges();
    }
  }

  // ---------- Host likes (host spec "Host Can Like Songs") ----------

  /** Accessible name of the like button, depending on the current state. */
  voteLabel(track: any): string {
    return track?.hasVoted ? 'Like entfernen' : 'Song liken';
  }

  /**
   * Toggles the host's like, optimistic like on the guest page: flip at once, the server's
   * numbers win when it answers, the old state comes back if it fails. The host votes with
   * this device's id, so a host like counts exactly like a guest like.
   */
  async toggleVote(track: any) {
    if (!track?.uri || track.isCurrentlyPlaying || this.pendingVotes.has(track.uri)) return;
    const before = { likeCount: track.likeCount ?? 0, hasVoted: !!track.hasVoted };
    const optimistic = {
      hasVoted: !before.hasVoted,
      likeCount: Math.max(0, before.likeCount + (before.hasVoted ? -1 : 1)),
    };
    this.pendingVotes.set(track.uri, optimistic);
    this.applyVote(track.uri, optimistic);
    try {
      const res: any = await lastValueFrom(this.spotifyService.toggleVote(track.uri, this.partyService.deviceId));
      this.pendingVotes.delete(track.uri);
      if (res && typeof res.likeCount === 'number') {
        this.applyVote(track.uri, { likeCount: res.likeCount, hasVoted: !!res.liked });
      }
    } catch (err) {
      this.pendingVotes.delete(track.uri);
      this.applyVote(track.uri, before);
      console.error('Fehler beim Abstimmen:', err);
    }
  }

  private applyVote(uri: string, state: { likeCount: number; hasVoted: boolean }) {
    this.tracks = this.tracks.map((t) => (t?.uri === uri ? { ...t, ...state } : t));
    this.cd.detectChanges();
  }

  // ---------- Focus in the confirms (host spec "Dashboard Confirmations Manage Focus") ----------

  /** After the confirm is rendered, focus its marked button (`data-autofocus`). */
  private focusConfirm() {
    afterNextRender(() => {
      (this.host?.nativeElement.querySelector('.confirm [data-autofocus]') as HTMLElement | null)?.focus();
    }, { injector: this.injector });
    this.cd.detectChanges();
  }

  /** Closing without a change: back to the button that opened the confirm. */
  private restoreFocus() {
    const trigger = this.confirmTrigger;
    this.confirmTrigger = null;
    if (trigger?.isConnected) trigger.focus();
  }

  /** After a removal the row (and its button) is gone: focus the queue heading instead of <body>. */
  private focusQueueHeading() {
    this.confirmTrigger = null;
    (this.host?.nativeElement.querySelector('#queue-title') as HTMLElement | null)?.focus();
  }

  /** "Party beenden": opens the question with the focus on "Abbrechen". */
  requestEnd(event?: Event) {
    this.confirmTrigger = (event?.currentTarget as HTMLElement) ?? null;
    this.confirmEnd = true;
    this.focusConfirm();
  }

  /** "Abbrechen" / Escape on the end question. The trigger is rendered again once it closes. */
  cancelEnd() {
    this.confirmEnd = false;
    this.cd.detectChanges();
    // The "Party beenden" button replaced the question in the DOM, so look it up fresh.
    const endBtn = this.host?.nativeElement.querySelector('.action.end') as HTMLElement | null;
    this.confirmTrigger = null;
    endBtn?.focus();
  }

  openPlayer() {
    window.open('/startpage', '_blank');
  }

  async loadPlaylist() {
    if (!this.partyId) return;
    try {
      // With the device id the server reports which songs this host already liked (hasVoted).
      const deviceId = this.partyService.deviceId;
      const query = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : '';
      const res: any = await lastValueFrom(this.http.get(`${this.partyBase}/track/queue${query}`));
      this.ngZone.run(() => {
        if (res && Array.isArray(res.queue)) {
          if (!this.partyStarted) {
            this.currentTrack = res.queue.length > 0 ? res.queue[0] : null;
            this.currentPosition = 0;
            this.currentDuration = 0;
            this.updateProgressPercent();
          }
          const currentUri = this.currentTrack?.uri;
          const currentId = this.currentTrack?.id;
          const filtered = res.queue.filter((track: any) => {
            if (track?.isCurrentlyPlaying) return false;
            if (currentUri && track?.uri === currentUri) return false;
            if (currentId && track?.id === currentId) return false;
            return true;
          });
          // Keep the optimistic state of likes whose request is still running.
          this.tracks = filtered.map((t: any) => {
            const pending = t?.uri ? this.pendingVotes.get(t.uri) : undefined;
            return pending ? { ...t, ...pending } : t;
          });
        }
        this.cd.detectChanges();
      });
    } catch (err) {
      console.error('Fehler Dashboard Playlist:', err);
    }
  }

  async loadCurrentPlayback() {
    if (!this.partyId) return;
    try {
      const res: any = await lastValueFrom(this.http.get(`${this.partyBase}/track/current`));
      this.ngZone.run(() => {
        const now = Date.now();
        const suppressed = this.suppressPlaybackStateUntil && now < this.suppressPlaybackStateUntil;

        this.deviceActive = typeof res?.deviceActive === 'boolean' ? res.deviceActive : true;

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

  /**
   * Mirrors the /startpage player's progress bar from a "progress" SSE event.
   * The payload values arrive as strings (LoginEvent payload is Map<String,String>).
   */
  private applyProgress(payload: any) {
    if (!payload) return;
    this.ngZone.run(() => {
      this.currentPosition = Number(payload.position) || 0;
      this.currentDuration = Number(payload.duration) || 0;
      this.updateProgressPercent();

      const now = Date.now();
      const suppressed = this.suppressPlaybackStateUntil && now < this.suppressPlaybackStateUntil;
      if (!suppressed && typeof payload.paused === 'string') {
        this.isPaused = payload.paused === 'true';
        this.userPaused = this.isPaused;
      }

      this.cd.detectChanges();
    });
  }

  updateProgressPercent() {
    const duration = this.currentDuration || this.currentTrack?.duration_ms || 0;
    this.progressPercent = duration > 0
      ? Math.min((this.currentPosition / duration) * 100, 100)
      : 0;
  }

  formatTime(ms: number): string {
    if (!ms || isNaN(ms)) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  startParty() {
    this.onPlayPause();
  }

  async onPlayPause() {
    if (!this.partyId) return;
    try {
      if (!this.partyStarted) {
        this.partyStarted = true;
        this.isPaused = false;
        this.userPaused = false;
        this.suppressPlaybackStateUntil = Date.now() + this.SUPPRESSION_MS;
        setTimeout(() => (this.suppressPlaybackStateUntil = null), this.SUPPRESSION_MS + 100);
        await lastValueFrom(this.http.post(`${this.partyBase}/track/start`, {}));
        await this.loadCurrentPlayback();
        await this.loadPlaylist();
        return;
      }

      if (this.isPaused) {
        this.isPaused = false;
        this.userPaused = false;
        this.suppressPlaybackStateUntil = Date.now() + this.SUPPRESSION_MS;
        setTimeout(() => (this.suppressPlaybackStateUntil = null), this.SUPPRESSION_MS + 100);
        await lastValueFrom(this.http.post(`${this.partyBase}/track/resume`, {}));
      } else {
        this.isPaused = true;
        this.userPaused = true;
        this.suppressPlaybackStateUntil = Date.now() + this.SUPPRESSION_MS;
        setTimeout(() => (this.suppressPlaybackStateUntil = null), this.SUPPRESSION_MS + 100);
        await lastValueFrom(this.http.post(`${this.partyBase}/track/pause`, {}));
      }

      await this.loadCurrentPlayback();
    } catch (err) {
      console.error('Fehler Play/Pause:', err);
    }
  }

  async onRestartCurrent() {
    if (!this.currentTrack?.uri || !this.partyId) return;
    try {
      this.partyStarted = true;
      this.isPaused = false;
      this.userPaused = false;
      this.suppressPlaybackStateUntil = Date.now() + this.SUPPRESSION_MS;
      setTimeout(() => (this.suppressPlaybackStateUntil = null), this.SUPPRESSION_MS + 100);
      await lastValueFrom(this.http.put(`${this.partyBase}/track/play`, { uri: this.currentTrack.uri }));
      await this.loadCurrentPlayback();
      await this.loadPlaylist();
    } catch (err) {
      console.error('Fehler beim Neustart des Songs:', err);
    }
  }

  async onSkip() {
    await this.playNextTrack();
  }

  /**
   * URI of the queued song whose removal question is open, or null. One string instead of a
   * flag per row, so only one question can be open at a time (host spec "Host Removes Songs
   * from Queue").
   */
  confirmRemoveUri: string | null = null;

  /**
   * Opens the removal question ("Entfernen und sperren" / "Nur entfernen" / "Abbrechen") instead of
   * removing right away: removing and blocking cannot be undone, and this is the one place
   * where the host decides whether the song may come back (design D7).
   */
  requestRemove(track: any, event?: Event) {
    if (!track?.uri) return;
    this.confirmTrigger = (event?.currentTarget as HTMLElement) ?? null;
    this.confirmRemoveUri = track.uri;
    this.focusConfirm();
  }

  /** "Abbrechen" / Escape: closes the question; nothing is sent. */
  cancelRemove() {
    this.confirmRemoveUri = null;
    this.cd.detectChanges();
    this.restoreFocus();
  }

  /** "Nur entfernen": removes the song from the queue, the blacklist stays unchanged. */
  async confirmRemoveOnly(track: any) {
    this.confirmRemoveUri = null;
    await this.onDeleteTrack(track);
    this.cd.detectChanges();
    this.focusQueueHeading();
  }

  /**
   * "Entfernen und sperren": blocks the song for this party, then removes it from the queue.
   * Blacklisting comes first: if the removal fails, the song is at least blocked for all
   * future adds. Not offered for the currently playing song (the spec only allows blocking
   * waiting songs).
   */
  async confirmBlock(track: any) {
    if (!track?.uri || !this.partyId || track.isCurrentlyPlaying) return;
    const artists = (track.artists ?? []).map((a: any) => a?.name).filter(Boolean).join(', ');
    const images = track.album?.images ?? [];
    try {
      await lastValueFrom(this.partyService.addBlacklistEntry(this.partyId, {
        kind: 'TRACK',
        value: track.uri,
        label: artists ? `${track.name} – ${artists}` : track.name,
        imageUrl: images.length ? images[images.length - 1].url : null,
      }));
      this.confirmRemoveUri = null;
      await this.onDeleteTrack(track);
      this.cd.detectChanges();
      this.focusQueueHeading();
      return;
    } catch (err) {
      console.error('Fehler beim Sperren des Songs:', err);
    }
    this.cd.detectChanges();
  }

  /** Sends the remove request and reloads the queue. Only called after the host confirmed. */
  async onDeleteTrack(track: any) {
    if (!track?.uri || !this.partyId) return;
    try {
      await lastValueFrom(this.http.delete(`${this.partyBase}/track/remove`, { body: { uri: track.uri } }));
      await this.loadPlaylist();
    } catch (err) {
      console.error('Fehler beim Loeschen des Songs:', err);
    }
  }

  private async triggerAutoNext() {
    await this.playNextTrack();
  }

  private async playNextTrack() {
    if (!this.partyId) return;
    const now = Date.now();
    const cooldown = this.autoAdvanceCooldownUntil && now < this.autoAdvanceCooldownUntil;
    if (this.autoAdvanceInFlight || cooldown) return;

    this.autoAdvanceInFlight = true;
    this.autoAdvanceCooldownUntil = now + 4000;
    try {
      this.partyStarted = true;
      this.isPaused = false;
      this.userPaused = false;
      const res: any = await lastValueFrom(this.http.post(`${this.partyBase}/track/next`, {}));
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

  async endParty() {
    if (!this.partyId) return;
    try {
      await lastValueFrom(this.partyService.endParty(this.partyId));
      this.router.navigate(['/']);
    } catch (err) {
      console.error('Fehler beim Beenden der Party:', err);
    }
  }
}
