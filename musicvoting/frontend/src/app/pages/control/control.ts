import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http'; // Import fehlt!

@Component({
  selector: 'app-control',
  standalone: true, // Falls du Angular 17/18 nutzt
  imports: [],
  templateUrl: './control.html',
  styleUrl: './control.css',
})
export class Control {

  constructor(private http: HttpClient) {}

  startParty() {
    this.http.post('/api/track/next', {}).subscribe({
      next: () => {
        console.log("Erstes Lied gestartet");
      },
      error: (err: any) => {
        console.error("Fehler beim Starten der Party:", err);
      }
    });
  }
}
