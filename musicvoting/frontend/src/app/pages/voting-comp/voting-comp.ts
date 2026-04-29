import { Component, OnInit, OnDestroy, NgZone, signal, computed, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { lastValueFrom } from 'rxjs';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { Router, RouterLink } from '@angular/router';
import { PartyService } from '../../services/party.service';

@Component({
  selector: 'app-voting-comp',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './voting-comp.html',
  styleUrl: './voting-comp.css',
})
export class VotingComp implements OnInit, OnDestroy {
  // Signals für reaktive Daten
  tracks = signal<any[]>([]);
  searchQuery = signal<string>('');
  isSearching = signal<boolean>(false);

  // Gefilterte Liste (Signal), falls du lokal in der Queue suchen willst
  private eventSource?: EventSource;

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
    private cdr: ChangeDetectorRef,
    private router: Router,
    private partyService: PartyService
  ) {}

  ngOnInit() {
    this.loadPlaylist();
    const partyId = this.partyService.currentPartyId;
    const partyQuery = partyId ? `&partyId=${encodeURIComponent(partyId)}` : '';
    this.eventSource = new EventSource(`/api/spotify/events?source=web${partyQuery}`);
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === 'party-ended') {
          this.ngZone.run(() => this.router.navigate(['/']));
        } else if (data?.type === 'queue-updated' || data?.type === 'vote-updated') {
          this.loadPlaylist();
        }
      } catch { /* ignore malformed events */ }
    };
  }

  ngOnDestroy() {
    this.eventSource?.close();
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

}
