# MusicVoting – Frontend

Angular 22 web app for guests, host and the TV player. Standalone components (zone.js change detection in the browser, zoneless on the server), icons from `lucide`, live updates over SSE. Specs live in `openspec/specs/`, the visual system in [`DESIGN.md`](../../DESIGN.md) at the repo root.

## Development server

```bash
npm install
npm start          # ng serve --host 0.0.0.0 --port 4200 (reachable from phones in the same network)
```

Open `http://localhost:4200/`. API calls go to `/api` and are proxied to the Quarkus backend on port 8080, so the backend and PostgreSQL must run (see the repo README and `script/`).

## Tests

```bash
CHROME_BIN=/usr/bin/chromium-browser npx ng test --watch=false --browsers=ChromeHeadless
```

All tests must pass before a change is done (`ai/ARBEITSREGELN.md` §3). Besides unit tests there are DOM tests per page group (`pages/*.dom.spec.ts`, `startpage.layout.spec.ts`) and a token contrast test (see below).

## Routes and flows

🔒 = protected by `hostGuard` (host PIN in `localStorage`).

**Guests**
- `/code` – type the 5-digit Voting-PIN (digit boxes); `/join/:pin` – same page, opened by the QR code.
- `/voting` – the single guest page "Warteschlange": now-playing bar, ranked queue, likes, and a search field above the queue. Typing searches the provider; the results replace the queue while the field holds text. A result that is already queued shows its likes and heart (vote there), any other result a "+"; after adding, the toast says "Song hinzugefügt – Platz N", after a like "Geliked – jetzt auf Platz N". The one-time welcome ("Du bist dabei!") explains liking and adding in two lines and closes by itself after 10 s. The "x" ("Suche leeren") empties the field and shows the queue again.
- `/guest` (old add/search page) redirects to `/voting`. The top bar shows "Party 12345" and "Party verlassen" (`mv-guest-party`); there is no tab bar.

**Host setup** (`/host-options` → `/create-party` → Spotify login → …)
1. `/select-playlist` 🔒 – optional default playlist for the auto-refill.
2. `/select-blocklist` 🔒 – optional Blocklist (code and API still say "blocklist" until the rename change): one search field for words, artists and songs (first row "Wort „x“ sperren", then up to 3 artists and 5 songs; Enter blocks the word). "Weiter" is disabled until something is blocked; "Ohne Blocklist fortfahren" skips.
3. `/party-ready` 🔒 – "Deine Party ist bereit": "Player auf diesem Gerät öffnen" and below it "Player auf anderem Gerät öffnen" with five numbered steps (`mv-other-device-steps`, step 1 links to the public address in `shared/public-url.ts`), Voting-PIN, "Party ist live 🎉" once the player has registered.
4. `/dashboard` 🔒 – the only host view of the queue: playback, one search field that works like the guest page (results replace the queue while it holds text; blocked songs show "Nicht erlaubt."), rank, likes and a like button for the host (one like per device, like a guest) on every screen width, "Song entfernen" → "Entfernen und sperren" / "Nur entfernen" / "Abbrechen" (focus moves into the question, Escape closes it), QR and Voting-PIN ("für Gäste"), "Player öffnen", "Party beenden", and the Gastgeber-PIN ("nur für dich") masked as "•••••" until "Anzeigen".

**During the party** the host navigation (`mv-host-menu`) links Dashboard and Blocklist (`/select-blocklist?mode=edit`, saves immediately, "Fertig" returns) and shows the logo with the badge "Party läuft · <Voting-PIN>". Below 1024 px it is a burger menu, from 1024 px a fixed side rail. The old `/voting-host` and `/search-host` redirect to `/dashboard`.

**TV** – `/startpage` 🔒 is the room display and the Spotify Web Playback device: now playing, QR + Voting-PIN, top 5 "Als Nächstes" with a short pulse when a like count changes, footer with logo (faint white glow in dark mode) and "powered by HTL Leonding". It never shows the Gastgeber-PIN.

Blocked songs are greyed out with a disabled "+" in the guest and host search. Guests see only the hint "Einige Ergebnisse sind vom Gastgeber gesperrt." (or "Dieser Artist ist vom Gastgeber gesperrt."), never which entry; the host sees "Nicht erlaubt." on the song.

## Design system

The full description (tokens, typography, components, rules) is [`DESIGN.md`](../../DESIGN.md). In code:

- **Tokens** – `src/styles.css` defines every colour, radius, spacing and motion value as `--mv-*` custom properties, including the glows (`--mv-glow-brand` under the now-playing cover, `--mv-glow-logo` behind the TV logo). Components never hard-code colours; that is what makes light mode work.
- **Stage look** – `src/app/shared/stage.css` holds the shared page frame (dark stage with brand glow, sticky top bar, cards, rows, buttons, search field). Every page lists it first in `styleUrls`.
- **Shared components** (`src/app/shared/`):

  | Component | Purpose |
  |---|---|
  | `mv-cover` | Album cover with a dark brand placeholder when the image is missing or fails |
  | `mv-icon` | Lucide icons by name (`lucide-angular`); add new icons to its `ICONS` map |
  | `mv-host-menu` | Host navigation: burger + slide-in below 1024 px, side rail from 1024 px; logo and "Party läuft" badge |
  | `mv-guest-party` | "Party 12345" and "Party verlassen" (with confirmation) for guests |
  | `mv-theme-toggle` | Icon-only "Heller Modus" toggle (moon/sun, `role="switch"`) |
  | `mv-toast` + `toast.service.ts` | Confirmations ("Song hinzugefügt – Platz N", "Geliked – jetzt auf Platz N") as a filled brand card with icon, and errors, at the bottom of the page |
  | `mv-other-device-steps` | "Player auf anderem Gerät öffnen" with five steps (dashboard and go-live step) |
  | `mv-spinner` | Loading indicator |
  | `mv-party-ended` | "Die Party ist beendet" overlay for guests |
  | `mv-credit-footer` | "powered by HTL Leonding" (TV and landing page only) |

- **Fonts and icons** – one variable font, Bricolage Grotesque (`@fontsource-variable/bricolage-grotesque`), for all text; icons from `lucide-angular`. Both are bundled, nothing loads from a CDN.
- **Images** – serve copies close to their display size: `assets/img/logo-mark.png` (logo), `assets/img/htl-leonding-logo-480.jpg` (credit), `assets/img/cover-placeholder.svg`. `assets/logo.png` is the favicon only.

### Dark and light mode

Dark is the default. `ThemeService` sets `data-theme` on `<html>`; `styles.css` swaps the tokens for `[data-theme='light']`. There are two separate choices, each stored in `localStorage`:

- `mv-theme` – host pages, TV and entry pages (`/`, `/host-options`, `/create-party`, setup steps). The TV follows changes from other tabs without reload.
- `mv-guest-theme` – guest pages (`/code`, `/join/:pin`, `/voting`). Until a guest chooses, it starts from the entry-page choice.

The scope switches on router `ResolveEnd`, so each page group keeps its own mode.

### Contrast test

`src/app/shared/contrast.tokens.spec.ts` reads the real token values from `styles.css` in both modes and checks every text colour against every surface it sits on, including the brand glow (its radial gradients are rebuilt and sampled over phone, desktop and TV sizes). Thresholds: 4.5:1 on host and guest pages, 3:1 on the TV (large text only). Put new text only on covered surfaces (glow, `--mv-stage-card`, `-row`, `-bar`) or extend the test.

### Accessibility

`lang="de"`, real `<button>`/`<a>` controls with German `aria-label`s, a global focus ring (`--mv-focus-ring`), live regions for status messages, focus handling in the host menu and the "Party verlassen" question, and `prefers-reduced-motion` (durations drop to 0). `pages/a11y-baseline.dom.spec.ts` checks this baseline on the main pages.

## Building

```bash
npx ng build
```

Output goes to `dist/`. The production image is built by `.github/workflows/build-push-deploy.yml`.
