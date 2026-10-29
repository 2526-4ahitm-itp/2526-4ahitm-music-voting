---
target: guest journey + TV player (musicvoting/frontend/src/app/pages)
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/workspace/musicvoting/musicvoting/frontend/src/app/pages"
timestamp: 2026-10-29T13-27-23Z
slug: musicvoting-frontend-src-app-pages
---
Method: dual-agent (A: design-review agent · B: detector agent, isolated)
Scope: guest journey (/code → /voting → /guest) + TV player (/startpage), entry /. Branch refactor/design-tokens incl. polish-guest-frontend and fix-guest-backend-gaps. Error states mocked, no data changes.

# Critique 2: guest journey + TV player

## Design Health Score
| # | Heuristic | Run 1 | Run 2 | Key issue |
|---|---|---|---|---|
| 1 | Visibility of System Status | 1 | 3 | Instant like/add feedback, toasts, „Suche läuft…“; no now-playing label, no likes on TV, no offline state |
| 2 | Match System / Real World | 2 | 3 | du-copy; tab „Voten“ vs heart icon; 👑 next to „Voting-PIN“ |
| 3 | User Control and Freedom | 1 | 3 | Likes reversible, search clearable, back button; add not undoable, no leave-party |
| 4 | Consistency and Standards | 2 | 2 | TV numbers queue, phone doesn't; „Hinzufügen“ vs „Suche nach…“; emoji crown vs DESIGN.md |
| 5 | Error Prevention | 2 | 3 | Digit filter, auto-submit, double-tap guard, queued ✓ |
| 6 | Recognition Rather Than Recall | 2 | 3 | Labelled tabs, top charts; TV shows PIN but no URL |
| 7 | Flexibility and Efficiency | 2 | 2 | QR or PIN, paste, Enter; little else |
| 8 | Aesthetic and Minimalist Design | 2 | 2 | Guest clean; TV half-empty panel, tiny queue text, crown, gradient CTA |
| 9 | Error Recovery | 1 | 3 | White error chips, PIN reset; „Party nicht gefunden.“ has no next step; stale results after search error |
| 10 | Help and Documentation | 0 | 2 | Likes hint line; nothing on one-like-per-song or add limit |
| **Total** | | 15/40 | **26/40** | **Acceptable** |

## Design Specificity Verdict
LLM: coherent but interchangeable; like button is the one signature moment; TV is a generic dashboard and shows less of the vote than the phone.
Detector CLI: 1 finding (gradient-text startpage.css:256, true positive); 5 broken-image false positives suppressed by narrow config ignores (verified). Guest pages and toast clean.
Detector rendered: ai-color-palette on all routes (intentional brand band); /code paste button 3.6:1; TV „Voting-PIN“ 3.1:1, powered-by 3.9:1, logo 7px on narrow windows, nested cards — TV unchanged since run 1 (redesign reverted).
Overlay: not available (headless in devbox).

## Overall Impression
Guest phone flow much improved (liking is the peak; errors visible; copy explains more). Biggest lever now: the shared TV screen, the weakest and final screen of the journey.

## What's Working
1. Like button: optimistic, SVG heart, aria-pressed + labels, reduced-motion-aware count pop, revert + toast on error.
2. Toast system: one aria-live region above the tab bar, readable, spec strings verbatim.
3. /code error handling: reserved error space, clear + refocus, sensible tab order.

## Priority Issues
- [P1] TV not legible at 3–5 m: queue 15/12px, PIN label 14px grey-on-grey, title 40px marginal at 5 m; queue clipped at 1440×900. Previous redesign rejected (too many boxes) — new attempt with fewer containers, screenshots first. Command: typeset + layout.
- [P1] Dark-room glare: ~70% white on TV, white cards on saturated gradient on phones. User decided after run 1 to keep white; review recommends Plum Night base. Command: colorize.
- [P1] Join path gaps: TV shows PIN but no URL; QR route always tries musicvotingapp:// first and joins web after 1.5 s (code-input.ts:28-34), likely Safari "invalid address" alert on iPhone without app (inferred). Fix: short URL next to PIN; Universal Links or join web immediately + "In der App öffnen". Command: onboard.
- [P2] Crowd decision invisible on TV + noise: no like counts (spec requires), no now-playing label, 👑 emoji clipped at 1440, gradient CTA 4–7 lines. Command: distill.
- [P2] Guest polish/hardening: PIN boxes 39×58px on phone (< 52px rule), now-playing row without text, stale results after search error, search SVGs without aria-hidden, /code paste button 3.6:1. Command: harden → polish.

## Persona Red Flags
Casey: PIN boxes too narrow; queue search takes top of /voting; 3.5 s toast easy to miss.
Jordan: TV „Voting-PIN“ + crown, no URL; „Voten“ tab vs heart; host-facing idle text; no hint on one like per song / add limit.
Sam: search SVGs not aria-hidden; now-playing not announced; weak PIN focus; TV CTA gradient text.
Lena on the sofa (4 m): can't read queue, sees no likes; QR scannable only from ~2 m; no URL for PIN.

## Minor Observations
Home: host/guest equal weight, generic tagline. TV: „Lieder“ vs „Songs“, hardcoded font startpage.css:188, cover alt="Cover". Desktop: /voting heart ~1200px from title; /code paste button 20vw. Search field shows halo + outline on focus.

## Questions to Consider
1. Why does the shared TV show less of the vote than the phone?
2. Should a party app at 1 a.m. be light at all?
3. With 9–20 songs, queue search or „Dein Song: Platz 4“?
