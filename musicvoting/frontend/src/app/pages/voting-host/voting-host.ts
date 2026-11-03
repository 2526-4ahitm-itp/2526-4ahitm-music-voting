import { Component, OnInit, NgZone, signal, computed, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { lastValueFrom } from 'rxjs';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { MvHostMenu } from '../../shared/mv-host-menu';
import { MvCover } from '../../shared/mv-cover';
import { MvIcon } from '../../shared/mv-icon';
import { MvThemeToggle } from '../../shared/mv-theme-toggle';

@Component({
  selector: 'app-voting-comp',
  standalone: true,
  imports: [FormsModule, MvHostMenu, MvCover, MvIcon, MvThemeToggle],
  templateUrl: './voting-host.html',
  // Shared stage look first, page layout second (design D1/D2).
  styleUrls: ['../../shared/host-stage.css', './voting-host.css'],
})
export class VotingHost implements OnInit {
  menuOpen = false;
  // Signals für reaktive Daten
  tracks = signal<any[]>([]);
  searchQuery = signal<string>('');
  isSearching = signal<boolean>(false);

  // Gefilterte Liste (Signal), falls du lokal in der Queue suchen willst
  filteredTracks = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.tracks();
    return this.tracks().filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.artists[0]?.name.toLowerCase().includes(query)
    );
  });

  constructor(
    private spotifyService: SpotifyWebPlayerService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadPlaylist();
  }

  async loadPlaylist() {
    try {
      const res: any = await lastValueFrom(this.spotifyService.getQueue());
      this.ngZone.run(() => {
        if (res && Array.isArray(res.queue)) {
          this.tracks.set(res.queue);
        } else {
          this.tracks.set([]);
        }
      });
    } catch (err) {
      console.error('Fehler beim Laden der Playlist:', err);
    }
  }

  async onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

}
