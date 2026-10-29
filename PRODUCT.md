# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

One product with two clients: the Angular web app (guest, host and TV player in the browser, `musicvoting/frontend/`) and an optional native SwiftUI iOS app for guest and host (`musicvoting/app/`). The TV player runs in the browser only.

## Users

- **Guests (primary):** people at a party who want a say in the music. They join from their own phone, anonymously (no account, no name), via QR code or a 5-digit PIN, then add songs and like songs in the queue. They use it in short bursts between talking, dancing and drinking, often in a dark and loud room.
- **Host:** the person running the party. Creates the party, logs in once with their Spotify Premium account, puts the TV player on a monitor/TV/laptop, and controls playback, the queue and a blacklist from their own phone, protected by a host PIN.
- **Everyone in the room:** watches the TV player from a distance to see what is playing, what comes next, and how to join (PIN and QR code).

Both settings are first-class: small private parties among friends (house or birthday parties, host is one of the group) and larger organized events (class parties, school balls, club evenings, host is an organizer, guests often don't know each other).

## Product Purpose

MusicVoting lets a party's guests decide the music together instead of one person controlling the playlist. Every guest can suggest songs and like songs in a single shared queue; the queue order follows the likes and plays through the host's Spotify account on a shared screen.

Success means real use at real parties: guests join within seconds and keep participating, the music never stops, and the host doesn't have to babysit the system. MusicVoting is also an HTL Leonding ITP school project (4AHITM), but the project is the vehicle, not the goal.

## Positioning

Guests need nothing: no app install, no account, no name, no Spotify login. Scanning the QR code or typing the PIN is the whole onboarding, and identity is an anonymous device ID. The crowd's likes, not a DJ or the host's taste, decide the order (one like per guest per song, ties go to the oldest wish), while the host keeps veto power through skip, remove and blacklist.

## Operating Context

- **Three screens per party:** guest phones (browser or iOS app), the host's phone (host controls), and the TV/monitor/laptop running the TV player, which is also the audio output (Spotify Web Playback SDK in the browser).
- **Setup flow:** host creates the party → logs in with Spotify → picks a default playlist → opens the TV player → guests join via the QR code / PIN shown on the TV.
- **Live:** all clients update in real time via Server-Sent Events (queue, likes, current track, progress, party end). Clients must survive reloads, app closes and reconnects without re-joining.
- **Duration:** a party runs for hours; it ends when the host ends it or automatically after 2 days. Ended party data is deleted after one month. There is no play history.
- **Deployment:** live app at https://it220241.cloud.htl-leonding.ac.at (LeoCloud, Kubernetes).

## Capabilities and Constraints

- One queue per party, sorted by likes descending, FIFO on ties; no duplicate songs; songs are added only from search results.
- Search uses the party's provider; an empty search shows top charts.
- Exactly one music provider per party, fixed at creation: **Spotify** (implemented, host needs Spotify **Premium**) or **YouTube** (planned, not implemented).
- When the queue runs low, it refills from the host's default playlist, then similar songs, then a search-based backstop, so a next song is always available.
- Per-guest rate limit on adding songs.
- Host controls (play/pause/skip, remove songs, blacklist, end party) exist only on the host's device; the TV player has no host controls and never shows which guest added a song.
- UI language: **German** on the web, with fixed user-facing strings that must be kept verbatim, e.g. „Nicht erlaubt.“, „Zu viele Anfragen — bitte kurz warten.“, „Song ist schon in der Warteschlange.“, „Warteschlange ist leer“. The iOS app follows the device language: German base, English secondary; backend error strings stay German.
- Guests are addressed informally („du“), e.g. „Vote für deine Lieblingssongs!“.
- Behavior is specified in `openspec/specs/` and changed only through OpenSpec change proposals.

**Undecided:**
- Empty queue: stop/pause (web spec) or play random top charts (iOS spec)?
- Blacklist matching: case-insensitive substring or whole words?

## Brand Commitments

- Name: **MusicVoting** (one word, capital M and V).
- The TV player and the host view show „powered by“ with the HTL Leonding logo (`musicvoting/frontend/src/assets/img/htl-leonding-logo.jpg`). This mark is binding and must be preserved by future redesigns.

## Evidence on Hand

- Running product: the live deployment above, and the documentation site https://2526-4ahitm-itp.github.io/2526-4ahitm-music-voting/.
- Screenshots of the current web UI: `hugo/content/status/screens/` (generated by `hugo/scripts/status-screenshots/`).
- Project presentation: `hugo/content/slides/index.md`.
- **Not available, must not be invented:** usage numbers, real party reports, user testimonials, ratings, press, or partner logos other than HTL Leonding.

## Product Principles

1. **Zero-friction joining.** Every step between "I see the QR code" and "my song is in the queue" is a cost. No accounts, no names, no installs.
2. **The crowd decides, visibly and fairly.** One guest, one like per song; the order on every screen follows the likes so everyone can see their vote counts.
3. **Built for the room.** Guest screens are used in seconds, in the dark, with noise and distractions; the TV is read from across the room. Glanceability beats density.
4. **The music never stops, the host never babysits.** Automatic refill, reconnects and recovery come before features that need attention.
5. **Real parties, not just demos.** It has to hold up with dozens of guests, flaky Wi-Fi and phones that sleep and wake.

## Accessibility & Inclusion

- **WCAG 2.1 AA** for all web screens (contrast, focus, labels, touch targets).
- **Dark-room readability:** guest screens must stay readable and must not blind people in a dark party room.
- **TV legibility at distance:** the TV player's key content (current song, what's next, PIN/QR to join) must be readable from across the room.
