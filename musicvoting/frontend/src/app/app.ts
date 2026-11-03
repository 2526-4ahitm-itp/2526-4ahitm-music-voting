import { Component, DOCUMENT, inject } from '@angular/core';
import { ResolveEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ThemeService, themeScopeForUrl } from './shared/theme.service';

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
    const theme = inject(ThemeService);
    // Guest pages keep their own light/dark choice, apart from host and TV
    // (web-ui spec "Host Can Switch Between Dark and Light Mode"). ResolveEnd
    // fires before the new page is created, so it never flashes in the wrong mode.
    inject(Router).events
      .pipe(filter((e): e is ResolveEnd => e instanceof ResolveEnd))
      .subscribe((e) => theme.useScope(themeScopeForUrl(e.urlAfterRedirects)));
  }
}
