import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyWebPlayerService } from '../../services/spotify-player';

@Component({
  selector: 'app-startpage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './startpage.html',
  styleUrls: ['./startpage.css'],
})
export class Startpage implements OnInit {
  tracks: any[] = [];
  menuOpen = false;

  constructor(
    private spotifyService: SpotifyWebPlayerService,
    private ngZone: NgZone
  ) {}

  async ngOnInit() {
    await this.spotifyService.initPlayer();
    this.loadQueue();
  }

  loadQueue() {
    this.spotifyService.getQueue().subscribe(queueData => {
      this.ngZone.run(() => {
        if (Array.isArray(queueData.queue)) {
          // Duplikate entfernen
          const uniqueTracksMap = new Map(
            queueData.queue.map((t: any) => [t.id, t])
          );
          this.tracks = Array.from(uniqueTracksMap.values()).slice(0, 9);
        } else {
          this.tracks = [];
        }
        console.log('Tracks geladen (einzigartig):', this.tracks);
      });
    });
  }

  trackById(index: number, track: any) {
    return track.id || track.uri || index;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }
}
