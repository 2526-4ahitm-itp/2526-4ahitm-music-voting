import { Component } from '@angular/core';
import {TrackService} from '../../services/spotify-tracks';


@Component({
  selector: 'app-control',
  standalone: true,
  imports: [],
  templateUrl: './control.html',
  styleUrl: './control.css',
})
export class Control {

  constructor(private trackService: TrackService) {}

  startParty() {
    this.trackService.startParty().subscribe({
      next: () => {
        console.log("Erstes Lied gestartet");
      },
      error: (err: any) => {
        console.error("Fehler beim Starten der Party:", err);
      }
    });
  }

}
