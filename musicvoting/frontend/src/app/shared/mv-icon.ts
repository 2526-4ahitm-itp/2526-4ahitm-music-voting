import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Renderer2,
  effect,
  inject,
  input,
} from '@angular/core';
import {
  ArrowLeft,
  Ban,
  Check,
  ChevronRight,
  Copy,
  Crown,
  Disc3,
  Heart,
  KeyRound,
  ListMusic,
  LucideIconData,
  Menu,
  MonitorPlay,
  Moon,
  Music,
  Pause,
  Play,
  Plus,
  QrCode,
  Search,
  ShieldBan,
  SkipBack,
  SkipForward,
  Sun,
  Trash2,
  Tv,
  Users,
  X,
} from 'lucide-angular';

/**
 * Registry of the Lucide icons the app uses. Listing them here (instead of
 * registering the whole set) keeps the bundle to the icons we actually draw.
 */
const ICONS = {
  'arrow-left': ArrowLeft,
  ban: Ban,
  check: Check,
  'chevron-right': ChevronRight,
  copy: Copy,
  crown: Crown,
  disc: Disc3,
  heart: Heart,
  key: KeyRound,
  'list-music': ListMusic,
  menu: Menu,
  'monitor-play': MonitorPlay,
  moon: Moon,
  music: Music,
  pause: Pause,
  play: Play,
  plus: Plus,
  'qr-code': QrCode,
  search: Search,
  'shield-ban': ShieldBan,
  'skip-back': SkipBack,
  'skip-forward': SkipForward,
  sun: Sun,
  trash: Trash2,
  tv: Tv,
  users: Users,
  x: X,
} satisfies Record<string, LucideIconData>;

export type MvIconName = keyof typeof ICONS;

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Drawn icon from the Lucide set (MIT). Replaces the emoji and ad-hoc SVGs
 * used as icons before, so every icon shares one stroke and weight.
 *
 * Only the icon *data* comes from lucide-angular; the SVG is built here with
 * Renderer2. The package's own component is an NgModule-era component that
 * needs icon providers; building the few nodes ourselves keeps the component
 * standalone, SSR-safe and free of global registration.
 *
 * Icons are always decorative: the accessible name belongs on the
 * surrounding button (aria-label), so the SVG is hidden from assistive
 * technology.
 */
@Component({
  selector: 'mv-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: '',
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
      flex-shrink: 0;
    }
  `,
})
export class MvIcon {
  readonly name = input.required<MvIconName>();
  readonly size = input(24);
  readonly strokeWidth = input(2);
  /** Fill the shape with the current colour (used for the liked heart). */
  readonly filled = input(false);

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);

  constructor() {
    // Rebuild the SVG whenever an input changes; icons are tiny, so a full
    // rebuild is simpler than patching attributes.
    effect(() => this.render(ICONS[this.name()], this.size(), this.strokeWidth(), this.filled()));
  }

  private render(data: LucideIconData, size: number, stroke: number, filled: boolean): void {
    const el = this.host.nativeElement;
    for (const child of Array.from(el.childNodes)) this.renderer.removeChild(el, child);

    const svg = this.renderer.createElement('svg', SVG_NS);
    const attrs: Record<string, string> = {
      xmlns: SVG_NS,
      width: String(size),
      height: String(size),
      viewBox: '0 0 24 24',
      fill: filled ? 'currentColor' : 'none',
      stroke: 'currentColor',
      'stroke-width': String(stroke),
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      focusable: 'false',
    };
    for (const [key, value] of Object.entries(attrs)) this.renderer.setAttribute(svg, key, value);

    for (const [tag, nodeAttrs] of data) {
      const node = this.renderer.createElement(tag, SVG_NS);
      for (const [key, value] of Object.entries(nodeAttrs)) {
        this.renderer.setAttribute(node, key, String(value));
      }
      this.renderer.appendChild(svg, node);
    }
    this.renderer.appendChild(el, svg);
  }
}
