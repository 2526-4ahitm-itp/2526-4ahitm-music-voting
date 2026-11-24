# Proposal

## Why

Beim Live-Check am 2026-11-24 hat das Rate-Limit funktioniert, 10 Songs pro Minute sind auf einer echten Party aber zu knapp. Außerdem sieht ein abgelehnter Gast nur „Zu viele Anfragen — bitte kurz warten.“ und weiß nicht, wie lange er warten muss. Die Wartezeit (`retryAfterSeconds`) schickt das Backend schon mit, die Web-App zeigt sie aber nicht an.

## What Changes

- Das Limit pro Gast steigt von **10 auf 20 Songs pro rollierender Minute**. Host-Ausnahme, Zählung über `deviceId` und „nur erfolgreiche Adds zählen“ bleiben gleich.
- Die Web-Gast-Ansicht zeigt nach einer 429-Antwort einen **Countdown**: „Du kannst in <N> s wieder Songs hinzufügen.“ Er zählt jede Sekunde herunter und verschwindet bei 0.
- Solange der Countdown läuft, sind die „+“-Buttons deaktiviert. Ihr Label lautet dann „Bitte kurz warten“. Der Countdown bleibt erhalten, wenn der Gast zwischen den Tabs wechselt.

## Capabilities

### New Capabilities
_Keine._

### Modified Capabilities
- `guest`: Die Anforderung „Per-Guest Add Rate Limit“ bekommt das Limit 20 statt 10 und eine neue Anforderung für den Countdown in der Web-Ansicht.

## Impact

- Backend: `GuestAddRateLimiter` (Konstante `MAX_ADDS`), Javadoc in `TrackResource`, `GuestAddRateLimiterTest` und die Rate-Limit-Tests der Resource.
- Frontend: neuer Root-Service für den Countdown, `pages/guest` (Template, Komponente, Spec).
- iOS: kein Code. Das Limit gilt dort automatisch mit 20, die Meldung wird wie bisher wörtlich angezeigt.
- API: keine Änderung. Die 429-Antwort enthält `retryAfterSeconds` und den Header `Retry-After` schon.
