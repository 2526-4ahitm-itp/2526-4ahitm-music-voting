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

  constructor(private spotify: SpotifyPlayerService) {}

  ngOnInit(): void {
    this.spotify.initPlayer();

  }


  //https://open.spotify.com/track/0GMXiUAsc2pO9vNx70dliv?si=ce8093a4d37a4d0e
  //https://open.spotify.com/track/1D4PL9B8gOg78jiHg3FvBb?si=1ae83b30e0054ecf
  //https://open.spotify.com/track/1BxfuPKGuaTgP7aM0Bbdwr?si=78f69a26731b403e

  search() {
    this.spotify.searchTracks("Taylor Swift");
  }

  play() {
    this.spotify.playTrack('spotify:track:1BxfuPKGuaTgP7aM0Bbdwr');
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
