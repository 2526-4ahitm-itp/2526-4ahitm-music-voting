# Proposal

## Why

Drei Spotify-Endpoints des Players sind ohne Host-PIN erreichbar, obwohl nur der host-geschützte TV-Player (`/startpage`) sie braucht. Die Party-ID kennt jeder Gast, weil sie in allen Requests steckt. Damit kann ein Gast:
- mit `GET /api/party/{id}/spotify/token` das **Spotify-Access-Token des Hosts** abholen und damit das Spotify-Konto des Hosts steuern, Playlists und Profil lesen – das Backend erneuert das Token, solange die Party läuft;
- mit `PUT /api/party/{id}/spotify/deviceId` eine falsche Geräte-ID setzen, sodass die Musik auf dem TV stoppt;
- mit `GET /api/party/{id}/spotify/deviceId` die Geräte-ID auslesen.

Das widerspricht `host/spec.md` „Host-Only Actions Are Restricted“ (Gäste dürfen die Wiedergabe nicht beeinflussen), und Provider-Tokens sollen laut `provider/spec.md` beim Host bleiben.

## What Changes

- `GET /spotify/token`, `GET /spotify/deviceId` und `PUT /spotify/deviceId` verlangen den Host-PIN (`Authorization: Bearer <hostPin>`): ohne Header 401, falscher PIN 403.
- Clients ändern sich nicht: Nur der Web-Player ruft die Endpoints auf, und der läuft hinter dem Host-Guard; der Interceptor schickt den Host-PIN bei jedem Request mit. iOS nutzt die Endpoints nicht.

## Capabilities

### New Capabilities

_Keine._

### Modified Capabilities

- `host`: neue Anforderung „Spotify Player Endpoints Require the Host PIN“.

## Impact

- Backend: `SpotifyTokenResource` (`@HostOnly` an drei Methoden).
- Tests: `SpotifyTokenResourceTest` (bestehende Tests mit Host-PIN, neue 401/403-Tests).
- Kein Client-, API-Format- oder DB-Change.
