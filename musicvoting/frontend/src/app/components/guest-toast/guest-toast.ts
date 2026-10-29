import { Component, inject } from '@angular/core';
import { GuestFeedbackService } from '../../services/guest-feedback';

/**
 * Zeigt die aktuelle Rückmeldung des GuestFeedbackService über der Tab-Leiste an.
 * Der Live-Bereich bleibt immer im DOM, damit Screenreader neue Meldungen sicher ansagen.
 */
@Component({
  selector: 'app-guest-toast',
  standalone: true,
  templateUrl: './guest-toast.html',
  styleUrl: './guest-toast.css',
})
export class GuestToast {
  protected readonly feedback = inject(GuestFeedbackService);
}
