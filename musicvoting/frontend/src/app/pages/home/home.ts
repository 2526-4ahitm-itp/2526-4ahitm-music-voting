import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {

  constructor(private router: Router) {}

  async ngOnInit() {
    try {
      // Only auto-redirect after a login flow if we previously set a flag.
      const wantRedirect = sessionStorage.getItem('postLoginRedirect');
      const res = await fetch('/api/spotify/token');
      if (res.ok) {
        const token = await res.text();
        if (token && token.trim().length > 0 && wantRedirect === 'dashboard-host') {
          sessionStorage.removeItem('postLoginRedirect');
          this.router.navigate(['/dashboard-host']);
        }
      }
    } catch (err) {
      // ignore errors; user can still press buttons
    }
  }

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
      // mark that we want to redirect to dashboard after login then start login flow
      try { sessionStorage.setItem('postLoginRedirect', 'dashboard'); } catch (e) { /* ignore */ }
      window.location.href = '/api/spotify/login?source=web';
    } catch (err) {
      try { sessionStorage.setItem('postLoginRedirect', 'dashboard'); } catch (e) { /* ignore */ }
      window.location.href = '/api/spotify/login?source=web';
    }
  }

  gotoguestpage() {
    this.router.navigate(['voting']);
  }

}
