# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(The Angular web app is the target of design work. A separate SwiftUI iOS app exists under `musicvoting/app/` and has its own specs; it is not covered here.)

## Users

- **Guests at a private party or a relaxed get-together** (birthday, flat or house party, family or friends' celebration, about 10–50 people). The mood ranges from lively and loud to calm and cosy, so the product must not feel like a club only. Guests join on their own phone, often with one hand and somewhat distracted. They want to see what is playing and coming up, like songs they want to hear, and add their own. They have no account and install nothing.
- **The host** is one of the party guests and has Spotify Premium. They set up the party once (Spotify login, optional default playlist, optional blacklist), put the player on the laptop that is connected to the TV or projector, and then mostly party along. They step in now and then to skip, remove or block a song or to end the party.
- **The room** watches the shared TV/projector screen from a distance (sofa, dance floor). It shows what is playing, what comes next and how to join.

## Product Purpose

MusicVoting lets a party decide its music together. Guests scan a QR code (or type a 5-digit code), add songs via search and like songs in the queue. The queue is sorted by likes, and the music plays from the host's Spotify through the shared screen. Success means guests join within seconds, the music reflects the room, and the host does not have to act as DJ.

School project of HTBLA Leonding, class 4AHITM (ITP). Team: Miriam Gnadlinger (lead), Simone Sperrer, Marlies Winklbauer.

## Positioning

What MusicVoting does that a shared Spotify queue (e.g. Spotify Jam) does not, and what design must keep visible:

1. **No app, no account for guests**: scan, and you are in, anonymously.
2. **Democratic order by likes**: the group decides what plays next, not whoever adds first.
3. **The host keeps control**: blacklist, block or remove songs, end the party.
4. **A shared TV screen**: everyone sees live what is playing and what comes next.

## Operating Context

- Guests: phone browser after a QR scan (`/join/<pin>`) or typing the code; two views, "Voten" (`/voting`) and "Hinzufügen" (`/guest`), switched with a bottom tab bar.
- Host: laptop or phone; setup flow create party → Spotify OAuth → default playlist → blacklist → host dashboard. The player (`/startpage`) usually runs on the same laptop connected to the TV, but must also work on a separate device.
- TV/projector: the player page doubles as the room display and the Spotify Web Playback device.
- Live updates over SSE; sessions survive reloads (persistent `deviceId`, stored host PIN).

## Capabilities and Constraints

- Provider: Spotify (host needs Premium). YouTube is specified but not implemented in the web host flow. No other providers.
- Two codes: the **Voting-PIN** (public, guests join with it) and the **Gastgeber-PIN** (secret, lets the host return to the dashboard).
- Blacklist per party: words (whole word, case-insensitive), artists, songs. Blocked songs cannot be added and are greyed out in search; guests never learn why.
- Guests are never attributed on the shared screen.
- User-facing text is German and uses "du". Backend messages such as "Nicht erlaubt.", "Song ist schon in der Warteschlange.", "Zu viele Anfragen — bitte kurz warten." and "Warteschlange ist leer" are fixed strings. Further languages are not decided.
- Undecided: what plays when the queue is empty (web spec: stop/pause vs. Swift spec: random Top-Charts).
- Behaviour is defined in `openspec/specs/`; every change goes through an OpenSpec change.

## Brand Commitments

- Name "MusicVoting" and the existing logo (`musicvoting/frontend/src/assets/logo.png`) stay unchanged.
- Brand colours purple `#8403A6` → coral `#F2594B` are binding.
- The project must stay recognisable as an HTL Leonding school project: a "powered by HTL Leonding" footer on the TV screen and the landing page (`assets/img/htl-leonding-logo.jpg`).

## Evidence on Hand

- Screenshots of the current UI: `hugo/content/status/screens/`.
- UI/UX analyses: `openspec/analyse/ui-ux-review.md`, `openspec/analyse/impeccable/ui-ux-critique.md`.
- No real user testimonials, usage numbers or party statistics exist. Do not invent them.

## Product Principles

1. **Joining beats everything.** A guest goes from scan to first like in seconds, without an account, app or explanation.
2. **The room decides, visibly.** Likes and ranking are the core feedback and must feel rewarding, on the phone and on the TV.
3. **Readable from the sofa, usable with one hand.** The TV is designed for distance; phone actions sit in the thumb zone.
4. **The host is a guest too.** Setup is short and explained; in-party control is quick and reversible.
5. **Never blame the guest.** Blocked songs, errors and party end are communicated kindly and without revealing the host's rules.
6. **Friendly for every kind of celebration.** The product serves lively parties and cosy get-togethers alike. The TV uses a dark stage with the brand gradient as light (team decision 2026-11-03, after comparing light, full-gradient and muted-gradient variants).

## Accessibility & Inclusion

WCAG 2.2 AA for the web app: German `lang`, labelled controls, keyboard operability, visible focus, live-region announcements, AA contrast on the gradient, and respect for `prefers-reduced-motion` (see `openspec/changes/refactor-design-fixes/specs/web-ui/spec.md`).
