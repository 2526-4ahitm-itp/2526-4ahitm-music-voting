# Proposal

## Why

Die Spec verlangt, dass ein Host ohne Spotify Premium eine klare Fehlermeldung sieht. Heute merkt das System das erst, wenn die Wiedergabe scheitert: Der Web Playback SDK meldet `account_error` nur in der Browser-Konsole, und das Backend reicht Spotifys englische Meldung („Player command failed: Premium required“) ungefiltert durch. Der Host richtet also die ganze Party ein und wundert sich dann, dass nichts spielt.

## What Changes

- Nach dem Spotify-Login prüft das Backend den Kontotyp (`GET /v1/me`, Feld `product`). Ist das Konto nachweislich kein Premium-Konto, wird der Login nicht übernommen (keine Tokens gespeichert, kein `login-success`).
  - Web: Weiterleitung auf den Setup-Schritt mit `error=premium-required`; dort steht ein klarer deutscher Hinweis und ein Button, sich mit einem anderen Spotify-Konto anzumelden.
  - iOS: Der App-Callback meldet `error=premium-required` bzw. HTTP 403; die App zeigt einen eigenen lokalisierten Hinweis.
  - Ist der Kontotyp nicht ermittelbar (Netzwerkfehler), wird der Login wie bisher übernommen (best effort).
- Der Login-Endpunkt akzeptiert `switchAccount=true` und lässt Spotify dann den Konto-Auswahldialog zeigen (`show_dialog=true`).
- Spotify-Fehler mit Grund `PREMIUM_REQUIRED` werden auf „Du brauchst Spotify Premium, um Musik abzuspielen.“ übersetzt.
- Meldet der Web Playback SDK `account_error`, zeigt der TV-Player einen sichtbaren Hinweis statt nur eines Konsolen-Logs.

## Capabilities

### New Capabilities

_Keine._

### Modified Capabilities

- `provider`: „Spotify Provider Requires Premium Host Account“ wird konkretisiert – Prüfung beim Login, Verhalten bei unbekanntem Kontotyp, Meldungstexte, Kontowechsel.

## Impact

- Backend: `SpotifyCallbackResource`, `SpotifyTokenResource`, `SpotifyMusicProvider` (Kontotyp-Abfrage), `SpotifyApiErrors`.
- Frontend: `select-playlist` (Premium-Hinweis + Kontowechsel), `spotify-player` + `startpage` (SDK-Kontofehler sichtbar).
- iOS: `SpotifyAuthView` + `Localizable.strings` (de/en).
- Keine DB- oder API-Breaking-Changes; neue optionale Query-Parameter `error` (Redirect) und `switchAccount` (Login).
