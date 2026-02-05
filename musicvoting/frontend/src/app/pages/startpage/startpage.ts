import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import {TrackService} from '../../services/spotify-tracks';

@Component({
  selector: 'app-startpage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './startpage.html',
  styleUrl: './startpage.css',
})

export class Startpage implements OnInit{
  tracks: any[] = [];
  menuOpen = false;

  constructor(
    private spotifyService: SpotifyWebPlayerService,
    private trackApi: TrackService
  ) {}

  async ngOnInit() {
    await this.spotifyService.initPlayer();
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }
}

