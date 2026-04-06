import { Component, OnInit, NgZone, signal, computed, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { lastValueFrom } from 'rxjs';
import { SpotifyWebPlayerService } from '../../services/spotify-player';

@Component({
  selector: 'app-voting-comp',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './voting-comp.html',
  styleUrl: './voting-comp.css',
})
export class VotingComp implements OnInit {
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

  // Suche mittels Signals
  async onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);

    // Falls du eine echte API-Suche starten willst:
    if (input.value.length > 2) {
      this.executeApiSearch(input.value);
    }
  }

  private async executeApiSearch(term: string) {
    this.isSearching.set(true);
    try {

    } catch (err) {
      console.error('Suche fehlgeschlagen', err);
    } finally {
      this.isSearching.set(false);
    }
  }
}
