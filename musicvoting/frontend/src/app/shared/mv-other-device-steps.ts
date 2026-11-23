import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PUBLIC_APP_HOST, PUBLIC_APP_URL } from './public-url';

/**
 * "Player auf anderem Gerät öffnen" with the five steps (host spec "Go-Live Step
 * Explains a Separate TV Device"). Shown below "Player auf diesem Gerät öffnen" on
 * the go-live step and on the dashboard, so both say exactly the same.
 *
 * The player route needs the Gastgeber-PIN, so the steps go through the host
 * options instead of a copied link. Step 1 links to the public address
 * (PUBLIC_APP_URL), not the current one, which would be "localhost" in development.
 * Own styles: stage.css of the page does not reach into a child component.
 */
@Component({
  selector: 'mv-other-device-steps',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="title">Player auf anderem Gerät öffnen</p>
    <ol>
      <li>MusicVoting öffnen: <a [href]="appUrl" target="_blank" rel="noopener">{{ appHost }}</a></li>
      <li>Gastgeber einer Party wählen</li>
      <li>Player öffnen auswählen</li>
      <li>Gastgeber-PIN eingeben</li>
      <li>Player öffnen</li>
    </ol>
  `,
  styles: `
    :host {
      display: block;
      color: var(--mv-on-stage-muted);
      line-height: 1.5;
    }
    .title {
      margin: 0 0 var(--mv-space-1);
      font-weight: 700;
      color: var(--mv-on-stage);
    }
    ol {
      margin: 0;
      padding-left: 1.5em;
    }
    a {
      color: var(--mv-stage-accent);
      font-weight: 700;
      text-underline-offset: 3px;
      overflow-wrap: anywhere;
    }
  `,
})
export class MvOtherDeviceSteps {
  /** Public address of the web app (see public-url.ts). */
  readonly appUrl = PUBLIC_APP_URL;
  /** Shown link text without the protocol, short enough for a phone. */
  readonly appHost = PUBLIC_APP_HOST;
}
