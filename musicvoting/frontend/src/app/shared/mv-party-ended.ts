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
    <div class="host-stage ended">
      <div class="panel host-card">
        <span class="icon"><mv-icon name="music" [size]="40" /></span>
        <h2>Die Party ist beendet.</h2>
        <p>Danke fürs Mitfeiern!</p>
        <button type="button" class="home host-btn large primary" (click)="goHome()">Zur Startseite</button>
      </div>
    </div>
  `,
  // Same stage background and card as every other page (web-ui spec "Every
  // Web Page Uses the Stage Look") instead of the old full gradient fill.
  styleUrls: ['./stage.css'],
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 2000;
    }
    .ended {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--mv-space-5);
      text-align: center;
    }
    .panel {
      max-width: 22rem;
      width: 100%;
    }
    .icon {
      display: inline-flex;
      width: 5rem;
      height: 5rem;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: var(--mv-purple);
      color: var(--mv-on-accent);
      margin-bottom: var(--mv-space-4);
    }
    h2 {
      margin: 0 0 var(--mv-space-2);
      font-family: var(--mv-font-display);
      font-size: 1.75rem;
      font-weight: 750;
    }
    p {
      margin: 0 0 var(--mv-space-6);
      font-size: 1.125rem;
      color: var(--mv-on-stage-muted);
    }
  `,
})
export class MvPartyEnded {
  private readonly router = inject(Router);

  goHome(): void {
    this.router.navigate(['/']);
  }
}
