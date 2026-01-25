import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {SpotifyWebPlayerService} from '../../services/spotify-player';
import {TrackService } from '../../services/spotify-tracks';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host.html'
})


export class Host implements OnInit {
  tracks: any[] = [];

  constructor(
    private spotifyService: SpotifyWebPlayerService,
    private trackApi: TrackService
  ) {}

  async ngOnInit() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      this.spotifyService.setToken(token);
      await this.spotifyService.initPlayer();
    } else {
      console.log("Bitte zuerst Spotify Login durchführen.");
    }
  }


  search() {
    console.log("Suche wird gestartet...");
    this.trackApi.searchTracks("Taylor Swift").subscribe({
      next: (res) => {
        this.tracks = res.tracks.items;
      },
      error: (err) => {
        console.error("Fehler bei der Suche:", err);
      }
    });

  }

  play(uri: string) {
    this.spotifyService.playTrack(uri);
  }

  loginSpotify() {
    this.spotifyService.login();
  }
}
