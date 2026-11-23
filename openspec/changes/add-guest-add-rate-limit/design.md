# Design

## Context

`POST /api/party/{id}/track/addToPlaylist` nimmt eine Liste von Track-URIs (Gäste schicken immer genau eine) und kennt den Absender nicht. Gäste haben aber bereits eine persistente `deviceId` (`voting/spec.md` „Persistent Device Identity“), die Web und iOS beim Voten und bei `GET /track/queue?deviceId=…` mitschicken. Der Host-Client schickt auf allen Requests `Authorization: Bearer <hostPin>`.

## Goals / Non-Goals

**Goals:**
- 10 erfolgreiche Adds pro Gast und Party in 60 Sekunden, gleitendes Fenster.
- Klare 429-Antwort mit Wartezeit; Web und iOS zeigen den Backend-Text.

**Non-Goals:**
- Schutz gegen gezielte Umgehung (neue `deviceId` erzeugen). Das Limit soll normale Gäste bremsen, nicht Angreifer abwehren.
- Limits für Votes oder Suche.
- Persistenz über einen Backend-Neustart.

## Decisions

- **Identität über `deviceId` als Query-Parameter.** Gleiches Muster wie `GET /track/queue`; der Body bleibt eine URI-Liste, alte Clients funktionieren weiter. Alternative IP-Adresse verworfen: Gäste einer Party sitzen meist im selben WLAN hinter einer gemeinsamen öffentlichen IP – ein IP-Limit würde die ganze Party bremsen.
- **Ohne `deviceId` kein Limit.** Ein Request ohne Identität wird nicht begrenzt statt abgelehnt, damit ältere iOS-Versionen weiter Songs hinzufügen können. Akzeptierte Lücke, siehe Non-Goals.
- **`GuestAddRateLimiter` als `@ApplicationScoped`-Bean, In-Memory.** Schlüssel `partyId + deviceId` → Deque der Zeitstempel erfolgreicher Adds. Ablauf in `TrackResource`: `check` vor dem Add (prunt das Fenster, wirft 429 wenn `count + uris.size() > 10`), `record` nur nach 2xx. Zählen der URIs statt der Requests, damit eine lange Liste das Limit nicht umgeht. Pro Schlüssel wird synchronisiert; leere Deques werden entfernt, damit der Speicher nicht wächst.
- **Testbare Zeit über `java.time.Clock`.** Die Bean bekommt eine `Clock` (Standard `Clock.systemUTC()`); Unit-Tests setzen eine feste bzw. vorgestellte Uhr.
- **Host ausgenommen.** Gleiche Prüfung wie `HostAuthFilter` (`Bearer` + `party.hostPin()`), aber ohne Abbruch bei fehlendem Header.
- **429-Antwort.** `{"error": "Zu viele Anfragen — bitte kurz warten.", "retryAfterSeconds": n}` plus `Retry-After`-Header; `n` = Sekunden, bis der älteste Add das Fenster verlässt (mindestens 1).
- **iOS zeigt Backend-Fehlertexte.** Bei Nicht-2xx wird `error` aus dem JSON-Body angezeigt, sonst der bisherige lokalisierte Fallback.

## Risks / Trade-offs

- [Check und Record sind zwei Schritte; parallele Requests desselben Gasts könnten knapp über 10 kommen] → Gäste klicken einzeln; eine Abweichung um eins ist unkritisch.
- [Mehrere Backend-Instanzen hätten getrennte Zähler] → Es läuft eine Instanz; bei Skalierung bräuchte es einen geteilten Speicher.

## Migration Plan

Backend zuerst ausrollen (Parameter ist optional), dann Frontend und iOS. Kein DB-Schema betroffen.
