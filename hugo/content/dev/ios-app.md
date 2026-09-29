---
title: iOS-App
description: Aufbau der optionalen SwiftUI-App
tags: [ Developer, Swift ]
weight: 90
showDate: true
date: 2026-06-23
lastmod: 2026-09-28
---

Die optionale **SwiftUI**-App liegt unter `musicvoting/app/` (Xcode-Projekt `app.xcodeproj`).
Sie bietet eine native **Gast-** und **Admin-(Host-)Ansicht**; den Monitor/TV ersetzt sie nicht.
Die fachlichen Regeln entsprechen der {{< article link="swift/docs/swift-specification/" >}}.

## Wichtige Views

| View | Zweck |
|---|---|
| `StartView` | Einstieg (beitreten / Party erstellen) |
| `HostPinEntryView` | Host-PIN-Eingabe (5 Ziffern-Boxen, Auto-Submit) |
| `HostMenuView` / `SpotifyAuthView` | Host-Menü und Spotify-Login |
| `PlaylistPickerView` | Standard-Playlist wählen nach dem Spotify-Login („Ohne Standard-Playlist fortfahren“ immer möglich) |
| `Admin_ContentView` / `AdminDashboard` | Admin-Dashboard (Steuerung, Queue, QR, Fortschritt) |
| `CurrentSongPlaying`, `QueueCard`, `SongRow` | Bausteine des Dashboards |
| `Gast_ContentView` / `VotingView` / `SongAddView` | Gast-Ansicht, Voting und Suche |
| `CodeInputView` | Gast-Code (5 Ziffern-Boxen) |
| `QRCodeView`, `InfoView`, `ExitView` | QR-Anzeige, Infos, Verlassen |

## ViewModels & Infrastruktur

- **ViewModels:** `AdminDashboardViewModel`, `VotingViewModel`, `SongAddViewModel`,
  `SpotifyAuthViewModel`.
- **`PartySession` / `PartySessionStore`** – speichert die Sitzung (Party-ID, PINs, Rolle) in
  `UserDefaults`; Sitzungen überstehen App-Neustarts, explizites Verlassen löscht sie.
- **`BackendConfiguration`** – Backend-Basis-URL. Reihenfolge: Wert in `UserDefaults` →
  `BackendBaseURL` in `Info.plist` (Standard: `https://it220241.cloud.htl-leonding.ac.at`) →
  `http://localhost:8080`. Lokale Hosts (localhost/IPv4) bekommen `http` und Port 8080, alle anderen
  werden auf **`https` ohne Port** normalisiert (nötig für den Cloud-Ingress).
- **`SpotifyConstants`**, **`generateQRCode`**, **`Song`** – Konstanten, QR-Erzeugung, Modell.

## Plattform-Besonderheiten

- **Lokalisierung:** Strings über `Localizable.strings`, Sprache folgt der Systemsprache; Deutsch
  ist Basissprache (`CFBundleDevelopmentRegion = de`), Englisch sekundär (Fallback auf Deutsch).
  Backend-Fehlermeldungen werden **verbatim** angezeigt, nicht re-lokalisiert.
- **SSE:** persistente Verbindung mit `partyId`, automatischer Reconnect; `party-ended` wirkt nur bei
  passender `partyId`.
- **Host-Controls** senden `Authorization: Bearer <hostPin>`; Play/Pause/Skip sind ohne aktives
  Gerät (`deviceActive=false`) gesperrt.
- **Fortschrittsbalken** aus `progress`-SSE-Events; Reset bei `track-changed`.
- **Album-Cover** über einen gemeinsamen `URLSession`-Cache (statt `AsyncImage`), mit
  `music.note`-Platzhalter; QR-Code zeigt während des Ladens einen Spinner.
- **Dark Mode:** Hintergründe sind adaptiv (Systemfarben statt fixer Weiß-/Schwarztöne).
- **Playlist-Picker:** lädt `GET /api/party/{id}/spotify/playlists`, Auswahl ruft
  `PUT /api/party/{id}/default-playlist`; Überspringen ruft nichts auf. Auch bei Ladefehler bleibt
  „Überspringen“ aktiv.

## Tests

Unit-Tests liegen neben dem App-Code, u. a. `AdminDashboardViewModelTests`, `VotingViewModelTests`,
`SongAddViewModelTests`, `SpotifyAuthViewModelTests`, `PartySessionStoreTests`,
`BackendConfigurationTests`, `GenerateQRCodeTests`, `SongTests` (mit `MockURLProtocol`).
