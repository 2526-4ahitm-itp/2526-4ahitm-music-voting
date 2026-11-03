import { ChangeDetectorRef, Component, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { PartyService } from '../../services/party.service';
import { MvIcon } from '../../shared/mv-icon';
import { MvThemeToggle } from '../../shared/mv-theme-toggle';

/**
 * Last host setup step, "Deine Party ist bereit" (host spec "Host Setup Ends
 * with a Go-Live Step", design D8).
 *
 * Hosts often did not know that the player has to run on the device at the TV,
 * so this page explains it, opens the player and shows the Voting-PIN. It
 * switches to "Party ist live 🎉" once a player has registered as the playback
 * device, whether on this device or another one.
 */
@Component({
  selector: 'app-party-ready',
  standalone: true,
  imports: [MvIcon, MvThemeToggle],
  templateUrl: './party-ready.html',
  // Shared stage look first, page layout second.
  styleUrls: ['../../shared/stage.css', './party-ready.css'],
})
export class PartyReady implements OnInit, OnDestroy {
  /**
   * The backend sends no event when a device registers, so the page polls
   * `GET /track/current` (`deviceActive`, playback spec "Playback Device
   * Availability Exposed to Clients"). Three seconds is quick enough for a
   * host walking from the phone to the TV and cheap for the backend.
   */
  static readonly POLL_MS = 3000;

  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private partyService = inject(PartyService);
  private cd = inject(ChangeDetectorRef);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  partyId: string | null = null;
  pin: string | null = null;
  live = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  async ngOnInit() {
    const partyIdFromUrl = this.route.snapshot.queryParamMap.get('partyId');
    if (partyIdFromUrl) {
      this.partyService.setCurrentPartyId(partyIdFromUrl);
    }
    this.partyId = this.partyService.currentPartyId;
    if (!this.partyId) {
      // Without a party there is nothing to open; same fallback as the other setup pages.
      this.router.navigate(['/']);
      return;
    }

    // Show the stored PIN immediately, then refresh it from the backend.
    this.pin = this.partyService.currentPin;
    this.cd.detectChanges();

    // Polling and window.open only make sense in a real browser, not during SSR.
    if (!this.isBrowser) return;

    this.loadPin();
    await this.checkDevice();
    if (!this.live) {
      this.pollTimer = setInterval(() => this.checkDevice(), PartyReady.POLL_MS);
    }
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  /** Opens the player for this party in a new window on the same device. */
  openPlayer() {
    window.open(`/startpage?partyId=${encodeURIComponent(this.partyId ?? '')}`, '_blank');
  }

  goToDashboard() {
    this.router.navigate(['/dashboard'], { queryParams: { partyId: this.partyId } });
  }

  private async loadPin() {
    try {
      const party = await lastValueFrom(this.partyService.getParty(this.partyId!));
      if (party?.pin) {
        this.pin = party.pin;
        this.cd.detectChanges();
      }
    } catch {
      // Keep the stored PIN; the dashboard shows it again anyway.
    }
  }

  /** Asks whether a player is registered; on success stops polling for good. */
  private async checkDevice() {
    if (this.live) return;
    try {
      const res: any = await lastValueFrom(this.http.get(`/api/party/${this.partyId}/track/current`));
      if (res?.deviceActive === true) {
        this.live = true;
        this.stopPolling();
        this.cd.detectChanges();
      }
    } catch {
      // A failed check is not an error for the host; the next poll tries again.
    }
  }

  private stopPolling() {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
