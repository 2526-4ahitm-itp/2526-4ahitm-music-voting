import { HttpClient, HttpHeaders } from '@angular/common/http';
import {Observable, lastValueFrom, Subject} from 'rxjs';
import { Injectable } from '@angular/core';

declare var Spotify: any;

@Injectable({ providedIn: 'root' })
export class SpotifyWebPlayerService {
  private player: any;
  private token: string | null = null;

  // Neues Subject, um Statusänderungen an Komponenten zu senden
  private playerStateSubject = new Subject<any>();

  constructor(private http: HttpClient) {}

  /**
   * Gibt den Stream der Statusänderungen zurück
   */
  getPlayerStatus(): Observable<any> {
    return this.playerStateSubject.asObservable();
  }

  async initPlayer() {
    try {
      this.token = await lastValueFrom(
        this.http.get('/api/spotify/token', { responseType: 'text' })
      );

      if (!this.token) return;

      (window as any).onSpotifyWebPlaybackSDKReady = () => {
        this.player = new Spotify.Player({
          name: 'Web Player MusicVoting',
          getOAuthToken: (cb: any) => cb(this.token),
          volume: 0.5
        });

        // WICHTIG: Der Listener für Statusänderungen
        this.player.addListener('player_state_changed', (state: any) => {
          if (!state) return;
          console.log('Player Status geändert:', state);
          this.playerStateSubject.next(state); // Status an alle Abonnenten schicken
        });

        this.player.addListener('ready', ({ device_id }: any) => {
          this.http.put('/api/spotify/deviceId', device_id, {
            headers: new HttpHeaders({ 'Content-Type': 'text/plain' })
          }).subscribe();
        });

        this.player.connect();
      };

      await this.loadSpotifySDK();
    } catch (error) {
      console.error("Player Init fehlgeschlagen", error);
    }
  }

  // Restliche Methoden (login, addToPlaylist, etc.) bleiben gleich...
  private loadSpotifySDK(): Promise<void> {
    return new Promise((resolve) => {
      if (document.getElementById('spotify-sdk')) return resolve();
      const script = document.createElement('script');
      script.id = 'spotify-sdk';
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }

  /**
   * Leitet den User zum Spotify Login (Backend) weiter.
   */
  login() {
    window.location.href = '/api/spotify/login';
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
