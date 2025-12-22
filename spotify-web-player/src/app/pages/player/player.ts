import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyPlayerService } from '../../services/spotify-player';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player.html'
})
export class Player implements OnInit {

  constructor(private spotify: SpotifyPlayerService) {}

  ngOnInit(): void {
    this.spotify.initPlayer();

    this.spotify.onReady(() => {
      this.spotify.playTrack('spotify:track:53iuhJlwXhSER5J2IYYv1W');

      this.spotify.addToQueue('spotify:track:0V3wPSX9ygBnCm8psDIegu');
      this.spotify.addToQueue('spotify:track:0GMXiUAsc2pO9vNx70dliv');
      this.spotify.addToQueue('spotify:track:1D4PL9B8gOg78jiHg3FvBb');
    });
  }


  //https://open.spotify.com/track/0GMXiUAsc2pO9vNx70dliv?si=ce8093a4d37a4d0e
  //https://open.spotify.com/track/1D4PL9B8gOg78jiHg3FvBb?si=1ae83b30e0054ecf
  //https://open.spotify.com/track/1BxfuPKGuaTgP7aM0Bbdwr?si=78f69a26731b403e

  play() {
    this.spotify.playTrack('spotify:track:1BxfuPKGuaTgP7aM0Bbdwr');
  }

  protected pause() {
    this.spotify.pause();
  }

  protected previous() {
    this.spotify.previous();
  }

  protected next() {
    this.spotify.next();
  }




}
