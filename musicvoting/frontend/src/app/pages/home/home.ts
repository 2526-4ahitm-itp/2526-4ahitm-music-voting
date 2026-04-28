import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {

  constructor(private router: Router) {}

  async gotohostpage() {
    try {
      const res = await fetch('/api/spotify/token');
      if (res.ok) {
        const token = await res.text();
        if (token && token.trim().length > 0) {
          this.router.navigate(['/dashboard']);
          return;
        }
      }
      window.location.href = '/api/spotify/login?source=web';
    } catch (err) {
      window.location.href = '/api/spotify/login?source=web';
    }
  }

  gotoguestpage() {
    this.router.navigate(['code']);
  }

}
