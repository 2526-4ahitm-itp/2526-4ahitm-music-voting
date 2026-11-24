import { Injectable, OnDestroy, signal } from '@angular/core';

/**
 * Countdown after the backend rejected a guest add with 429 (guest spec "Web Guest Sees When
 * Adding Is Possible Again"): the guest sees how long to wait instead of only
 * "Zu viele Anfragen — bitte kurz warten.".
 *
 * App-wide singleton on purpose: the guest page is destroyed when the guest switches to the
 * voting tab, and the countdown has to be right when they come back. The service therefore
 * stores the end time and derives the remaining seconds from the clock instead of counting
 * ticks, so a late or skipped tick never makes it drift. Not persisted across a page reload —
 * the next add simply gets a new 429 with a fresh wait time.
 */
@Injectable({ providedIn: 'root' })
export class AddCooldownService implements OnDestroy {
  /** Used when the 429 carries no usable `retryAfterSeconds`: the length of the backend window. */
  static readonly FALLBACK_SECONDS = 60;

  /** Seconds until the guest may add again; 0 = no cooldown. */
  readonly secondsLeft = signal(0);

  /** End of the cooldown as epoch milliseconds. */
  private until = 0;
  private timer?: ReturnType<typeof setInterval>;

  /** Starts (or restarts) the countdown with the backend's wait time. */
  start(retryAfterSeconds: unknown): void {
    const seconds = typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? Math.ceil(retryAfterSeconds)
      : AddCooldownService.FALLBACK_SECONDS;
    this.until = Date.now() + seconds * 1000;
    this.tick();
    // One interval is enough; a restart only moves the end time.
    this.timer ??= setInterval(() => this.tick(), 1000);
  }

  /** True while the guest has to wait. */
  active(): boolean {
    return this.secondsLeft() > 0;
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  /** Recomputes the remaining seconds; stops the interval once the cooldown is over. */
  private tick(): void {
    const left = Math.max(0, Math.ceil((this.until - Date.now()) / 1000));
    this.secondsLeft.set(left);
    if (left === 0) {
      this.stopTimer();
    }
  }

  private stopTimer(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
