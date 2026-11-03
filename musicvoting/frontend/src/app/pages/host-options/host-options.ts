import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PartyService } from '../../services/party.service';
import { lastValueFrom } from 'rxjs';
import { MvIcon } from '../../shared/mv-icon';
import { MvThemeToggle } from '../../shared/mv-theme-toggle';

type Mode = 'menu' | 'pin-dashboard' | 'pin-startpage';

@Component({
  selector: 'app-host-options',
  standalone: true,
  imports: [CommonModule, FormsModule, MvIcon, MvThemeToggle],
  templateUrl: './host-options.html',
  // Shared stage look first, page layout second.
  styleUrls: ['../../shared/stage.css', './host-options.css'],
})
/**
 * Host entry: create a party, or reopen the dashboard / player of a running
 * party with the Gastgeber-PIN.
 */
export class HostOptions {
  private router = inject(Router);
  private partyService = inject(PartyService);

  mode = signal<Mode>('menu');
  pin = signal('');
  isLoading = signal(false);
  error = signal<string | null>(null);

  goCreateParty() {
    this.router.navigate(['/create-party']);
  }

  showPinEntry(target: 'pin-dashboard' | 'pin-startpage') {
    this.pin.set('');
    this.error.set(null);
    this.mode.set(target);
  }

  backToMenu() {
    this.mode.set('menu');
    this.error.set(null);
  }

  async submitPin() {
    const trimmed = this.pin().trim();
    if (!trimmed) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      await lastValueFrom(this.partyService.resolveHostPin(trimmed));
      const dest = this.mode() === 'pin-dashboard' ? '/dashboard' : '/startpage';
      this.router.navigate([dest]);
    } catch (err: any) {
      const status = err?.status;
      if (status === 404) {
        this.error.set('Party nicht gefunden. Bitte überprüfe den PIN.');
      } else {
        this.error.set('Fehler beim Laden der Party. Bitte versuche es erneut.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
