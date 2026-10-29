---
target: guest journey + TV player (musicvoting/frontend/src/app/pages)
total_score: 15
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/workspace/musicvoting/musicvoting/frontend/src/app/pages"
timestamp: 2026-10-29T12-14-01Z
slug: musicvoting-frontend-src-app-pages
---
Method: dual-agent (A: design-review agent · B: detector agent, isolated)
Scope: guest journey (/code → /voting → /guest) + TV player (/startpage), entry /. Local test party with 7 songs. Platform adaptive, reviewed surfaces are web markup.

# Critique: guest journey + TV player

## Design Health Score
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of System Status | 1 | Like waits for server (spec: optimistic); no search loading state; add/rate-limit errors only console.error |
| 2 | Match System / Real World | 2 | „Geben Sie den Code ein…“ breaks du-rule; TV shows host jargon „…im Dashboard starten“ |
| 3 | User Control and Freedom | 1 | Liked song cannot be un-liked (pointer-events:none); no reset after wrong PIN |
| 4 | Consistency and Standards | 2 | Liked vs. in-queue look identical (grey/disabled); 100dvh vs 100vh |
| 5 | Error Prevention | 2 | Good digit filter/auto-submit; bottom nav covers last like button; accidental like permanent |
| 6 | Recognition Rather Than Recall | 2 | Guest screens never show PIN/party; icon-only ♡/＋/✓ |
| 7 | Flexibility and Efficiency | 2 | Paste, auto-advance, /join/:pin strong; empty search shows no top charts |
| 8 | Aesthetic and Minimalist Design | 2 | Clean guest list; TV wastes half height on empty now-playing, 12–15px queue text |
| 9 | Error Recovery | 1 | „Party nicht gefunden.“ red on coral ≈1.3:1 |
| 10 | Help and Documentation | 0 | No hint where the PIN is or what likes do |
| **Total** | | **15/40** | **Poor** |

## Design Specificity Verdict
LLM: owned plum→coral band, consistent TV/phones; PIN boxes and PIN+QR panel product-specific. Guest screens are stock "white card list + round icon button + floating tab bar". Nothing visualizes "the crowd decides" (tiny like counts, no rank movement). TV = white web dashboard on a TV.
Detector (CLI, 8 findings, 2 real): side-tab voting-comp.css:178; gradient-text startpage.css:254. False positives: 5× broken-image (Angular [src] bindings), bounce-easing (ease-in-out, name match).
Detector (rendered, CDP, 390x844 + 1920x1080): ai-color-palette on all 10 scans (intentional brand band); contrast: /code paste button 3.6:1, TV Voting-PIN label 3.1:1, powered-by 3.9:1, placeholders 4.4:1; TV logo 7px on narrow screens (startpage.css:270); nested-cards on TV queue tiles.
Overlay: not available (headless browser in devbox pod).

## Overall Impression
Brand works, joining is fast. Voting feels like a penalty (card greys out, stops responding) and the TV can't be read from the sofa. Biggest lever: make voting feel like it counts, on phone and TV.

## What's Working
1. PIN flow (code-input.ts): numeric keypad, auto-advance, backspace, paste distribution, auto-join on 5th digit.
2. Big thumb-zone targets: like/add 52–60px, 64px tab bar, clear plum active state.
3. One owned color band, now tokenized (var(--gradient-brand)).

## Priority Issues
- [P0] Last queue song can't be liked on phones: fixed bottom nav, .main-content only 1rem bottom padding (voting-comp.css:101,405); 7th card's ♡ under the bar, not scrollable; same on /guest. Fix: padding-bottom calc(4rem + 2vh + 1rem + env(safe-area-inset-bottom)). Command: layout → harden.
- [P1] Liking permanent, liked song looks dead: .track-card.voted {opacity:.5; pointer-events:none; grayscale} (voting-comp.css:229-233), contradicts voting spec (toggle, optimistic). Fix: keep card opaque, filled plum heart, toggle, optimistic +/- with rollback, count animation. Command: clarify + animate.
- [P1] Errors invisible or swallowed: #ff3b30 on coral ≈1.3:1 (code-input.css:79); add/search/vote errors only console.error (guest.ts:94,109; voting-comp.ts:88); „Zu viele Anfragen — bitte kurz warten.“ and „Song ist schon in der Warteschlange.“ never shown; no no-results state. Fix: white/glass chip in aria-live, toasts, clear PIN boxes on error. Command: harden → clarify.
- [P1] TV not readable from the sofa, white glare: queue title 15px / artist 12px at 1920x1080 (~1 m), PIN ~2.5 m, QR ~2 m; ~85% white; at 1440x900 crown overflows, 7th tile clipped; idle copy addresses host. Fix: vh-based type (title ≥5vh, next ≥3vh, PIN ≥8vh), top 3–5 vertical list with like counts, Plum Night/glass panels, QR ≥30vh, drop crown, room-facing idle copy. Command: typeset + layout + quieter.
- [P2] Guest screens bright and not accessible: white cards ~70% of viewport; weak placeholder contrast; unlabeled PIN inputs; back control is div role=button without keyboard (code-input.html:3); ♡/＋/✓ without aria-label/aria-pressed. Fix: dark guest surface variant, labels, real <button>. Command: audit → colorize.

## Persona Red Flags
Casey: last ♡ hidden under nav; mis-tap like permanent; no add confirmation; /guest 100vh shifts with iOS address bar.
Sam: back control not focusable; PIN inputs unnamed; errors not announced, ~1.3:1; vote button only "♥/♡"; in-queue ✓ ~1.4:1; liked state only via opacity/grayscale.
Jordan: no hint where the PIN is; nothing explains likes reorder the queue; only explanation is gradient text on the TV.
Lena on the sofa (project persona, 4 m, dim, tipsy): can't read titles/artists; no like counts on TV; white glare; must walk to TV to scan QR.

## Minor Observations
Home tagline long, 10rem wordmark louder than actions; /voting placeholder „In Playlist suchen...“ vs queue; „Lieder“/„Songs“ mixed; /guest header wraps at 390px; .home serif fallback; TV covers sharp corners, gradient text vs One Band Rule; inline styles startpage.html:89, guest.html:28; hard-coded font startpage.css:188; dead code menuOpen/toggleMenu, goToVoting() → /vote (guest.ts:125); /voting no cover fallback; backend empty search (search?q=) returns 500, frontend shows welcome screen instead of top charts (spec "Empty Search Shows Top Charts" unmet). Not tested: TV with playing track, adding via UI.

## Questions to Consider
1. Why does no guest screen show rank movement („Dein Song ist auf Platz 3 gestiegen“)?
2. Should the TV be a dark stage (Plum Night, huge now playing, top 3 with likes, giant QR)?
3. Should Plum Night become the default guest surface now instead of a future dark mode?
