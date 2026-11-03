import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MvCreditFooter } from '../../shared/mv-credit-footer';
import { MvIcon } from '../../shared/mv-icon';
import { MvThemeToggle } from '../../shared/mv-theme-toggle';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MvCreditFooter, MvIcon, MvThemeToggle],
  templateUrl: './home.html',
  // Shared stage look first, page layout second.
  styleUrls: ['../../shared/stage.css', './home.css'],
})
/**
 * Landing page: pick the role (guest or host). Shows the HTL credit footer
 * (web-ui spec "HTL Credit Appears as a Footer on TV and Landing Page").
 */
export class Home {

  constructor(private router: Router) {}

  gotohostpage() {
    this.router.navigate(['/host-options']);
  }

  gotoguestpage() {
    this.router.navigate(['code']);
  }

}
