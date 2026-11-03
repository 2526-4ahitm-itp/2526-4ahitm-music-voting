import { Injectable, signal } from '@angular/core';

/** One message shown in the shared toast area. */
export interface Toast {
  id: number;
  text: string;
  /** 'error' is announced assertively (role="alert"), 'info' politely. */
  kind: 'info' | 'error';
  /** Optional action, e.g. "Rückgängig". */
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Single source for short status messages ("Song hinzugefügt",
 * backend errors, "Song entfernt · Rückgängig").
 *
 * Pages call show(); the <mv-toast> outlet renders the current message in a
 * live region so screen readers announce it (web-ui spec "Status Changes Are
 * Announced"). Only one toast is visible at a time: a new message replaces
 * the old one, which keeps the area above the guest tab bar calm.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  /** Currently visible toast, or null. */
  readonly current = signal<Toast | null>(null);

  private nextId = 1;
  private timer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Shows a message for `durationMs` and returns its id.
   * `onExpire` runs when the toast times out on its own (not when it is
   * replaced, dismissed or its action is used); the undo-removal flow uses it
   * to send the deferred request.
   */
  show(
    text: string,
    options: {
      kind?: 'info' | 'error';
      durationMs?: number;
      actionLabel?: string;
      onAction?: () => void;
      onExpire?: () => void;
    } = {},
  ): number {
    this.clearTimer();
    const toast: Toast = {
      id: this.nextId++,
      text,
      kind: options.kind ?? 'info',
      actionLabel: options.actionLabel,
      onAction: options.onAction,
    };
    this.current.set(toast);
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.current()?.id === toast.id) this.current.set(null);
      options.onExpire?.();
    }, options.durationMs ?? 2000);
    return toast.id;
  }

  /** Shows an error message (announced assertively). */
  error(text: string, durationMs = 4000): number {
    return this.show(text, { kind: 'error', durationMs });
  }

  /** Runs the action of the visible toast and closes it. */
  runAction(): void {
    const toast = this.current();
    if (!toast) return;
    this.dismiss();
    toast.onAction?.();
  }

  /** Closes the visible toast without running its action or expiry. */
  dismiss(): void {
    this.clearTimer();
    this.current.set(null);
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
