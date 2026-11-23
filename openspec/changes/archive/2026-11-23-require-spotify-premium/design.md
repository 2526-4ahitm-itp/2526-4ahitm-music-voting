# Design

## Context

Beide Callbacks (`/api/spotify/callback` für Web und iOS-Redirects, `/api/spotify/ios/callback` für den App-Code-Tausch) tauschen den Code gegen Tokens und speichern sie sofort in den `SpotifyCredentials` der Party (Refresh-Token zusätzlich in der DB). Der Scope `user-read-private` wird bereits angefordert, damit liefert `GET /v1/me` das Feld `product` (`premium`, `free`, `open`).

## Goals / Non-Goals

**Goals:**
- Free-Konten früh, vor dem Party-Setup, erkennen und abweisen.
- Klare deutsche Meldung im Web, lokalisierte Meldung in iOS.
- Spotifys `PREMIUM_REQUIRED` auch später (z. B. Abo abgelaufen) verständlich anzeigen.

**Non-Goals:**
- Eine YouTube-Variante (YouTube ist noch nicht umgesetzt).
- Laufende Parties nachträglich prüfen, wenn das Abo während der Party endet – dafür greift die 403-Übersetzung.

## Decisions

- **Prüfung vor dem Speichern der Tokens.** Der Kontotyp wird mit dem frisch getauschten Access-Token direkt abgefragt (`SpotifyMusicProvider.fetchAccountProduct(accessToken)`), bevor Tokens in die Party geschrieben werden. So bleibt bei Free-Konten kein halber Login-Zustand zurück. Alternative „Tokens speichern und Flag setzen“ verworfen: Die Party wäre scheinbar eingeloggt, obwohl sie nicht abspielen kann.
- **Unbekannt = zulassen.** Liefert `/v1/me` einen Fehler oder kein `product`, wird der Login übernommen. Eine wackelige Spotify-API soll keinen Premium-Host aussperren; im schlimmsten Fall greift später die 403-Übersetzung.
- **Web-Redirect auf `webRedirectUri` (= `/select-playlist`) mit `error=premium-required`.** Die Seite kennt die `partyId` bereits aus dem Redirect und kann ohne neue Route den Hinweis und den Kontowechsel anbieten. Sie lädt in diesem Fall keine Playlists.
- **Kontowechsel über `switchAccount=true` → `show_dialog=true`.** Ohne den Dialog meldet Spotify den Browser stillschweigend mit demselben Free-Konto an.
- **iOS:** Der Web-Callback mit iOS-State leitet auf `musicvotingapp://callback?error=premium-required` weiter; `/ios/callback` antwortet mit 403 und `reason: PREMIUM_REQUIRED`. Die App wertet beides aus.
- **403-Übersetzung zentral in `SpotifyApiErrors`.** Dort wird zusätzlich `error.reason` aus dem Spotify-Body gelesen; bei `PREMIUM_REQUIRED` wird die feste deutsche Meldung verwendet.

## Risks / Trade-offs

- [Spotify liefert `product` nur mit Scope `user-read-private`] → Scope ist vorhanden; fehlt das Feld, gilt „unbekannt = zulassen“.
- [Zusätzlicher Spotify-Aufruf pro Login] → Einmal pro Login, vernachlässigbar (der entfernte `fetchAndStoreUserId` hat denselben Endpunkt genutzt).

## Migration Plan

Kein DB-Schema betroffen. Backend, Frontend und iOS können unabhängig ausgerollt werden; ältere iOS-Versionen zeigen bei Free-Konten weiterhin die allgemeine Fehlermeldung.
