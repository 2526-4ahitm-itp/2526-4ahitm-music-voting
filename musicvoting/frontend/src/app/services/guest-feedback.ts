import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

/** Eine kurze Rückmeldung an den Gast; `error` wird im Toast als Fehler markiert. */
export interface GuestFeedbackMessage {
  text: string;
  kind: 'info' | 'error';
}

/** Wie lange eine Rückmeldung sichtbar bleibt, bevor sie von selbst verschwindet. */
export const GUEST_FEEDBACK_DURATION_MS = 3500;

/**
 * Übersetzt einen fehlgeschlagenen „Song hinzufügen“-Request in die Meldung für den Gast.
 * Die Texte für 409 und 429 sind in den Specs festgelegt und bleiben wörtlich gleich.
 */
export function addErrorMessage(err: unknown): string {
  const status = err instanceof HttpErrorResponse ? err.status : (err as { status?: number })?.status;
  if (status === 409) return 'Song ist schon in der Warteschlange.';
  if (status === 429) return 'Zu viele Anfragen — bitte kurz warten.';
  return 'Das hat nicht geklappt. Versuch es nochmal.';
}

/**
 * Gemeinsame Rückmeldungen für die Gast-Ansichten (/voting und /guest).
 * Vorher landeten Fehler nur in der Konsole; jetzt zeigt der Toast (GuestToast)
 * immer die letzte Meldung an und blendet sie nach kurzer Zeit wieder aus.
 */
@Injectable({ providedIn: 'root' })
export class GuestFeedbackService {
  private readonly current = signal<GuestFeedbackMessage | null>(null);
  /** Die aktuell sichtbare Meldung oder `null`. */
  readonly message = this.current.asReadonly();

  private hideTimer?: ReturnType<typeof setTimeout>;

  /**
   * Zeigt eine Meldung an. Eine neue Meldung ersetzt die alte und startet die
   * Anzeigedauer neu, damit schnell aufeinanderfolgende Aktionen nicht zu früh verschwinden.
   */
  show(text: string, kind: 'info' | 'error' = 'info'): void {
    clearTimeout(this.hideTimer);
    this.current.set({ text, kind });
    this.hideTimer = setTimeout(() => this.current.set(null), GUEST_FEEDBACK_DURATION_MS);
  }

  /** Blendet die aktuelle Meldung sofort aus (z. B. beim Verlassen der Ansicht). */
  clear(): void {
    clearTimeout(this.hideTimer);
    this.current.set(null);
  }
}
