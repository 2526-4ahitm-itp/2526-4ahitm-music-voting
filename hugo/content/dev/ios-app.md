---
title: iOS-App
description: Aufbau der optionalen SwiftUI-App
tags: [ Developer, Swift ]
weight: 90
showDate: true
date: 2026-06-23
lastmod: 2026-06-23
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
| `Admin_ContentView` | Admin-Dashboard (Steuerung, Queue, QR, Fortschritt) |
| `Gast_ContentView` / `VotingView` | Gast-Ansicht und Voting |
| `QRCodeView`, `InfoView`, `ExitView` | QR-Anzeige, Infos, Verlassen |

## ViewModels & Infrastruktur

- **ViewModels:** `AdminDashboardViewModel`, `VotingViewModel`, `SongAddViewModel`,
  `SpotifyAuthViewModel`.
- **`PartySession` / `PartySessionStore`** – speichert die Sitzung (Party-ID, PINs, Rolle) in
  `UserDefaults`; Sitzungen überstehen App-Neustarts, explizites Verlassen löscht sie.
- **`BackendConfiguration`** – Backend-Basis-URL.
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

## Tests

Unit-Tests liegen neben dem App-Code, u. a. `AdminDashboardViewModelTests`, `VotingViewModelTests`,
`SongAddViewModelTests`, `SpotifyAuthViewModelTests`, `PartySessionStoreTests`,
`BackendConfigurationTests`, `GenerateQRCodeTests`, `SongTests` (mit `MockURLProtocol`).
