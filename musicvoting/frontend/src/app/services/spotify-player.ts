import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, lastValueFrom } from 'rxjs';

declare var Spotify: any;

@Injectable({ providedIn: 'root' })
export class SpotifyWebPlayerService {
  private player: any;
  private token: string | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Initialisiert den Spotify Player und registriert die Device ID im Backend.
   */
  async initPlayer() {
    try {
      // 1. Token vom Backend holen (Proxy leitet an Quarkus weiter)
      this.token = await lastValueFrom(
        this.http.get('/api/spotify/token', { responseType: 'text' })
      );

      if (!this.token) {
        console.warn("Kein Spotify-Token erhalten. Login erforderlich?");
        return;
      }

      // 2. Spotify SDK Callback definieren
      (window as any).onSpotifyWebPlaybackSDKReady = () => {
        this.player = new Spotify.Player({
          name: 'Web Player MusicVoting',
          getOAuthToken: (cb: any) => cb(this.token),
          volume: 0.5
        });

        // Wenn der Player bereit ist, registrieren wir die ID im Backend
        this.player.addListener('ready', ({ device_id }: any) => {
          console.log('Spotify Player bereit mit Device ID:', device_id);

          // Wir senden die ID an das Backend, damit der TokenStore sie speichert
          this.http.put('/api/spotify/deviceId', device_id, {
            headers: new HttpHeaders({ 'Content-Type': 'text/plain' })
          }).subscribe({
            next: () => console.log('Device ID erfolgreich im Backend hinterlegt.'),
            error: (err) => console.error('Fehler bei Device ID Registrierung:', err)
          });
        });

        this.player.addListener('not_ready', ({ device_id }: any) => {
          console.log('Device ID ist offline gegangen:', device_id);
        });

        this.player.connect();
      };

      // 3. SDK Skript laden
      await this.loadSpotifySDK();
    } catch (error) {
      console.error("Player Init fehlgeschlagen", error);
    }
  }

  /**
   * Lädt das externe Spotify Playback SDK Skript.
   */
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
