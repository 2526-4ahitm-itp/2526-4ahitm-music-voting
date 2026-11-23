import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MvIcon } from './mv-icon';
import { ThemeService } from './theme.service';

/**
 * "Heller Modus" switch for the top bar of every stage page except the TV.
 * A real button with role="switch", so screen readers announce the state.
 * Icon-only (moon in dark, sun in light) on every width, so it looks the same
 * everywhere (team decision F2, 2026-11-23); the tooltip names the target mode.
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
      /* Round 44 px target: the minimum touch size, no text to make room for. */
      width: 44px;
      height: 44px;
      padding: 0;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--mv-stage-tint-2);
      color: var(--mv-on-stage);
      cursor: pointer;
    }
    .toggle:hover {
      background: var(--mv-stage-tint-4);
    }
  `,
})
export class MvThemeToggle {
  readonly theme = inject(ThemeService);
  readonly isLight = computed(() => this.theme.theme() === 'light');
}
