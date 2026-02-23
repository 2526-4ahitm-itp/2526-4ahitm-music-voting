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
    // 1. Player initialisieren (erzeugt die DeviceID im Backend)
    await this.spotifyService.initPlayer();

    // 2. Queue laden
    this.loadQueue();

    // 3. Optional: Polling oder WebSocket, um die Queue aktuell zu halten
    setInterval(() => this.loadQueue(), 5000);
  }

  loadQueue() {
    this.spotifyService.getQueue().subscribe(queueData => {
      this.ngZone.run(() => {
        if (Array.isArray(queueData.queue)) {
          const uniqueTracksMap = new Map(
            queueData.queue.map((t: any) => [t.id, t])
          );
          this.tracks = Array.from(uniqueTracksMap.values());
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
