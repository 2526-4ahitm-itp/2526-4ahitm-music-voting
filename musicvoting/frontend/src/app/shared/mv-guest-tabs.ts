import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MvIcon } from './mv-icon';

/**
 * Floating bottom tab bar of the guest views (guest spec "Guest Bottom Tab
 * Navigation"): exactly "Voten" (/voting) and "Hinzufügen" (/guest), the
 * current one marked. Sits in the thumb zone and respects the safe area.
 * Shared so both guest views stay identical; uses the stage tokens, so it
 * follows the guest's dark/light choice.
 */
@Component({
  selector: 'mv-guest-tabs',
  standalone: true,
  imports: [RouterLink, MvIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="tabs" aria-label="Gast-Navigation">
      <a routerLink="/voting" class="tab" [class.active]="active() === 'voting'"
         [attr.aria-current]="active() === 'voting' ? 'page' : null">
        <mv-icon name="heart" [size]="20" [filled]="active() === 'voting'" />
        <span>Voten</span>
      </a>
      <a routerLink="/guest" class="tab" [class.active]="active() === 'add'"
         [attr.aria-current]="active() === 'add' ? 'page' : null">
        <mv-icon name="plus" [size]="20" [strokeWidth]="2.5" />
        <span>Hinzufügen</span>
      </a>
    </nav>
  `,
  styles: `
    :host {
      position: fixed;
      left: 50%;
      bottom: calc(env(safe-area-inset-bottom, 0px) + 2vh);
      transform: translateX(-50%);
      width: min(90vw, 450px);
      z-index: 1000;
    }
    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      padding: 4px;
      border-radius: 1.25rem;
      background: var(--mv-stage-raised);
      box-shadow: 0 10px 30px var(--mv-stage-shadow), inset 0 0 0 1px var(--mv-stage-tint-2);
    }
    .tab {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--mv-space-2);
      min-height: 3.5rem;
      border-radius: 1rem;
      color: var(--mv-on-stage);
      text-decoration: none;
      font-weight: 700;
      font-size: 1.0625rem;
    }
    .tab.active {
      background: var(--mv-purple);
      color: var(--mv-on-accent);
    }
    .tab:not(.active):active {
      background: var(--mv-stage-tint-3);
    }
  `,
})
export class MvGuestTabs {
  readonly active = input.required<'voting' | 'add'>();
}
