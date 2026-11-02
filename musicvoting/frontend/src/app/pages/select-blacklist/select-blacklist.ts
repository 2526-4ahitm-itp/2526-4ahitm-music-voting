import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import {
  ArtistSearchResult,
  BlacklistEntry,
  NewBlacklistEntry,
  PartyService,
} from '../../services/party.service';
import { TrackService } from '../../services/spotify-tracks';

/** A song search result reduced to what the blacklist page shows and stores. */
export interface SongSearchResult {
  uri: string;
  name: string;
  artists: string;
  imageUrl: string | null;
}

/**
 * Host setup step after the default-playlist picker: the host blocks words, artists and
 * songs for this party. This is the only place to add words and artists; later in the party
 * the host can only block single songs from the dashboard queue ("Song sperren").
 *
 * The app is zoneless, so every state change after an `await` is followed by
 * `detectChanges()` — otherwise the view would not re-render.
 */
@Component({
  selector: 'app-select-blacklist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './select-blacklist.html',
  styleUrl: './select-blacklist.css',
})
export class SelectBlacklist implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private partyService = inject(PartyService);
  private trackService = inject(TrackService);
  private cd = inject(ChangeDetectorRef);

  partyId: string | null = null;
  entries: BlacklistEntry[] = [];
  isLoading = true;
  error: string | null = null;

  wordInput = '';

  searchTab: 'artists' | 'songs' = 'artists';
  searchQuery = '';
  isSearching = false;
  artistResults: ArtistSearchResult[] = [];
  songResults: SongSearchResult[] = [];

  async ngOnInit() {
    const partyIdFromUrl = this.route.snapshot.queryParamMap.get('partyId');
    if (partyIdFromUrl) {
      this.partyService.setCurrentPartyId(partyIdFromUrl);
    }
    this.partyId = this.partyService.currentPartyId;

    if (!this.partyId) {
      this.router.navigate(['/']);
      return;
    }

    try {
      this.entries = await lastValueFrom(this.partyService.getBlacklist(this.partyId));
    } catch {
      this.error = 'Blacklist konnte nicht geladen werden.';
    } finally {
      this.isLoading = false;
      this.cd.detectChanges();
    }
  }

  get words(): BlacklistEntry[] {
    return this.entries.filter(e => e.kind === 'WORD');
  }

  get artists(): BlacklistEntry[] {
    return this.entries.filter(e => e.kind === 'ARTIST');
  }

  get songs(): BlacklistEntry[] {
    return this.entries.filter(e => e.kind === 'TRACK');
  }

  async addWord() {
    const word = this.wordInput.trim();
    if (!word) return;
    if (await this.add({ kind: 'WORD', value: word })) {
      this.wordInput = '';
      this.cd.detectChanges();
    }
  }

  addArtist(artist: ArtistSearchResult) {
    return this.add({ kind: 'ARTIST', value: artist.id, label: artist.name, imageUrl: artist.imageUrl });
  }

  addSong(song: SongSearchResult) {
    return this.add({ kind: 'TRACK', value: song.uri, label: `${song.name} – ${song.artists}`, imageUrl: song.imageUrl });
  }

  /** True if an artist or song result is already on the blacklist (shown as added, not clickable). */
  isBlocked(kind: 'ARTIST' | 'TRACK', value: string): boolean {
    return this.entries.some(e => e.kind === kind && e.value === value);
  }

  async remove(entry: BlacklistEntry) {
    if (!this.partyId) return;
    this.error = null;
    try {
      await lastValueFrom(this.partyService.removeBlacklistEntry(this.partyId, entry.id));
      this.entries = this.entries.filter(e => e.id !== entry.id);
    } catch {
      this.error = 'Eintrag konnte nicht entfernt werden.';
    }
    this.cd.detectChanges();
  }

  selectTab(tab: 'artists' | 'songs') {
    if (this.searchTab === tab) return;
    this.searchTab = tab;
    this.artistResults = [];
    this.songResults = [];
    this.cd.detectChanges();
    if (this.searchQuery.trim()) {
      this.search();
    }
  }

  async search() {
    const query = this.searchQuery.trim();
    if (!this.partyId || !query) return;
    this.isSearching = true;
    this.error = null;
    this.cd.detectChanges();
    try {
      if (this.searchTab === 'artists') {
        this.artistResults = await lastValueFrom(this.partyService.searchArtists(this.partyId, query));
      } else {
        const res = await lastValueFrom(this.trackService.searchTracks(query));
        this.songResults = toSongResults(res);
      }
    } catch {
      this.error = 'Suche fehlgeschlagen. Bitte erneut versuchen.';
    } finally {
      this.isSearching = false;
      this.cd.detectChanges();
    }
  }

  continue() {
    this.router.navigate(['/dashboard'], { queryParams: { partyId: this.partyId } });
  }

  /** Same destination as "Weiter" — skipping just means not adding anything. */
  skip() {
    this.continue();
  }

  /** Adds an entry and shows it. The backend returns the existing entry for duplicates. */
  private async add(entry: NewBlacklistEntry): Promise<boolean> {
    if (!this.partyId) return false;
    this.error = null;
    try {
      const saved = await lastValueFrom(this.partyService.addBlacklistEntry(this.partyId, entry));
      if (!this.entries.some(e => e.id === saved.id)) {
        this.entries = [...this.entries, saved];
      }
      this.cd.detectChanges();
      return true;
    } catch {
      this.error = 'Eintrag konnte nicht gespeichert werden.';
      this.cd.detectChanges();
      return false;
    }
  }
}

/** Maps a raw Spotify search response (`tracks.items`) to song results, skipping null items. */
function toSongResults(res: any): SongSearchResult[] {
  const items: any[] = res?.tracks?.items ?? [];
  return items
    .filter(t => t && t.uri)
    .map(t => ({
      uri: t.uri,
      name: t.name,
      artists: (t.artists ?? []).map((a: any) => a.name).join(', '),
      imageUrl: t.album?.images?.[0]?.url ?? null,
    }));
}
