import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';
import { MvIcon } from './mv-icon';

/**
 * Outlet for ToastService messages.
 *
 * Both live regions are always in the DOM (empty when idle) because screen
 * readers only announce changes inside a region that already exists. Place
 * one <mv-toast> per page; it sits at the bottom of the guest page (thumb zone).
 */
@Component({
  selector: 'mv-toast',
  standalone: true,
  imports: [MvIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="region" aria-live="polite" aria-atomic="true">
      @if (toast.current(); as t) {
        @if (t.kind === 'info') {
          <div class="toast">
            @if (t.icon) {
              <span class="badge" aria-hidden="true"><mv-icon [name]="t.icon" [size]="18" [filled]="t.icon === 'heart'" [strokeWidth]="3" /></span>
            }
            <span class="text">{{ t.text }}</span>
            @if (t.actionLabel) {
              <button type="button" class="action" (click)="toast.runAction()">{{ t.actionLabel }}</button>
            }
          </div>
        }
      }
    </div>
    <div class="region" role="alert" aria-atomic="true">
      @if (toast.current(); as t) {
        @if (t.kind === 'error') {
          <div class="toast error"><span>{{ t.text }}</span></div>
        }
      }
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      left: 50%;
      bottom: var(--mv-toast-offset, calc(env(safe-area-inset-bottom, 0px) + 1.5rem));
      transform: translateX(-50%);
      z-index: 1000;
      width: min(92vw, 420px);
      pointer-events: none;
    }
    .region:empty {
      display: none;
    }
    .toast {
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--mv-space-3);
      padding: var(--mv-space-3) var(--mv-space-4);
      border-radius: var(--mv-radius-card);
      /* Filled brand colour, bold text and an icon: confirmations must be noticed at a
         glance at a party (guest spec "Guest Confirmations Stand Out"). White on
         Stage Purple is above 7:1. */
      background: var(--mv-purple);
      color: var(--mv-on-accent);
      font-family: var(--mv-font-text);
      font-size: 1.0625rem;
      font-weight: 700;
      box-shadow: 0 10px 32px rgba(29, 10, 36, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.18);
      animation: mv-toast-in var(--mv-duration-base) var(--mv-ease-out);
    }
    .toast.error {
      background: var(--mv-danger);
    }
    .text {
      flex: 1;
    }
    .badge {
      flex: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.2);
      color: var(--mv-on-accent);
    }
    .action {
      appearance: none;
      border: 0;
      background: none;
      color: #FFD7D1;
      font: inherit;
      font-weight: 700;
      text-decoration: underline;
      text-underline-offset: 3px;
      cursor: pointer;
      padding: var(--mv-space-2);
      margin: calc(var(--mv-space-2) * -1);
      min-height: 44px;
    }
    @keyframes mv-toast-in {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
    }
  `,
})
export class MvToast {
  readonly toast = inject(ToastService);
}
