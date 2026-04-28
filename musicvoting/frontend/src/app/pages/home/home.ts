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

  gotohostpage() {
    this.router.navigate(['/create-party']);
  }

  gotoguestpage() {
    this.router.navigate(['code']);
  }

}
