import { Component, DOCUMENT, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './shared/theme.service';

/**
 * Root component. Besides hosting the router outlet it pins the document
 * language to German: index.html already declares lang="de", but setting it
 * here as well keeps it correct in SSR output and in tests, where index.html
 * is not loaded (web-ui spec "Document Language Is German").
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class App {
  constructor() {
    inject(DOCUMENT).documentElement.lang = 'de';
    // Instantiating the service applies the stored stage theme right away.
    inject(ThemeService);
  }
}
