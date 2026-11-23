import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PartyService } from './services/party.service';

/**
 * Schützt die Gast-Seiten (/voting, /guest).
 *
 * Diese Seiten tragen keine Party in der URL — sie lesen die Party-ID aus dem Browser-Speicher,
 * den `/join/:pin` bzw. die Code-Eingabe beim Beitritt schreiben. Ohne gespeicherte Party hätten
 * ihre Anfragen kein Ziel und der Gast sähe eine leere Seite. Deshalb geht es dann zur
 * Code-Eingabe. Geprüft wird bewusst nur, ob eine Party gespeichert ist (kein Backend-Request):
 * beendete Partys erkennen die Seiten selbst über das SSE-Event `party-ended`.
 */
export const guestGuard: CanActivateFn = () => {
  if (inject(PartyService).currentPartyId) {
    return true;
  }
  return inject(Router).createUrlTree(['/code']);
};
