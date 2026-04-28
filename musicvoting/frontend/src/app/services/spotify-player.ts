import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, lastValueFrom, Subject, EMPTY } from 'rxjs';
import { Injectable } from '@angular/core';
import { PartyService } from './party.service';

declare var Spotify: any;

@Injectable({ providedIn: 'root' })
export class SpotifyWebPlayerService {
  private player: any;
  private token: string | null = null;
  private isConnecting = false;

  private playerStateSubject = new Subject<any>();

  constructor(private http: HttpClient, private partyService: PartyService) {}

  getPlayerStatus(): Observable<any> {
    return this.playerStateSubject.asObservable();
  }

  async initPlayer(registerPlaybackDevice: boolean = false) {
    // Only initialize the Web Playback SDK on /startpage to prevent stealing active device.
    try {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (!path.includes('/startpage') && path !== '/startpage') return;
    } catch {
      // ignore and proceed
    }

    const partyId = this.partyService.currentPartyId;
    if (!partyId) {
      console.warn('SpotifyWebPlayerService: keine aktive Party, initPlayer abgebrochen');
      return;
    }

    if (this.isConnecting) return;
    this.isConnecting = true;
    try {
      this.token = await lastValueFrom(
        this.http.get(`/api/party/${partyId}/spotify/token`, { responseType: 'text' })
      );

      if (!this.token) return;

      await this.loadSpotifySDK();
      await this.createAndConnectPlayer(partyId, registerPlaybackDevice);
    } catch (error) {
      console.error('Player Init fehlgeschlagen', error);
    } finally {
      this.isConnecting = false;
    }
  }

  private async createAndConnectPlayer(partyId: string, registerPlaybackDevice: boolean) {
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

      this.http.put(`/api/party/${partyId}/spotify/deviceId`, device_id, {
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

  login() {
    const id = this.partyService.currentPartyId;
    if (!id) {
      console.warn('SpotifyWebPlayerService: keine aktive Party für Login');
      return;
    }
    window.location.href = `/api/party/${id}/spotify/login?source=web`;
  }

  addToPlaylist(uri: string): Observable<any> {
    const id = this.partyService.currentPartyId;
    if (!id) { console.warn('addToPlaylist: keine aktive Party'); return EMPTY; }
    return this.http.post(`/api/party/${id}/track/addToPlaylist`, [uri]);
  }

  getQueue(): Observable<any> {
    const id = this.partyService.currentPartyId;
    if (!id) { console.warn('getQueue: keine aktive Party'); return EMPTY; }
    return this.http.get<any>(`/api/party/${id}/track/queue`);
  }

  playTrack(uri: string) {
    const id = this.partyService.currentPartyId;
    if (!id) { console.warn('playTrack: keine aktive Party'); return; }
    return this.http.put(`/api/party/${id}/track/play`, { uri }).subscribe();
  }
}
