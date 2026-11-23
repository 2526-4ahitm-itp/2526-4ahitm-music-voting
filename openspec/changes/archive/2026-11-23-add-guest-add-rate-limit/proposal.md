# Proposal

## Why

`guest/spec.md` „Per-Guest Add Rate Limit“ verlangt, dass ein Gast höchstens 10 Songs pro gleitender Minute hinzufügen kann. Umgesetzt ist das nicht: Das Backend kennt beim Hinzufügen nicht einmal, welcher Gast anfragt, und begrenzt nichts. Ein einzelner Gast kann so die Warteschlange fluten und alle anderen verdrängen.

## What Changes

- Web und iOS schicken beim Hinzufügen die bestehende `deviceId` des Gasts mit (Query-Parameter, wie schon bei `GET /track/queue`).
- Das Backend zählt pro Party und `deviceId` die erfolgreich hinzugefügten Songs der letzten 60 Sekunden. Ab dem 11. Song in diesem Fenster antwortet es mit HTTP 429, `"Zu viele Anfragen — bitte kurz warten."` und `retryAfterSeconds`.
- Abgelehnte Versuche (Limit, Blacklist, Duplikat) zählen nicht mit.
- Der Host ist ausgenommen (gültiger Host-PIN im `Authorization`-Header), damit er die Warteschlange vor der Party befüllen kann.
- Web zeigt die Meldung wie die anderen Backend-Fehler als Toast. iOS zeigt Backend-Fehlermeldungen beim Hinzufügen künftig wörtlich an (bisher nur einen allgemeinen Text) – das erfüllt zugleich `ios-localization/spec.md` „Backend Error Strings Remain Backend-Defined German“.

## Capabilities

### New Capabilities

_Keine._

### Modified Capabilities

- `guest`: „Per-Guest Add Rate Limit“ wird präzisiert (Identität über `deviceId`, nur erfolgreiche Adds zählen, Host ausgenommen, HTTP 429 mit Wartezeit).

## Impact

- Backend: neuer `GuestAddRateLimiter` (In-Memory), `TrackResource.addToPlaylist` (optionaler Query-Parameter `deviceId`).
- Frontend: `SpotifyWebPlayerService.addToPlaylist` hängt die `deviceId` an.
- iOS: `SongAddViewModel` hängt die `deviceId` an und zeigt Backend-Fehlertexte an.
- API: neuer optionaler Query-Parameter, neue Antwort 429 – abwärtskompatibel.
