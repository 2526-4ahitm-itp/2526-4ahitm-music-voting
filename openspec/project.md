# MusicVoting — Project Overview

MusicVoting is an interactive web application that lets party guests co-curate the music. Guests join a party from their phone (no account, no name), add songs via search, and like songs to push them up in the queue. The host runs one party at a time, backed by a single music provider (Spotify or YouTube), and the music plays on a shared monitor/TV in the browser.

## Product shape

- **Three clients**: a guest web app (phone), a host control UI (phone), and a dashboard display (monitor/TV).
- **One party = one provider**: providers are not mixed within a party. The host selects the provider at party creation time.
- **Anonymous guests**: no accounts, no names; the backend assigns an anonymous identifier per guest session.
- **Queue sorting is automatic**: more likes first, FIFO on ties. The queue is the source of truth for what plays next.
- **The host authenticates with the provider via OAuth** once per party. Tokens are dropped when the party ends.

## Primary domains (see `specs/`)

- `party` — lifecycle (create, PIN/QR identity, provider selection, end)
- `guest` — anonymous join and per-guest rate limits
- `host` — host-only controls and blacklist management
- `queue` — queue contents, sorting, de-duplication, add/remove
- `voting` — per-guest like toggle with live updates
- `playback` — playback on the monitor, skip, pause, advance
- `dashboard` — monitor/TV display and reconnect semantics
- `search` — search flow and top-charts fallback
- `provider` — provider integration constraints (Spotify/YouTube, OAuth, ads)

## Stack (context, not contract)

- Backend: Quarkus (Java), REST + live updates to clients.
- Frontend: Angular web app (guest, host, dashboard views).
- Optional mobile: Swift app mirroring the guest experience (see `hugo/content/swift/`).
- Documentation site: Hugo under `hugo/`.

## Out of scope (explicitly)

- Multiple providers per party.
- Named/registered guest accounts.
- Persistent play history or "recently played" lists.
- Guarantee of ad-free playback on YouTube (best-effort only).
