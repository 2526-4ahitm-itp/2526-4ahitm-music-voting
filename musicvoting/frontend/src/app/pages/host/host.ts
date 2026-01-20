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
    await this.spotifyService.initPlayer();
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
}
