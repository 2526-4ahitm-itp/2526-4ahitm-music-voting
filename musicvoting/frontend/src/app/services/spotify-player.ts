import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SpotifyWebPlayerService {
  private player: any;
  private deviceId!: string;
  private onReadyCallbacks: (() => void)[] = [];
  private token!: string;

  constructor(private http: HttpClient) {}

  async initPlayer() {
    // Token aus URL holen oder /token abfragen
    if (!this.token) {
      const urlParams = new URLSearchParams(window.location.search);
      this.token = urlParams.get('token') || '';
    }

    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      this.player = new Spotify.Player({
        name: 'Web Player MusicVoting',
        getOAuthToken: (cb: any) => cb(this.token),
        volume: 0.5
      });

      this.player.addListener('ready', ({ device_id }: any) => {
        this.deviceId = device_id;
        this.onReadyCallbacks.forEach(cb => cb());
        this.onReadyCallbacks = [];
      });

      this.player.addListener('player_state_changed', (state: any) => {
        console.log('Now playing:', state?.track_window?.current_track?.name);
      });

      this.player.connect();
    };

    await this.loadSpotifySDK();
  }

  private loadSpotifySDK(): Promise<void> {
    return new Promise((resolve) => {
      const existingScript = document.getElementById('spotify-sdk');
      if (existingScript) {
        resolve(); // SDK schon geladen
        return;
      }

      const scriptTag = document.createElement('script');
      scriptTag.id = 'spotify-sdk';
      scriptTag.src = 'https://sdk.scdn.co/spotify-player.js';
      scriptTag.onload = () => resolve();
      document.body.appendChild(scriptTag);
    });
  }



  onReady(cb: () => void) {
    if (this.deviceId) cb();
    else this.onReadyCallbacks.push(cb);
  }

  playTrack(uri: string) {
    if (!this.deviceId) {
      console.error("Player noch nicht bereit!");
      return;
    }


    this.http.put(`/api/track/play?deviceId=${this.deviceId}`, { uri: uri })
      .subscribe(() => console.log("Playing..."));
  }

  login() {
    window.location.href = '/api/spotify/login';
  }

  setToken(token: string) {
    this.token = token;
  }



}
