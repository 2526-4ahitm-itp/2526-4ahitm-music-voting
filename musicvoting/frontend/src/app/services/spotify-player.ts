import { HttpClient, HttpHeaders } from '@angular/common/http';
import {Observable, lastValueFrom, Subject} from 'rxjs';
import { Injectable } from '@angular/core';

declare var Spotify: any;

@Injectable({ providedIn: 'root' })
export class SpotifyWebPlayerService {
  private player: any;
  private token: string | null = null;
  private isConnecting = false;

  // Neues Subject, um Statusänderungen an Komponenten zu senden
  private playerStateSubject = new Subject<any>();

  constructor(private http: HttpClient) {}

  /**
   * Gibt den Stream der Statusänderungen zurück
   */
  getPlayerStatus(): Observable<any> {
    return this.playerStateSubject.asObservable();
  }

  async initPlayer(registerPlaybackDevice: boolean = false) {
    if (this.isConnecting) return;
    this.isConnecting = true;
    try {
      this.token = await lastValueFrom(
        this.http.get('/api/spotify/token', { responseType: 'text' })
      );

      if (!this.token) return;

      await this.loadSpotifySDK();
      await this.createAndConnectPlayer(registerPlaybackDevice);
    } catch (error) {
      console.error("Player Init fehlgeschlagen", error);
    } finally {
      this.isConnecting = false;
    }
  }

  private async createAndConnectPlayer(registerPlaybackDevice: boolean) {
    if (!(window as any).Spotify) {
      console.error('Spotify SDK ist nicht verfügbar.');
      return;
    }

    if (this.player) {
      try {
        await this.player.disconnect();
      } catch (error) {
        console.warn('Vorheriger Spotify Player konnte nicht getrennt werden:', error);
      }
      this.player = null;
    }

    this.player = new Spotify.Player({
      name: 'Web Player MusicVoting',
      getOAuthToken: (cb: any) => cb(this.token),
      volume: 0.5
    });

    this.player.addListener('player_state_changed', (state: any) => {
      if (!state) return;
      this.playerStateSubject.next(state);
    });

    this.player.addListener('initialization_error', ({ message }: any) => {
      console.error('Spotify init error:', message);
    });
    this.player.addListener('authentication_error', ({ message }: any) => {
      console.error('Spotify auth error:', message);
    });
    this.player.addListener('account_error', ({ message }: any) => {
      console.error('Spotify account error:', message);
    });
    this.player.addListener('playback_error', ({ message }: any) => {
      console.error('Spotify playback error:', message);
    });


    this.player.addListener('ready', ({ device_id }: any) => {
      console.log('Spotify ready, device:', device_id);
      if (!registerPlaybackDevice) return;

      this.http.put('/api/spotify/deviceId', device_id, {
        headers: new HttpHeaders({ 'Content-Type': 'text/plain' })
      }).subscribe({
        next: () => console.log('Device ID an Backend gesendet:', device_id),
        error: (err) => console.error('Fehler beim Senden der Device ID:', err)
      });
    });

    this.player.addListener('not_ready', ({ device_id }: any) => {
      console.warn('Spotify device not ready:', device_id);
    });

    await this.player.connect().then((connected: boolean) => {
      console.log('Spotify connect result:', connected);
    });
  }

  // Restliche Methoden (login, addToPlaylist, etc.) bleiben gleich...
  private loadSpotifySDK(): Promise<void> {
    return new Promise((resolve) => {
      if ((window as any).Spotify) {
        resolve();
        return;
      }

      if (document.getElementById('spotify-sdk')) {
        (window as any).onSpotifyWebPlaybackSDKReady = () => resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = 'spotify-sdk';
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      (window as any).onSpotifyWebPlaybackSDKReady = () => resolve();
      document.body.appendChild(script);
    });
  }

  /**
   * Leitet den User zum Spotify Login (Backend) weiter.
   */
  login() {
    window.location.href = '/api/spotify/login?source=web';
  }


  /**
   * Fügt einen Song zur Party-Playlist hinzu
   */
  addToPlaylist(uri: string): Observable<any> {
    return this.http.post('/api/track/addToPlaylist', [uri]);
  }

  /**
   * Holt die aktuelle Warteschlange vom Backend.
   */
  getQueue(): Observable<any> {
    return this.http.get<any>('/api/track/queue');
  }

  /**
   * Startet die Wiedergabe eines Tracks.
   */
  playTrack(uri: string) {
    return this.http.put('/api/track/play', { uri }).subscribe();
  }
}
