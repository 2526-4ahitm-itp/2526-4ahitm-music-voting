import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {
  ArtistSearchResult,
  BlocklistEntry,
  NewBlocklistEntry,
  PartyService,
} from '../../services/party.service';
import { TrackService } from '../../services/spotify-tracks';
import { MvHostMenu } from '../../shared/mv-host-menu';
import { MvCover } from '../../shared/mv-cover';
import { MvIcon } from '../../shared/mv-icon';
import { MvThemeToggle } from '../../shared/mv-theme-toggle';

/** A song search result reduced to what the blocklist page shows and stores. */
export interface SongSearchResult {
  uri: string;
  name: string;
  artists: string;
  imageUrl: string | null;
}

/**
 * Blocklist page: the host blocks words, artists and songs for this party.
 *
 * One search field serves all three kinds (task 8.3): while the host types,
 * the results show "Wort „x“ sperren" first, then matching artists, then
 * matching songs. Enter blocks the input as a word, because that is the
 * first result row. This replaced a separate word form plus artist/song tabs,
 * which made the host decide the kind before typing.
 *
 * Two modes (host spec "Host Manages Party Blocklist"):
 * - setup (default): step after the default-playlist picker, with "Weiter" and
 *   "Ohne Blocklist fortfahren"; no navigation so the setup flow stays focused.
 * - edit (`?mode=edit`, opened from the host navigation during the party): the same
 *   editing, with the host navigation and a single "Fertig" back to the dashboard.
 *
 * Both modes use the host stage look (shared/stage.css).
 *
 * The app is zoneless, so every state change after an `await` is followed by
 * `detectChanges()` — otherwise the view would not re-render.
 */
@Component({
  selector: 'app-select-blocklist',
  standalone: true,
  imports: [FormsModule, MvHostMenu, MvCover, MvIcon, MvThemeToggle],
  templateUrl: './select-blocklist.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../../shared/stage.css', './select-blocklist.css'],
})
export class SelectBlocklist implements OnInit, OnDestroy {
  /** Same delay as the guest search: searches while typing without one Spotify call per key. */
  static readonly SEARCH_DEBOUNCE_MS = 400;
  /** Few artists and songs keep the mixed list short enough for a phone (team decision 2026-11-17). */
  static readonly MAX_ARTISTS = 3;
  static readonly MAX_SONGS = 5;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private partyService = inject(PartyService);
  private trackService = inject(TrackService);
  private cd = inject(ChangeDetectorRef);

  partyId: string | null = null;
  /** True when opened from the host navigation during the party (?mode=edit). */
  editMode = false;
  entries: BlocklistEntry[] = [];
  isLoading = true;
  error: string | null = null;

  searchQuery = '';
  artistResults: ArtistSearchResult[] = [];
  songResults: SongSearchResult[] = [];

  /** Counts started searches; a response is only shown if no newer search started meanwhile. */
  private searchSeq = 0;
  private queryChanges = new Subject<void>();
  private queryChangesSub = this.queryChanges
    .pipe(debounceTime(SelectBlocklist.SEARCH_DEBOUNCE_MS))
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
      this.entries = await lastValueFrom(this.partyService.getBlocklist(this.partyId));
    } catch {
      this.error = 'Blocklist konnte nicht geladen werden.';
    } finally {
      this.isLoading = false;
      this.cd.detectChanges();
    }
  }

  get words(): BlocklistEntry[] {
    return this.entries.filter(e => e.kind === 'WORD');
  }

  get artists(): BlocklistEntry[] {
    return this.entries.filter(e => e.kind === 'ARTIST');
  }

  get songs(): BlocklistEntry[] {
    return this.entries.filter(e => e.kind === 'TRACK');
  }

  /** The trimmed input, offered as the first result row "Wort „x“ sperren". */
  get wordCandidate(): string {
    return this.searchQuery.trim();
  }

  /** True if the current input is already blocked as a word (the backend stores words lower-case). */
  get wordBlocked(): boolean {
    const word = this.wordCandidate.toLowerCase();
    return this.entries.some(e => e.kind === 'WORD' && e.value.toLowerCase() === word);
  }

  /**
   * Blocks the current input as a word (first result row, also bound to Enter).
   * Afterwards the field is emptied: the word is done, and the artist/song
   * results for it would only distract from the next entry.
   */
  async addWord() {
    const word = this.wordCandidate;
    if (!word || this.wordBlocked) return;
    if (await this.add({ kind: 'WORD', value: word })) {
      this.onSearchQueryChange('');
    }
  }

  addArtist(artist: ArtistSearchResult) {
    return this.add({ kind: 'ARTIST', value: artist.id, label: artist.name, imageUrl: artist.imageUrl });
  }

  addSong(song: SongSearchResult) {
    return this.add({ kind: 'TRACK', value: song.uri, label: `${song.name} – ${song.artists}`, imageUrl: song.imageUrl });
  }

  /** True if an artist or song result is already on the blocklist (shown as added, not clickable). */
  isBlocked(kind: 'ARTIST' | 'TRACK', value: string): boolean {
    return this.entries.some(e => e.kind === kind && e.value === value);
  }

  async remove(entry: BlocklistEntry) {
    if (!this.partyId) return;
    this.error = null;
    try {
      await lastValueFrom(this.partyService.removeBlocklistEntry(this.partyId, entry.id));
      this.entries = this.entries.filter(e => e.id !== entry.id);
    } catch {
      this.error = 'Eintrag konnte nicht entfernt werden.';
    }
    this.cd.detectChanges();
  }

  /**
   * Searches artists and songs in parallel for the current input.
   *
   * Both requests are independent: if one fails, the other group is still
   * shown, so a Spotify hiccup on one endpoint does not hide useful results.
   * Only when both fail does the host see an error. The word row needs no
   * request and is always there while the field has text.
   */
  async search() {
    const query = this.searchQuery.trim();
    if (!this.partyId || !query) return;
    const seq = ++this.searchSeq;
    // No "Suche läuft…" indicator on purpose: with search-while-typing it would flicker on every pause.
    this.error = null;
    this.cd.detectChanges();
    // defaultValue: searchTracks completes empty when no party is set; that is "no songs", not an error.
    const [artists, songs] = await Promise.allSettled([
      lastValueFrom(this.partyService.searchArtists(this.partyId, query), { defaultValue: [] }),
      lastValueFrom(this.trackService.searchTracks(query), { defaultValue: null }),
    ]);
    if (seq !== this.searchSeq) return; // typing went on — a newer search owns the list
    this.artistResults = artists.status === 'fulfilled'
      ? (artists.value ?? []).slice(0, SelectBlocklist.MAX_ARTISTS)
      : [];
    this.songResults = songs.status === 'fulfilled'
      ? toSongResults(songs.value).slice(0, SelectBlocklist.MAX_SONGS)
      : [];
    if (artists.status === 'rejected' && songs.status === 'rejected') {
      this.error = 'Suche fehlgeschlagen. Bitte erneut versuchen.';
    }
    this.cd.detectChanges();
  }

  /** Setup mode: the go-live step comes next, where the host opens the player (design D8). */
  continue() {
    this.router.navigate(['/party-ready'], { queryParams: { partyId: this.partyId } });
  }

  /** Edit mode: changes are already saved, so "Fertig" just returns to the dashboard. */
  done() {
    this.router.navigate(['/dashboard'], { queryParams: { partyId: this.partyId } });
  }

  /** Same destination as "Weiter" — skipping just means not adding anything. */
  skip() {
    this.continue();
  }

  /** Adds an entry and shows it. The backend returns the existing entry for duplicates. */
  private async add(entry: NewBlocklistEntry): Promise<boolean> {
    if (!this.partyId) return false;
    this.error = null;
    try {
      const saved = await lastValueFrom(this.partyService.addBlocklistEntry(this.partyId, entry));
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
