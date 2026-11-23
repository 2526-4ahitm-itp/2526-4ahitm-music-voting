import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';
import { SpotifyWebPlayerService } from './spotify-player';
import { PartyService } from './party.service';

/**
 * Hält die Menge der Track-URIs, die in der Warteschlange der *aktuellen* Party stehen.
 * Guest- und Host-Suche nutzen sie, um „Schon in der Warteschlange“ anzuzeigen.
 *
 * Der Service ist ein app-weites Singleton und überlebt deshalb einen Party-Wechsel im selben
 * Tab. Damit nicht die Songs der vorherigen Party als „schon drin“ erscheinen, wird die Menge
 * bei jedem Wechsel der Party-ID sofort geleert und für die neue Party neu geladen.
 */
@Injectable({ providedIn: 'root' })
export class QueueStateService {
  private inQueueUris = new BehaviorSubject<Set<string>>(new Set());
  readonly inQueueUris$ = this.inQueueUris.asObservable();

  constructor(private spotify: SpotifyWebPlayerService, private partyService: PartyService) {
    // partyId$ ist ein BehaviorSubject: die erste Emission ersetzt den früheren Initial-Load,
    // jede weitere (Beitritt zu einer anderen Party, Verlassen) setzt den Zustand zurück.
    this.partyService.partyId$.pipe(distinctUntilChanged()).subscribe(() => {
      this.inQueueUris.next(new Set());
      this.refresh();
    });
  }

  /** Lädt die aktuelle Warteschlange neu und aktualisiert die Menge der enthaltenen Track-URIs. */
  refresh(): void {
    const partyId = this.partyService.currentPartyId;
    this.spotify.getQueue().subscribe({
      next: (res: any) => {
        // Eine verspätete Antwort für eine inzwischen verlassene Party darf den Zustand der
        // neuen Party nicht überschreiben.
        if (this.partyService.currentPartyId !== partyId) return;
        const queue = Array.isArray(res?.queue) ? res.queue : [];
        this.inQueueUris.next(new Set(queue.map((track: any) => track.uri)));
      },
      error: (err) => console.error('Fehler beim Laden der Warteschlange:', err)
    });
  }
}
