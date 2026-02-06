import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SpotifyWebPlayerService {
  private player: any;
  private deviceId!: string;
  private onReadyCallbacks: (() => void)[] = [];
  private token!: string;

  constructor(private http: HttpClient) {}

  async initPlayer() {
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

    console.log(this.deviceId)

    this.http.put(`/api/track/play?deviceId=${this.deviceId}`, { uri: uri })
      .subscribe(() => console.log("Playing..."));
  }

  login() {
    window.location.href = '/api/spotify/login';
  }

  setToken(token: string) {
    this.token = token;
  }

  addToQueue(uri: string): Observable<any> {
    const params = new HttpParams().set('deviceId', this.deviceId);
    return this.http.post<any>(`/api/track/queue`, { uri }, { params });
  }



  getQueue(): Observable<any> {
    var response = this.http.get<any>(`/api/track/queue`);

    return response;
  }



}
