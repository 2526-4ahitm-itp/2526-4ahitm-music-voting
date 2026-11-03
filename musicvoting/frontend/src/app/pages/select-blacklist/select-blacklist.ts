import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {
  ArtistSearchResult,
  BlacklistEntry,
  NewBlacklistEntry,
  PartyService,
} from '../../services/party.service';
import { TrackService } from '../../services/spotify-tracks';
import { MvHostMenu } from '../../shared/mv-host-menu';
import { MvCover } from '../../shared/mv-cover';
import { MvIcon } from '../../shared/mv-icon';
import { MvThemeToggle } from '../../shared/mv-theme-toggle';

/** A song search result reduced to what the blacklist page shows and stores. */
export interface SongSearchResult {
  uri: string;
  name: string;
  artists: string;
  imageUrl: string | null;
}

/**
 * Blacklist page: the host blocks words, artists and songs for this party.
 *
 * Two modes (host spec "Host Manages Party Blacklist"):
 * - setup (default): step after the default-playlist picker, with "Weiter" and
 *   "Ohne Blacklist fortfahren"; no navigation so the setup flow stays focused.
 * - edit (`?mode=edit`, opened from the host navigation during the party): the same
 *   editing, with the host navigation and a single "Fertig" back to the dashboard.
 *
 * Both modes use the host stage look (shared/host-stage.css).
 *
 * The app is zoneless, so every state change after an `await` is followed by
 * `detectChanges()` — otherwise the view would not re-render.
 */
@Component({
  selector: 'app-select-blacklist',
  standalone: true,
  imports: [CommonModule, FormsModule, MvHostMenu, MvCover, MvIcon, MvThemeToggle],
  templateUrl: './select-blacklist.html',
  styleUrls: ['../../shared/host-stage.css', './select-blacklist.css'],
})
export class SelectBlacklist implements OnInit, OnDestroy {
  /** Same delay as the guest search: searches while typing without one Spotify call per key. */
  static readonly SEARCH_DEBOUNCE_MS = 400;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private partyService = inject(PartyService);
  private trackService = inject(TrackService);
  private cd = inject(ChangeDetectorRef);

  partyId: string | null = null;
  /** True when opened from the host navigation during the party (?mode=edit). */
  editMode = false;
  entries: BlacklistEntry[] = [];
  isLoading = true;
  error: string | null = null;

  wordInput = '';

  searchTab: 'artists' | 'songs' = 'artists';
  searchQuery = '';
  artistResults: ArtistSearchResult[] = [];
  songResults: SongSearchResult[] = [];

  /** Counts started searches; a response is only shown if no newer search started meanwhile. */
  private searchSeq = 0;
  private queryChanges = new Subject<void>();
  private queryChangesSub = this.queryChanges
    .pipe(debounceTime(SelectBlacklist.SEARCH_DEBOUNCE_MS))
    .subscribe(() => this.search());

  ngOnDestroy() {
    this.queryChangesSub.unsubscribe();
  }

  /** Search starts as soon as the host types: debounced, and an emptied field clears the results. */
  onSearchQueryChange(query: string) {
    this.searchQuery = query;
    if (!query.trim()) {
      this.searchSeq++; // drop a response that is still on its way
      this.artistResults = [];
      this.songResults = [];
      this.cd.detectChanges();
    }
    this.queryChanges.next();
  }

  async ngOnInit() {
    this.editMode = this.route.snapshot.queryParamMap.get('mode') === 'edit';
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
    const seq = ++this.searchSeq;
    const tab = this.searchTab;
    // No "Suche läuft…" indicator on purpose: with search-while-typing it would flicker on every pause.
    this.error = null;
    this.cd.detectChanges();
    try {
      if (tab === 'artists') {
        const artists = await lastValueFrom(this.partyService.searchArtists(this.partyId, query));
        if (seq !== this.searchSeq) return; // typing went on — a newer search owns the list
        this.artistResults = artists;
      } else {
        const res = await lastValueFrom(this.trackService.searchTracks(query));
        if (seq !== this.searchSeq) return;
        this.songResults = toSongResults(res);
      }
    } catch {
      if (seq !== this.searchSeq) return;
      this.error = 'Suche fehlgeschlagen. Bitte erneut versuchen.';
    } finally {
      if (seq === this.searchSeq) {
        this.cd.detectChanges();
      }
    }
  }

  continue() {
    this.router.navigate(['/dashboard'], { queryParams: { partyId: this.partyId } });
  }

  /** Edit mode: changes are already saved, so "Fertig" just returns to the dashboard. */
  done() {
    this.continue();
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
