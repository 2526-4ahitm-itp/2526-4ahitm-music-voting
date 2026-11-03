import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PartyService } from '../services/party.service';
import { MvIcon, MvIconName } from './mv-icon';

/** Pages the host menu can mark as current. */
export type HostMenuPage = 'dashboard' | 'voting' | 'search' | 'blacklist';

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
 * It replaces the side menu that was copied into host-dashboard, search-host
 * and voting-host. The old "Startseite" entry is gone because it left the
 * host context; "Blacklist" is new so the host can edit the full blacklist
 * during the party (host spec "Host Manages Party Blacklist").
 *
 * The burger sits in the sticky top bar of each host page (.host-top in
 * shared/stage.css), so it is always reachable while scrolling.
 */
@Component({
  selector: 'mv-host-menu',
  standalone: true,
  imports: [RouterLink, MvIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Escape closes the panel, as keyboard users expect from an overlay.
  host: { '(document:keydown.escape)': 'close()' },
  template: `
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

    <nav #panel id="mv-host-menu-panel" class="panel" [class.open]="open()" aria-label="Gastgeber-Menü" [attr.inert]="open() ? null : ''">
      <div class="panel-head">
        <span class="brand">MusicVoting</span>
        <button #closeBtn type="button" class="close" aria-label="Menü schließen" (click)="close()">
          <mv-icon name="x" [size]="22" />
        </button>
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

    @if (open()) {
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
    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--mv-space-4);
    }
    .brand {
      font-family: var(--mv-font-display);
      font-size: 1.375rem;
      font-weight: 750;
      color: var(--mv-on-stage);
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

  private readonly party = inject(PartyService);

  /** Entries are computed on access so the blacklist link carries the current party id. */
  entries(): MenuEntry[] {
    const partyId = this.party.currentPartyId;
    return [
      { page: 'dashboard', label: 'Dashboard', icon: 'list-music', link: '/dashboard' },
      { page: 'voting', label: 'Voting', icon: 'heart', link: '/voting-host' },
      { page: 'search', label: 'Suchen', icon: 'search', link: '/search-host' },
      {
        page: 'blacklist',
        label: 'Blacklist',
        icon: 'shield-ban',
        link: '/select-blacklist',
        query: partyId ? { partyId, mode: 'edit' } : { mode: 'edit' },
      },
    ];
  }

  private readonly injector = inject(Injector);
  private readonly burger = viewChild.required<ElementRef<HTMLButtonElement>>('burger');
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly closeBtn = viewChild.required<ElementRef<HTMLButtonElement>>('closeBtn');

  toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.open.set(true);
    // Keyboard users land inside the panel. The panel is inert until the next
    // render, so focusing right away would silently fail.
    afterNextRender(() => this.closeBtn().nativeElement.focus(), { injector: this.injector });
  }

  close(): void {
    if (!this.open()) return;
    // The panel turns inert on close; focus inside it would fall back to <body>
    // and keyboard users would start over at the top (WCAG 2.4.3). Hand it back
    // to the burger. Clicks elsewhere (overlay, a menu link) keep their own focus.
    const focusInPanel = this.panel().nativeElement.contains(document.activeElement);
    this.open.set(false);
    if (focusInPanel) this.burger().nativeElement.focus();
  }
}
