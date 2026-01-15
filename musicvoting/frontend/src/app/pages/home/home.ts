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
export class Home {

  constructor(private router: Router) {}

  protected gotohostpage() {
    this.router.navigate(['host']);
  }

  protected gotoguestpage() {
    this.router.navigate(['guest']);
  }

}
