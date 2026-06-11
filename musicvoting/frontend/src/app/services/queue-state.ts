import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SpotifyWebPlayerService } from './spotify-player';

@Injectable({ providedIn: 'root' })
export class QueueStateService {
  private inQueueUris = new BehaviorSubject<Set<string>>(new Set());
  readonly inQueueUris$ = this.inQueueUris.asObservable();

  constructor(private spotify: SpotifyWebPlayerService) {
    this.refresh();
  }

  /** Lädt die aktuelle Warteschlange neu und aktualisiert die Menge der enthaltenen Track-URIs. */
  refresh(): void {
    this.spotify.getQueue().subscribe({
      next: (res: any) => {
        const queue = Array.isArray(res?.queue) ? res.queue : [];
        this.inQueueUris.next(new Set(queue.map((track: any) => track.uri)));
      },
      error: (err) => console.error('Fehler beim Laden der Warteschlange:', err)
    });
  }
}
