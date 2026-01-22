import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { TrackService } from '../../services/spotify-tracks';

@Component({
  selector: 'app-guest',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guest.html',
})
export class Guest implements OnInit {
  tracks: any[] = [];

  constructor(
    private spotifyService: SpotifyWebPlayerService,
    private trackApi: TrackService
  ) {}

  async ngOnInit() {
    await this.spotifyService.initPlayer();
  }

  search() {
    const query = (document.getElementById("search-input") as HTMLInputElement).value;

    console.log("Suche wird gestartet...");
    this.trackApi.searchTracks(query).subscribe({
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
