import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

/** Bundled image shown whenever a cover is missing or fails to load. */
export const COVER_PLACEHOLDER = 'assets/img/placeholder.png';

/** Minimal shape of a provider image (Spotify returns them largest first). */
export interface CoverImage {
  url: string;
  width?: number | null;
  height?: number | null;
}

/**
 * The one place that renders an album or artist cover.
 *
 * Before this component every page wrote its own <img> with different (and
 * sometimes broken) fallbacks, and some indexed into `images` without a
 * guard. Here the image is picked safely and replaced by the placeholder when
 * the URL is missing, the array is empty or the request fails (web-ui spec
 * "Cover Images Have a Working Fallback"). Covers sit next to the song title,
 * so they are decorative and use alt="".
 *
 * Size the component from the caller's CSS (width/height on the host); the
 * image fills it.
 */
@Component({
  selector: 'mv-cover',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<img [src]="src()" alt="" [attr.loading]="eager() ? null : 'lazy'" decoding="async" (error)="onError()" />`,
  styles: `
    :host {
      display: block;
      overflow: hidden;
      border-radius: var(--mv-radius-sm);
      background: var(--mv-surface-sunken);
      flex-shrink: 0;
    }
    :host([shape='round']) {
      border-radius: 50%;
    }
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
})
export class MvCover {
  /** Provider images, largest first (Spotify order). May be empty or missing. */
  readonly images = input<CoverImage[] | null | undefined>(undefined);
  /** A single image URL, used instead of `images` when the API returns one. */
  readonly url = input<string | null | undefined>(undefined);
  /** 'large' picks the biggest image (TV, now playing), 'small' the smallest (lists). */
  readonly size = input<'large' | 'small'>('small');
  /** Above-the-fold covers load eagerly; list covers lazily. */
  readonly eager = input(false);

  /** Set once the chosen image failed, so the placeholder is shown instead. */
  private readonly failed = signal(false);

  /** The URL to render: a safe pick from the inputs, or the placeholder. */
  readonly src = computed(() => {
    if (this.failed()) return COVER_PLACEHOLDER;
    const direct = this.url();
    if (direct) return direct;
    const list = (this.images() ?? []).filter((img) => !!img?.url);
    if (list.length === 0) return COVER_PLACEHOLDER;
    return this.size() === 'large' ? list[0].url : list[list.length - 1].url;
  });

  /** Swap to the placeholder; ignore errors of the placeholder itself to avoid a loop. */
  onError(): void {
    if (this.src() !== COVER_PLACEHOLDER) this.failed.set(true);
  }
}
