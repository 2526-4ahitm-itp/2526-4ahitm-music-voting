# Design

## Context

`SpotifyTokenResource` (`/party/{partyId}/spotify`) schützt bisher nur `GET /playlists` mit `@HostOnly`. `HostAuthFilter` prüft `Authorization: Bearer <hostPin>` (401 ohne Header, 403 bei falschem PIN, 404 bei unbekannter Party). Aufrufer der drei offenen Endpoints ist nur `SpotifyWebPlayerService` im TV-Player; die Route `/startpage` hat `hostGuard`, und `hostAuthInterceptor` hängt den gespeicherten Host-PIN an jeden Request.

## Goals / Non-Goals

**Goals:**
- Token und Abspielgerät sind nur mit Host-PIN erreichbar.

**Non-Goals:**
- `GET /spotify/status` bleibt offen (liefert nur `loggedIn`, iOS-Login-Prüfung nutzt es).
- `GET /spotify/login` und die Callbacks bleiben offen (OAuth-Redirects tragen keinen Header).
- Bereits ausgelieferte Tokens widerrufen – sie laufen nach spätestens einer Stunde ab.

## Decisions

- **`@HostOnly` statt eigener Prüfung.** Gleicher Mechanismus und gleiche Statuscodes wie alle anderen Host-Endpoints.
- **Auch `GET /deviceId` schützen.** Kein Client nutzt ihn; offen gibt er nur unnötig Information preis.

## Risks / Trade-offs

- [Ein Player ohne gespeicherten Host-PIN bekäme kein Token mehr] → Kann es nicht geben: `/startpage` ist per `hostGuard` nur mit Host-PIN erreichbar (`host/spec.md` „Go-Live Step Explains a Separate TV Device“).

## Migration Plan

Reines Backend-Deployment. Offene TV-Player funktionieren weiter, weil sie den Host-PIN bereits mitschicken.
