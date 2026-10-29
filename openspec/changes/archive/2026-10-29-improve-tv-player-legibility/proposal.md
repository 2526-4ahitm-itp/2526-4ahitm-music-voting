## Why

The TV player (`/startpage`) is the one screen the whole room shares, but the Impeccable critique of 2026-10-29 (`.impeccable/critique/2026-10-29T12-14-01Z__musicvoting-frontend-src-app-pages.md`, P1) found it cannot be read from where guests actually sit:

- At 1920×1080 the queue titles are 15px and artists 12px (readable to about 1 m on a 55" TV); the PIN (38px) reads to about 2.5 m; the QR code (≈18 cm) scans from about 2 m. Nothing reaches the ~25 mm cap height needed at 3–5 m.
- The queue is a 3-column grid of tiles whose reading order fights "what's next", and it shows **no like counts**, although `dashboard/spec.md` "Persistent Dashboard Elements" requires them. The crowd never sees that votes move anything.
- Without a playing song the room reads „Der Host kann den ersten Song im Dashboard starten.“ (host jargon), and half the screen is an empty white card.
- At 1440×900 the 👑 overflows the PIN box and the 7th tile is clipped; the „Voting-PIN“ label (3.1:1) and „powered by“ (3.9:1) fail contrast; the logo shrinks to 7px on narrow windows; the QR caption uses gradient text.

## What Changes

- **Readable from the sofa:** all TV text sizes scale with the screen height (`vh`/`clamp`), so a 1920×1080 TV gets roughly: now-playing title ≥ 5vh, artist ≥ 3.2vh, up-next titles ≥ 3.2vh, PIN digits ≥ 8vh, labels ≥ 2.2vh. No fixed px font sizes on the TV.
- **„Als Nächstes“ instead of a tile grid:** the next 5 songs as one vertical, numbered list with cover, title, artist and their **like count** (heart + number), in queue order; if more songs wait, a line „+ N weitere“. Rows are separated by dividers inside one panel (no cards inside cards).
- **Bigger join panel:** QR code at least 30vh, PIN in large spaced numerals with a readable label („PIN“), short call to action in solid text („Scan mich und wünsch dir was!“-style copy, final wording in design); no crown emoji, no gradient text.
- **Room-facing idle states:** with no song playing, the now-playing area invites guests to join instead of addressing the host; with an empty queue the list says how to add the first song.
- **Less glare, white stays:** panels stay white (decision from the critique), but size to their content instead of stretching empty white areas across the screen; covers get rounded corners; the „powered by HTL Leonding“ mark stays (binding) with readable contrast.
- **Layout robustness:** no clipping or overflow at 1920×1080, 1440×900 and 1280×720.

Not in this change: dark "stage" mode (decided against for now), host dashboard (`/dashboard`) layout, audio/SDK behavior.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `dashboard`: "Persistent Dashboard Elements" gets concrete legibility and layout requirements (up-next list with like counts, minimum sizes relative to screen height, join panel), and a new requirement for room-facing idle states.

## Impact

- **Frontend code:** `pages/startpage/startpage.html`, `startpage.css`, small additions in `startpage.ts` (up-next slice, remaining count); tests in `startpage.spec.ts`.
- **No changes** to backend, APIs, SSE events, playback/SDK logic, host or guest pages, iOS app.
- **Docs:** `DESIGN.md` (TV section, PIN & QR panel) and `.impeccable/design.json`; the status-page TV screenshot (`hugo/content/status/screens/`) is outdated afterwards (refresh at the next sprint review, rule 6).
