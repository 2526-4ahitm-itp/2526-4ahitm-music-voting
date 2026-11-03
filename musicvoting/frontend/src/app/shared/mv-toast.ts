import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

/**
 * Outlet for ToastService messages.
 *
 * Both live regions are always in the DOM (empty when idle) because screen
 * readers only announce changes inside a region that already exists. Place
 * one <mv-toast> per page; on guest pages it sits above the bottom tab bar.
 */
@Component({
  selector: 'mv-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="region" aria-live="polite" aria-atomic="true">
      @if (toast.current(); as t) {
        @if (t.kind === 'info') {
          <div class="toast">
            <span>{{ t.text }}</span>
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
      bottom: var(--mv-toast-offset, calc(env(safe-area-inset-bottom, 0px) + 6.5rem));
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
      background: var(--mv-ink);
      color: var(--mv-on-accent);
      font-family: var(--mv-font-text);
      font-size: 1rem;
      font-weight: 600;
      box-shadow: 0 6px 24px rgba(29, 10, 36, 0.28);
      animation: mv-toast-in var(--mv-duration-base) var(--mv-ease-out);
    }
    .toast.error {
      background: var(--mv-danger);
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
