import { ChangeDetectorRef, Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { HostPlaylist, PartyService } from '../../services/party.service';
import { MvCover } from '../../shared/mv-cover';
import { MvIcon } from '../../shared/mv-icon';
import { MvSpinner } from '../../shared/mv-spinner';
import { MvThemeToggle } from '../../shared/mv-theme-toggle';

@Component({
  selector: 'app-select-playlist',
  standalone: true,
  imports: [MvCover, MvIcon, MvSpinner, MvThemeToggle],
  templateUrl: './select-playlist.html',
  // Shared stage look first, page layout second.
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['../../shared/stage.css', './select-playlist.css'],
})
/**
 * Setup step after the provider login: pick the playlist that refills an
 * empty queue, or continue without one. Then on to the blacklist step.
 */
export class SelectPlaylist implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private partyService = inject(PartyService);
  private cd = inject(ChangeDetectorRef);

  partyId: string | null = null;
  playlists: HostPlaylist[] = [];
  isLoading = true;
  isSaving = false;
  error: string | null = null;
  /**
   * Set when the backend rejected the login because the Spotify account is not Premium
   * (provider spec "Spotify Provider Requires Premium Host Account"). The party then has no
   * tokens, so instead of playlists the page offers a login with another account.
   */
  premiumRequired = false;

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

    if (this.route.snapshot.queryParamMap.get('error') === 'premium-required') {
      this.premiumRequired = true;
      this.isLoading = false;
      this.cd.detectChanges();
      return;
    }

    try {
      this.playlists = await lastValueFrom(this.partyService.getPlaylists(this.partyId));
    } catch {
      this.error = 'Playlists konnten nicht geladen werden.';
    } finally {
      this.isLoading = false;
      this.cd.detectChanges();
    }
  }

  async choose(playlist: HostPlaylist) {
    if (!this.partyId || this.isSaving) return;
    this.isSaving = true;
    this.error = null;
    this.cd.detectChanges();
    try {
      await lastValueFrom(this.partyService.setDefaultPlaylist(this.partyId, playlist.id));
      this.goToBlacklist();
    } catch {
      this.error = 'Playlist konnte nicht gespeichert werden. Bitte versuche es erneut.';
      this.isSaving = false;
      this.cd.detectChanges();
    }
  }

  /**
   * Restarts the Spotify login with the account chooser (`switchAccount=true` →
   * `show_dialog=true`); otherwise Spotify silently reuses the Free account the browser
   * is still signed in with.
   */
  switchAccount() {
    if (!this.partyId) return;
    window.location.href = this.switchAccountUrl();
  }

  /** Login URL for {@link switchAccount}; separate so tests don't have to navigate. */
  switchAccountUrl(): string {
    return `/api/party/${encodeURIComponent(this.partyId ?? '')}/spotify/login?source=web&switchAccount=true`;
  }

  skip() {
    this.goToBlacklist();
  }

  /** Next setup step: the host can block words, artists and songs before the party starts. */
  private goToBlacklist() {
    this.router.navigate(['/select-blacklist'], { queryParams: { partyId: this.partyId } });
  }
}
