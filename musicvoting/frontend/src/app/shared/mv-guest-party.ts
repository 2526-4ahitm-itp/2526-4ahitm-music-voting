import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { PartyService } from '../services/party.service';
import { MvIcon } from './mv-icon';

/**
 * "Party 12345" plus "Party verlassen" in the top bar of both guest views
 * (guest spec "Guest Sees Which Party They Are In", task 8.5).
 *
 * Guests often have several parties in their history (or none in mind at
 * all); the Voting-PIN tells them where their likes go, and it is the code
 * they can read out to a friend. Leaving asks first, because getting back in
 * needs the PIN or the QR code again. Leaving clears only the party, not the
 * deviceId, so likes in a rejoined party still count as the same guest.
 */
@Component({
  selector: 'mv-guest-party',
  standalone: true,
  imports: [AsyncPipe, MvIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cancel()' },
  template: `
    @if (party.pin$ | async; as pin) {
      <span class="party-id">Party <strong>{{ pin }}</strong></span>
    }
    <button #leaveBtn type="button" class="leave" (click)="open()"
            [attr.aria-expanded]="confirming()" aria-controls="mv-guest-leave">
      <mv-icon name="log-out" [size]="16" />
      Party verlassen
    </button>

    @if (confirming()) {
      <div id="mv-guest-leave" class="confirm" role="alertdialog" aria-labelledby="mv-guest-leave-q">
        <p id="mv-guest-leave-q"><strong>Party wirklich verlassen?</strong></p>
        <p class="hint">Zurück kommst du nur mit der PIN oder dem QR-Code.</p>
        <div class="buttons">
          <button #confirmBtn type="button" class="host-btn danger" (click)="leave()">Ja, verlassen</button>
          <button type="button" class="host-btn" (click)="cancel()">Abbrechen</button>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0 var(--mv-space-3);
      font-size: 0.875rem;
      color: var(--mv-on-stage-muted);
    }
    .party-id strong {
      color: var(--mv-on-stage);
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.04em;
    }
    /* Text button: small type, but a full 44 px touch target. */
    .leave {
      appearance: none;
      border: 0;
      background: none;
      color: var(--mv-on-stage);
      font: inherit;
      font-weight: 600;
      min-height: 44px;
      padding: 0 var(--mv-space-1);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .confirm {
      position: absolute;
      top: 100%;
      left: 0;
      z-index: 60;
      width: min(320px, calc(100vw - 32px));
      box-sizing: border-box;
      padding: var(--mv-space-4);
      border-radius: 16px;
      background: var(--mv-stage-raised);
      color: var(--mv-on-stage);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
      font-size: 1rem;
    }
    .confirm p {
      margin: 0 0 var(--mv-space-2);
    }
    .hint {
      font-size: 0.875rem;
      color: var(--mv-on-stage-muted);
    }
    .buttons {
      display: flex;
      flex-wrap: wrap;
      gap: var(--mv-space-2);
      margin-top: var(--mv-space-3);
    }
    /* Same look as .host-btn in stage.css; repeated because component styles are encapsulated. */
    .host-btn {
      appearance: none;
      border: 0;
      min-height: 44px;
      padding: 0 var(--mv-space-4);
      border-radius: var(--mv-radius-pill);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      background: var(--mv-stage-tint-2);
      color: var(--mv-on-stage);
    }
    .host-btn:hover {
      background: var(--mv-stage-tint-4);
    }
    .host-btn.danger {
      background: var(--mv-danger);
      color: var(--mv-on-accent);
    }
  `,
})
export class MvGuestParty {
  protected readonly party = inject(PartyService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  /** True while the "Party wirklich verlassen?" question is open. */
  readonly confirming = signal(false);

  private readonly leaveBtn = viewChild.required<ElementRef<HTMLButtonElement>>('leaveBtn');
  private readonly confirmBtn = viewChild<ElementRef<HTMLButtonElement>>('confirmBtn');

  /** Opens the question; focus moves into it once it is rendered, so keyboard users land on it. */
  open(): void {
    this.confirming.set(true);
    afterNextRender(() => this.confirmBtn()?.nativeElement.focus(), { injector: this.injector });
  }

  /** Clears the party (not the deviceId) and returns to the start page. */
  leave(): void {
    this.confirming.set(false);
    this.party.clearParty();
    this.router.navigate(['/']);
  }

  /** Closes the question and hands focus back to "Party verlassen" (WCAG 2.4.3). */
  cancel(): void {
    if (!this.confirming()) return;
    this.confirming.set(false);
    this.leaveBtn().nativeElement.focus();
  }
}
