import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Single-line "powered by HTL Leonding" credit.
 *
 * MusicVoting must stay recognisable as an HTL Leonding school project
 * (PRODUCT.md), but the credit must not compete with the music. It is shown
 * only on the TV dashboard and the landing page (web-ui spec "HTL Credit
 * Appears as a Footer on TV and Landing Page").
 */
@Component({
  selector: 'mv-credit-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.on-dark]': "tone() === 'dark'" },
  template: `
    <span>powered by</span>
    <img src="assets/img/htl-leonding-logo.jpg" alt="HTL Leonding" />
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--mv-space-2);
      font-family: var(--mv-font-text);
      font-size: 0.875rem;
      font-weight: 500;
      letter-spacing: 0.02em;
      color: var(--mv-ink-muted);
    }
    :host(.on-dark) {
      color: var(--mv-on-stage-muted);
    }
    img {
      height: 1.5em;
      width: auto;
      border-radius: 4px;
      background: #fff;
      padding: 2px 4px;
    }
  `,
})
export class MvCreditFooter {
  /** 'dark' for the TV stage, 'light' for the landing page. */
  readonly tone = input<'light' | 'dark'>('light');
}
