import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PartyService } from '../../services/party.service';

@Component({
  selector: 'app-create-party',
  standalone: true,
  imports: [],
  templateUrl: './create-party.html',
  styleUrl: './create-party.css',
})
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
    this.router.navigate(['/']);
  }
}
