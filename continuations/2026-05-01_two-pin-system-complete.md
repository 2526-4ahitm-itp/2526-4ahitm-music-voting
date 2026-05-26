# Continuation — Two-pin system complete, web and iOS verified

Branch: `feature/db`

## What was done this session

### Core feature: two-pin system (hostPin / guestPin)

The party now generates **two separate PINs** on creation:
- **Guest PIN** (`pin`) — used by guests to join via "Ich bin Gast" → voting and song-adding pages
- **Host PIN** (`hostPin`) — used by the host to open the dashboard and startpage

#### Backend changes
- `Party.java` — added `hostPin` field
- `PartyEntity.java` — added nullable `host_pin` column, `findByHostPin()` query method
- `PartyRegistry.java` — added `findByHostPin()` lookup
- `setup.sql` — added `host_pin VARCHAR(5)` column + unique active-party index (nullable because existing rows blocked NOT NULL migration)
- `PartyResource.java`:
  - `POST /api/party` — `generatePinPair()` generates two guaranteed-different 5-digit PINs, returns `{id, pin, hostPin, joinUrl}`
  - `GET /api/party/join/{pin}` — guest endpoint, unchanged
  - `GET /api/party/host-join/{hostPin}` — new host endpoint, returns `{id, guestPin}`
  - `GET /api/party/{id}` — now returns `hostPin` alongside `pin` when present

#### iOS changes (`musicvoting/app/`)
- `PartySession.swift`:
  - `CreatePartyResponse` — added `hostPin`
  - `HostJoinResponse` — new struct `{id, guestPin}`
  - `PartySessionStore` — stores both `pin` (guest) and `hostPin` separately in UserDefaults
  - `createParty()` — stores both pins
  - `resolve(pin:)` — guest flow, `GET /api/party/join/{pin}`
  - `resolveAsHost(hostPin:)` — host flow, `GET /api/party/host-join/{hostPin}`, stores guest pin from response + entered host pin
- `CodeInputView.swift` — replaced hardcoded `checkCode() == "12345"` with real `resolve(pin:)` API call, with loading state and error display
- `AdminDashboard.swift` — shows `partySession.hostPin` labeled "Host-PIN" at the top
- `QRCodeView.swift` — shows `partySession.pin` (guest PIN) labeled "Gäste-PIN" + QR image from backend
- `Admin_ContentView.swift` — kept all 4 original tabs: Admin, QR-Code, Voting, Add Song

#### Web changes (`musicvoting/frontend/`)
- `party.service.ts` — added `hostPin$`, `currentHostPin`, `resolveHostPin()`, `HOST_PIN_KEY` (`mv_party_host_pin` in localStorage); `createParty()` and `getParty()` now store/update `hostPin`; `clearParty()` clears it
- `host-options.ts` — "Dashboard öffnen" and "Startseite öffnen" now call `resolveHostPin()` (host endpoint) instead of `resolvePin()` (guest endpoint)
- `host-dashboard.ts` / `.html` — reads `currentHostPin` and displays it labeled "Host-PIN" (was incorrectly showing guest PIN)
- `startpage.html` — label changed from "PIN:" to "Gäste-PIN:"

### OpenSpec change updated
- `openspec/changes/integrate-party-id-host-flow-ios-web/tasks.md` — fully rewritten to reflect all work done (sections 1–9), with verification tasks 9.1–9.2 checked (web and iOS confirmed working by user)

## Current state

- The `integrate-party-id-host-flow-ios-web` OpenSpec change is **functionally complete** — web and iOS both verified working by the user.
- Verification tasks 9.3–9.10 in `tasks.md` cover detailed cross-platform and edge-case testing, not yet formally checked off.
- The change has not been archived yet.

## Known limitations / open items

- **Old parties in DB** have `host_pin = NULL` — they cannot be reopened via the host-join endpoint. Only newly created parties have both pins. This is expected and acceptable.
- **`loadPartyDetails()` in iOS** (`GET /api/party/{id}`) updates only the guest `pin`, not `hostPin`. Not currently called anywhere, but if wired up in future it needs to also persist `hostPin`.
- **Host authorization** — all party endpoints are still unprotected. Any client knowing a party ID can call `DELETE /api/party/{id}`. A future change should add host-token validation.
- **Spotify token refresh** — access tokens expire after 1 hour; no refresh logic implemented yet.
- **Guest identity persistence** — guests get a new identity on reload (open question: localStorage vs cookie vs DeviceId — unresolved in CLAUDE.md).
- **Rate limiting** — spec says 10 songs/min per guest; implementation status unknown.

## Open questions (from CLAUDE.md, still unresolved)

- Web-app join via 5-digit code — supported or QR only?
- Empty queue: stop/pause (web spec) vs. play random Top-Charts (Swift spec) — which is canonical?
- Blacklist: case-insensitive substring matching? Partial word matching?
- Guest identity persistence mechanism (localStorage, cookie, or DeviceId)?

## How to resume

Read this file and `CLAUDE.md`. Start the DB: `cd musicvoting && docker compose up -d`. The active OpenSpec change is `openspec/changes/integrate-party-id-host-flow-ios-web/` — either run remaining verification tasks and archive it, or start a new change for the next feature.
