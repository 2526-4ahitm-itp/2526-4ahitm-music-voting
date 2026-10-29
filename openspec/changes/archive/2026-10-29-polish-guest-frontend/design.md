## Context

After `fix-guest-voting-ux` and `improve-guest-accessibility-and-copy`, the critique's remaining minor observations on the guest path and home page are code-level drift. The TV player redesign was rejected (too many boxes), so the TV only gets invisible cleanup here. Rules: `DESIGN.md` (The One Band Rule, drawn icons, no side stripes), craft floor (no emoji icons, no colored side borders > 1px).

## Goals / Non-Goals

**Goals:** remove the listed drift without changing layout or adding containers; keep every change either invisible or a direct consequence of an existing DESIGN.md rule.

**Non-Goals:** host pages, TV layout, new components, copy changes.

## Decisions

1. **Now-playing marker:** drop `border-left: 3px solid var(--color-primary)`; keep `background-color: rgba(255,255,255,0.5)` and the animated soundwave as the marker. No replacement decoration (fewer elements, per review feedback).
2. **Cover placeholder on `/voting` and `/guest`:** `[src]="track.album?.images?.[0]?.url || 'assets/img/placeholder.png'"`. *Found during implementation:* `/guest` already had a fallback, but to `assets/placeholder.png`, which returns 404 (the file lives in `src/assets/img/`), so missing covers showed a broken image there too; both views now use the correct path.
3. **Music note icon:** Feather-style `music` SVG (two notes on a staff line), `stroke: var(--color-primary)` inside the existing `.icon-circle`, sized like the emoji was (≈ 2.5rem) so the circle keeps its look.
4. **Home font:** `font-family: var(--font), sans-serif;` — the `--font` stack already ends in Verdana; `sans-serif` is the correct generic fallback.
5. **TV crown:** move `font-size: 40px; line-height: 1;` from the inline style into `.crown-icon` (the class already exists). Pixel-identical.
6. **Dead code on the TV component:** remove `menuOpen`, `toggleMenu`, `trackById` (the template uses `track track.id`) and their tests.
7. **Keyframe rename:** `soundwave-bounce` → `soundwave-pulse` (easing stays `ease-in-out alternate`).
8. **Detector ignores:** `impeccable hooks ignore-value broken-image "*" --file <path>` for `voting-comp.html` and `guest.html`, with the evidence (Angular `[src]` bindings, critique Assessment B) in `--reason`. The TV ignore from the reverted change is recreated for `startpage.html` as well, since its images are bound the same way.

## Risks / Trade-offs

- [Home looks different on Android/Linux] → intended: it was the only page falling back to serif; screenshot before/after in the devbox (Linux) shows it.
- [Removing dead TV methods] → covered by the TV tests and build; no template reference exists.
