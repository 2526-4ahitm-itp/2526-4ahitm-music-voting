import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SpotifyPlayerService {

  private player: any;
  private deviceId!: string;
  private token = 'BQBZqBrK0WrKUsUrEa4YkRYbQ59yzz3j_f8SAMpqiHaz8vFYDU2BnXGSWv9NYJEPpHhvYgVKDHgIFmfrUrlSSN9kkeWx6KpcJ7Gv8PiXrwbCRnDAIoIQRY7FyOU6B_BjJoXW-fU3oYtWro-j7rhytEZwESiOa_qtp-jkN9emItirtBJV_kQ9bCSUMfoHOpP01qwU4shqN5jJpBc7G0CTR2D6UbOmLn98w6AhAPpJ-epJeAXjEo7Oemp2FDNTTE_5lC988ISp';

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


}
