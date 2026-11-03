import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MvIcon } from './mv-icon';
import { ThemeService } from './theme.service';

/**
 * "Heller Modus" switch for the top bar of the host pages.
 * A real button with role="switch", so screen readers announce the state.
 */
@Component({
  selector: 'mv-theme-toggle',
  standalone: true,
  imports: [MvIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      role="switch"
      class="toggle"
      [attr.aria-checked]="isLight()"
      aria-label="Heller Modus"
      [title]="isLight() ? 'Dunklen Modus einschalten' : 'Hellen Modus einschalten'"
      (click)="theme.toggle()">
      <mv-icon [name]="isLight() ? 'sun' : 'moon'" [size]="20" />
      <span class="label">{{ isLight() ? 'Hell' : 'Dunkel' }}</span>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
      margin-left: auto;
    }
    .toggle {
      appearance: none;
      border: 0;
      min-height: 44px;
      padding: 0 var(--mv-space-3);
      border-radius: var(--mv-radius-pill);
      display: inline-flex;
      align-items: center;
      gap: var(--mv-space-2);
      background: var(--mv-stage-tint-2);
      color: var(--mv-on-stage);
      font: inherit;
      font-weight: 700;
      font-size: 0.9375rem;
      cursor: pointer;
    }
    .toggle:hover {
      background: var(--mv-stage-tint-4);
    }
    @media (max-width: 480px) {
      .label {
        display: none;
      }
    }
  `,
})
export class MvThemeToggle {
  readonly theme = inject(ThemeService);
  readonly isLight = computed(() => this.theme.theme() === 'light');
}
