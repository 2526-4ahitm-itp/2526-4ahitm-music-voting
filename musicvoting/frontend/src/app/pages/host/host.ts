import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpotifyWebPlayerService } from '../../services/spotify-player';
import { TrackService } from '../../services/spotify-tracks';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-host',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host.html',
  styleUrl: './host.css'
})
export class Host implements OnInit {
  tracks: any[] = [];
  isSearching = false;

  constructor(
    private spotifyService: SpotifyWebPlayerService,
    private trackApi: TrackService,
    private cdr: ChangeDetectorRef // Ermöglicht das manuelle Aktualisieren der Ansicht
  ) {}

  async ngOnInit() {
    // Initialisierung falls nötig
  }

  /**
   * Sucht nach Tracks, zeigt sie sofort an und fügt sie dann der Queue hinzu.
   */
  async search(query: string = "Taylor Swift") {
    // Sicherstellen, dass wir einen validen Suchstring haben
    const searchTerm = typeof query === 'string' ? query : "Taylor Swift";

    this.isSearching = true;
    this.tracks = [];

    try {
      console.log(`Suche läuft für: ${searchTerm}`);
      const res: any = await lastValueFrom(this.trackApi.searchTracks(searchTerm));

      if (res && res.tracks && res.tracks.items) {
        // 1. Daten zuweisen
        this.tracks = res.tracks.items;

        // 2. UI-Update erzwingen, damit die Liste sofort sichtbar wird
        this.cdr.detectChanges();

        console.log(`${this.tracks.length} Tracks gefunden.`);

        // 3. Im Hintergrund zur Queue hinzufügen
        for (const track of this.tracks) {
          try {
            await lastValueFrom(this.spotifyService.addToQueue(track.uri));
            console.log(`Hinzugefügt: ${track.name}`);
          } catch (queueErr) {
            console.error(`Fehler beim Hinzufügen von ${track.name}:`, queueErr);
          }
        }
      } else {
        console.warn("Keine Tracks gefunden.");
      }
    } catch (err) {
      console.error("Allgemeiner Fehler bei der Suche:", err);
    } finally {
      this.isSearching = false;
      // Finales Update (z.B. um den Lade-Button-Status zu ändern)
      this.cdr.detectChanges();
    }
  }

  /**
   * Manueller Add für einzelne Tracks
   */
  async addToQueue(uri: string) {
    try {
      await lastValueFrom(this.spotifyService.addToQueue(uri));
      console.log("Erfolgreich hinzugefügt");
    } catch (err) {
      console.error("Fehler beim manuellen Hinzufügen:", err);
    }
  }

  loginSpotify() {
    this.spotifyService.login();
  }
}
