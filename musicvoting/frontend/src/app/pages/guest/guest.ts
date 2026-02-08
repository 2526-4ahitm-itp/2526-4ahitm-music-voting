import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { TrackService } from '../../services/spotify-tracks';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-guest',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guest.html',
  styleUrl: './guest.css',
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

  async search() {
    const query = (document.getElementById("search-input") as HTMLInputElement).value;
    if (!query) return;

    console.log("Suche wird gestartet (Guest über Host)...");

    try {
      const res: any = await lastValueFrom(this.trackApi.searchTracks(query));

      const uniqueTracksMap = new Map(res.tracks.items.map((t: any) => [t.id, t]));
      const uniqueTracks = Array.from(uniqueTracksMap.values()).slice(0, 9);

      this.tracks = uniqueTracks;

      for (const track of this.tracks) {
        try {
          await lastValueFrom(this.spotifyService.addToQueue(track.uri));
          console.log(`${track.name} wurde zur Queue hinzugefügt`);
        } catch (err) {
          console.error("Queue Fehler:", err);
        }
      }

      const queue = await lastValueFrom(this.spotifyService.getQueue());
      console.log("Echte Queue Daten (Host):", queue);

    } catch (err) {
      console.error("Fehler bei der Suche oder Queue:", err);
    }
  }

}
