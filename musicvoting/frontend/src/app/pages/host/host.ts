import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {SpotifyWebPlayerService} from '../../services/spotify-player';
import {TrackService } from '../../services/spotify-tracks';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host.html',
  styleUrl:'./host.css'

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


  //search and add to the queue
  async search() {
    console.log("Suche wird gestartet...");

    try {
      const res: any = await lastValueFrom(this.trackApi.searchTracks("Taylor Swift"));
      this.tracks = res.tracks.items;

      for (const track of this.tracks) {
        console.log("Track gefunden: ", track.name);

        try {
          await lastValueFrom(this.spotifyService.addToQueue(track.uri));
          console.log(`${track.name} wurde zur Queue hinzugefügt`);
        } catch (err) {
          console.error("Queue Fehler:", err);
        }
      }

      const queue = await lastValueFrom(this.spotifyService.getQueue());
      console.log("Echte Queue Daten:", queue);

    } catch (err) {
      console.error("Fehler bei der Suche oder Queue:", err);
    }
  }


  play(uri: string) {
    this.spotifyService.playTrack(uri);
  }

  loginSpotify() {
    this.spotifyService.login();
  }
}
