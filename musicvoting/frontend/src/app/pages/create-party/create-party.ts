import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PartyService } from '../../services/party.service';
import { MvIcon } from '../../shared/mv-icon';
import { MvSpinner } from '../../shared/mv-spinner';
import { MvThemeToggle } from '../../shared/mv-theme-toggle';

@Component({
  selector: 'app-create-party',
  standalone: true,
  imports: [MvIcon, MvSpinner, MvThemeToggle],
  templateUrl: './create-party.html',
  // Shared stage look first, page layout second.
  styleUrls: ['../../shared/stage.css', './create-party.css'],
})
/**
 * Creates a party and hands over to the provider login. Spotify is the only
 * selectable provider (host spec "Only Supported Providers Are Selectable"),
 * so create() always asks for Spotify.
 */
export class CreateParty {
  isLoading = false;
  error: string | null = null;

  constructor(private partyService: PartyService, private router: Router) {}

  create() {
    this.isLoading = true;
    this.error = null;
    this.partyService.createParty('spotify').subscribe({
      next: (res) => {
        window.location.href = `/api/party/${res.id}/spotify/login?source=web`;
      },
      error: () => {
        this.isLoading = false;
        this.error = 'Party konnte nicht erstellt werden. Bitte versuche es erneut.';
      }
    });
  }

  goBack() {
    this.router.navigate(['/host-options']);
  }
}
