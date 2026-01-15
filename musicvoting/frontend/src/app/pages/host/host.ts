import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyPlayerService } from '../../services/spotify-player';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host.html'
})

export class Host implements OnInit {

  tracks: any[] = [];

  constructor(private spotify: SpotifyPlayerService) {}

  ngOnInit(): void {
    this.spotify.initPlayer();
    this.search();
  }

  search() {
    this.spotify.searchTracks("Taylor Swift").subscribe(result => {
      this.tracks = result.tracks.items;
      console.log(this.tracks);
    });
  }

  play(uri: string) {
    this.spotify.playTrack(uri);
  }

  pause() {
    this.spotify.pause();
  }

  previous() {
    this.spotify.previous();
  }

  next() {
    this.spotify.next();
  }
}
