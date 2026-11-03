import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MvIcon } from './mv-icon';

/**
 * Full-screen goodbye shown to guests when the host ends the party.
 *
 * Before, guests were silently thrown back to the landing page. A clear end
 * matters (peak-end rule), so the guest gets a short thank-you and decides
 * when to leave (guest spec "Guest Sees a Clear End of the Party").
 */
@Component({
  selector: 'mv-party-ended',
  standalone: true,
  imports: [MvIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'alert' },
  template: `
    <div class="panel">
      <span class="icon"><mv-icon name="music" [size]="40" /></span>
      <h2>Die Party ist beendet.</h2>
      <p>Danke fürs Mitfeiern!</p>
      <button type="button" class="home" (click)="goHome()">Zur Startseite</button>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--mv-space-5);
      background: var(--mv-gradient-ink);
      color: var(--mv-on-accent);
      text-align: center;
    }
    .panel {
      max-width: 22rem;
    }
    .icon {
      display: inline-flex;
      width: 5rem;
      height: 5rem;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.16);
      margin-bottom: var(--mv-space-4);
    }
    h2 {
      margin: 0 0 var(--mv-space-2);
      font-size: 1.75rem;
      font-weight: 750;
    }
    p {
      margin: 0 0 var(--mv-space-6);
      font-size: 1.125rem;
    }
    .home {
      appearance: none;
      border: 0;
      min-height: 52px;
      padding: 0 var(--mv-space-6);
      border-radius: var(--mv-radius-pill);
      background: var(--mv-surface);
      color: var(--mv-purple-deep);
      font: inherit;
      font-weight: 700;
      font-size: 1.0625rem;
      cursor: pointer;
    }
  `,
})
export class MvPartyEnded {
  private readonly router = inject(Router);

  goHome(): void {
    this.router.navigate(['/']);
  }
}
