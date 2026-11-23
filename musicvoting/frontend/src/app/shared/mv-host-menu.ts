import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, afterNextRender, inject, input, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { PartyService } from '../services/party.service';
import { MvIcon, MvIconName } from './mv-icon';

/** Pages the host menu can mark as current. */
export type HostMenuPage = 'dashboard' | 'blacklist';

interface MenuEntry {
  page: HostMenuPage;
  label: string;
  icon: MvIconName;
  link: string;
  query?: Record<string, string>;
}

/**
 * Burger button plus slide-in navigation for the host pages.
 *
 * It replaces the side menu that was copied into host-dashboard and the former
 * host search and voting pages. The old "Startseite" entry is gone because it left the
 * host context; "Blacklist" is new so the host can edit the full blacklist
 * during the party (host spec "Host Manages Party Blacklist"). "Voting" and
 * "Suchen" are gone too: the dashboard holds the whole queue and the song
 * search (host spec "Host Navigation Adapts to Screen Width").
 *
 * The head shows the logo and a "Party läuft · <Voting-PIN>" badge, so the
 * host bar names the product and the running party instead of plain text.
 *
 * The burger sits in the sticky top bar of each host page (.host-top in
 * shared/stage.css), so it is always reachable while scrolling.
 *
 * From 1024 px the same navigation is a permanently visible side rail
 * instead (task 8.4): on a laptop next to the TV the host switches pages
 * often, and two clicks per switch for a hidden menu were a point of the
 * critique. stage.css makes room for the rail on every page that contains
 * this component.
 */
@Component({
  selector: 'mv-host-menu',
  standalone: true,
  imports: [RouterLink, MvIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Escape closes the panel, as keyboard users expect from an overlay.
  host: { '(document:keydown.escape)': 'close()' },
  template: `
    @if (!rail()) {
    <button
      #burger
      type="button"
      class="burger"
      aria-label="Menü öffnen"
      [attr.aria-expanded]="open()"
      aria-controls="mv-host-menu-panel"
      (click)="toggle()">
      <mv-icon name="menu" [size]="26" />
    </button>
    }

    <!-- As a rail the panel is always reachable, so it is only inert while it is a closed slide-in. -->
    <nav #panel id="mv-host-menu-panel" class="panel" [class.open]="open()" [class.rail]="rail()"
         aria-label="Gastgeber-Menü" [attr.inert]="rail() || open() ? null : ''">
      <div class="panel-head">
        <span class="brand">
          <!-- The logo stands for the name, so it carries it as alt text. -->
          <img class="brand-logo" src="assets/img/logo-mark.png" width="146" height="192" alt="MusicVoting" />
          @if (pin(); as p) {
            <span class="live-badge"><span class="live-dot" aria-hidden="true"></span>Party läuft · {{ p }}</span>
          }
        </span>
        @if (!rail()) {
          <button #closeBtn type="button" class="close" aria-label="Menü schließen" (click)="close()">
            <mv-icon name="x" [size]="22" />
          </button>
        }
      </div>
      <ul>
        @for (entry of entries(); track entry.page) {
          <li>
            <a
              [routerLink]="entry.link"
              [queryParams]="entry.query"
              [class.active]="entry.page === active()"
              [attr.aria-current]="entry.page === active() ? 'page' : null"
              (click)="close()">
              <mv-icon [name]="entry.icon" [size]="20" />
              <span>{{ entry.label }}</span>
            </a>
          </li>
        }
      </ul>
    </nav>

    @if (open() && !rail()) {
      <div class="overlay" (click)="close()"></div>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .burger,
    .close {
      appearance: none;
      border: 0;
      background: none;
      color: inherit;
      cursor: pointer;
      width: 44px;
      height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--mv-radius-sm);
    }
    .panel {
      position: fixed;
      inset: 0 auto 0 0;
      width: min(280px, 80vw);
      /* Dark panel matching the host stage. */
      background: var(--mv-stage-raised);
      color: var(--mv-on-stage);
      box-shadow: 4px 0 32px rgba(0, 0, 0, 0.5);
      transform: translateX(-105%);
      transition: transform var(--mv-duration-base) var(--mv-ease-out);
      z-index: 1100;
      padding: var(--mv-space-4);
      box-sizing: border-box;
    }
    .panel.open {
      transform: none;
    }
    /* Rail (from 1024 px): always in place, no slide, no overlay shadow. Its width
       is the --mv-host-rail-width token that stage.css also uses as page offset. */
    .panel.rail {
      width: var(--mv-host-rail-width);
      transform: none;
      transition: none;
      box-shadow: inset -1px 0 0 var(--mv-stage-tint-1);
      z-index: 60;
    }
    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--mv-space-4);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: var(--mv-space-3);
      min-width: 0;
    }
    .brand-logo {
      height: 40px;
      width: auto;
      flex: none;
    }
    .live-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: var(--mv-radius-pill);
      background: var(--mv-stage-tint-2);
      color: var(--mv-on-stage);
      font-size: 0.8125rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--mv-stage-accent);
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--mv-space-1);
    }
    a {
      display: flex;
      align-items: center;
      gap: var(--mv-space-3);
      min-height: 48px;
      padding: 0 var(--mv-space-3);
      border-radius: var(--mv-radius-sm);
      color: var(--mv-on-stage);
      text-decoration: none;
      font-weight: 600;
      font-size: 1.0625rem;
    }
    a:hover {
      background: var(--mv-stage-tint-1);
    }
    a.active {
      background: var(--mv-stage-highlight);
      color: var(--mv-on-stage);
    }
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1050;
    }
  `,
})
export class MvHostMenu {
  /** The page the menu is shown on; its entry is marked as current. */
  readonly active = input.required<HostMenuPage>();

  readonly open = signal(false);

  /** Viewport width from which the navigation is a rail; must match stage.css. */
  static readonly RAIL_QUERY = '(min-width: 1024px)';

  /** True while the viewport is wide enough for the rail (follows window resizes). */
  readonly rail = signal(false);

  constructor() {
    // matchMedia is missing outside a browser (SSR, some test setups): then stay a burger.
    const mql = typeof window !== 'undefined' ? window.matchMedia?.(MvHostMenu.RAIL_QUERY) : undefined;
    if (!mql) return;
    this.rail.set(mql.matches);
    const onChange = (e: MediaQueryListEvent) => {
      this.rail.set(e.matches);
      // Growing past 1024 px while the slide-in is open: the rail replaces it, nothing to close.
      if (e.matches) this.open.set(false);
    };
    mql.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => mql.removeEventListener('change', onChange));
  }

  private readonly party = inject(PartyService);

  /** Voting-PIN of the running party for the badge; null hides the badge. */
  readonly pin = toSignal(this.party.pin$, { initialValue: null as string | null });

  /** Entries are computed on access so the blacklist link carries the current party id. */
  entries(): MenuEntry[] {
    const partyId = this.party.currentPartyId;
    return [
      { page: 'dashboard', label: 'Dashboard', icon: 'list-music', link: '/dashboard' },
      {
        page: 'blacklist',
        label: 'Blocklist',
        icon: 'shield-ban',
        link: '/select-blacklist',
        query: partyId ? { partyId, mode: 'edit' } : { mode: 'edit' },
      },
    ];
  }

  private readonly injector = inject(Injector);
  // Burger and close button only exist below 1024 px, so they are optional queries.
  private readonly burger = viewChild<ElementRef<HTMLButtonElement>>('burger');
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly closeBtn = viewChild<ElementRef<HTMLButtonElement>>('closeBtn');

  toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.open.set(true);
    // Keyboard users land inside the panel. The panel is inert until the next
    // render, so focusing right away would silently fail.
    afterNextRender(() => this.closeBtn()?.nativeElement.focus(), { injector: this.injector });
  }

  close(): void {
    if (!this.open()) return;
    // The panel turns inert on close; focus inside it would fall back to <body>
    // and keyboard users would start over at the top (WCAG 2.4.3). Hand it back
    // to the burger. Clicks elsewhere (overlay, a menu link) keep their own focus.
    const focusInPanel = this.panel().nativeElement.contains(document.activeElement);
    this.open.set(false);
    if (focusInPanel) this.burger()?.nativeElement.focus();
  }
}
