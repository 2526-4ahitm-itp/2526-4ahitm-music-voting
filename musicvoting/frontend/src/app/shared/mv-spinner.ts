import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Loading indicator with a screen-reader label. Replaces the spinner markup
 * and CSS that were copied into several pages.
 */
@Component({
  selector: 'mv-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status' },
  template: `<span class="ring"></span><span class="mv-visually-hidden">{{ label() }}</span>`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .ring {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 3px solid currentColor;
      border-right-color: transparent;
      opacity: 0.8;
      animation: mv-spin 0.8s linear infinite;
    }
    @keyframes mv-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class MvSpinner {
  readonly label = input('Lädt …');
}
