# Design

## Context

`GuestAddRateLimiter` hält pro Party und `deviceId` die Zeitstempel erfolgreicher Adds in einem rollierenden 60-s-Fenster. Bei Überschreitung antwortet `TrackResource.addToPlaylist` mit 429, `{"error": "Zu viele Anfragen — bitte kurz warten.", "retryAfterSeconds": N}` und dem Header `Retry-After`. Die Gast-Seite (`pages/guest`) zeigt die Fehlermeldung nur als Toast an.

## Goals / Non-Goals

**Goals:**
- Limit 20 statt 10, an genau einer Stelle (`MAX_ADDS`) geändert.
- Countdown und gesperrte „+“-Buttons in der Web-Gast-Ansicht.

**Non-Goals:**
- iOS-Countdown (kann gerade niemand in Xcode testen; iOS zeigt weiter die Meldung an).
- Limit konfigurierbar machen (`application.properties`). 20 als Konstante reicht. Falls das später gewünscht ist, wäre es ein eigener Change.
- Countdown nach einem Neuladen der Seite wiederherstellen. Der nächste Add-Versuch bekommt wieder 429 und startet den Countdown neu.

## Decisions

- **Countdown in einem Root-Service (`AddCooldownService`), nicht in der Komponente.** Die Gast-Komponente wird beim Tab-Wechsel zerstört. Ein `providedIn: 'root'`-Service speichert den Zeitpunkt `until` (Epoch-ms) und berechnet `secondsLeft` als Signal aus `until - Date.now()`. So stimmt der Wert nach der Rückkehr, ohne dass ein Timer weiterlaufen muss. Ein `setInterval` von 1 s läuft nur, solange der Countdown aktiv ist, und stoppt bei 0.
  - Alternative: `sessionStorage`. Das wäre zusätzliche Persistenz ohne echten Nutzen (siehe Non-Goals).
- **Quelle der Wartezeit ist `retryAfterSeconds` aus dem JSON-Body.** Die Web-App liest den Body schon für die Fehlermeldung. Fehlt der Wert, gilt der Fallback von 60 s (die Fenstergröße).
- **Die Anzeige steht in einer eigenen Zeile über der Suchstatus-Zeile.** So wird sie nicht von „Suche läuft …“ oder „Keine Treffer“ verdrängt. Die Zeile ist **nicht** `aria-live`, weil Screenreader sonst jede Sekunde vorlesen würden. Angesagt wird der Start über den bestehenden Fehler-Toast. Die deaktivierten Buttons sagen „Bitte kurz warten“.
- **Backend-Tests nutzen `MAX_ADDS` statt der Zahl 10**, damit eine künftige Änderung nur die Konstante berührt.

- **Spec-Anforderung heißt neu „Guest Add Limit per Minute“** (REMOVED + ADDED statt MODIFIED). OpenSpec lässt beim Ändern keine Szenario-Umbenennung zu, und der alte Szenario-Name enthielt „10“. Der neue Name enthält bewusst keine Zahl.

## Risks / Trade-offs

- [Clock-Drift zwischen Client und Server] → Der Countdown rechnet nur relativ zur lokalen Uhr ab dem Empfang. Er kann um weniger als eine Sekunde früher enden als das Server-Fenster. Ein zu früher Versuch bekommt dann wieder 429 mit einer neuen, kurzen Wartezeit.
