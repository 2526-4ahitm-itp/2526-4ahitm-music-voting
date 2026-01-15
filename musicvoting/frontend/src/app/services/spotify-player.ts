import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SpotifyPlayerService {

  private player: any;
  private deviceId!: string;
  private token = 'YOUR_SPOTIFY_TOKEN';

  constructor(private http: HttpClient) {}

  initPlayer(): void {
    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      this.player = new Spotify.Player({
        name: 'Angular Spotify Player',
        getOAuthToken: (cb: any) => cb(this.token),
        volume: 0.5
      });

      this.player.addListener('ready', ({ device_id }: any) => {
        this.deviceId = device_id;

        this.onReadyCallbacks.forEach(cb => cb());
        this.onReadyCallbacks = [];
      });


      this.player.addListener('not_ready', ({ device_id }: any) => {
        console.log('Device ID offline', device_id);
      });

      this.player.addListener('player_state_changed', (state: any) => {
        if (state?.track_window?.current_track) {
          console.log('Now playing:', state.track_window.current_track.name);
        }
      });
      this.player.setName("SDK Web Player").then(() => {
        console.log('Player name updated!');
      });

      this.player.connect();
    };
  }

  playTrack(uri: string): void {
    if (!this.deviceId) return;

    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
      method: 'PUT',
      body: JSON.stringify({ uris: [uri] }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      }
    });
  }

  pause(): void {
    this.player?.pause().then(() => {
      console.log('Paused!');
    });
  }

  previous() {
    this.player?.previousTrack().then(() => {
      console.log('Set to previous track!');
    });
  }

  next() {
    this.player?.nextTrack().then(() => {
      console.log('Skipped to next track!');
    });
  }

  addToQueue(uri: string): void {
    fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}&device_id=${this.deviceId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
  }

  private onReadyCallbacks: (() => void)[] = [];

  onReady(cb: () => void) {
    if (this.deviceId) cb();
    else this.onReadyCallbacks.push(cb);
  }


  searchTracks(query: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.token}`
    });

    return this.http.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
      { headers }
    );
  }

}
