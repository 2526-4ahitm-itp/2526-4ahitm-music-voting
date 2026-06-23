# Proposal: Guest Bottom Tab Navigation (Voten / Hinzufügen)

## Intent

The web guest experience has two views — the voting view (`/voting`, "Vote für deine Lieblingssongs!") and the add/search view (`/guest`, "Suche nach deinen Lieblingssongs!"). Previously a guest moved between them through a burger button that opened a slide-in side menu, and after entering the party PIN the guest landed on the add/search view (`/guest`). The side menu was an extra tap, easy to miss on touch devices, and dropping the guest into the search view first buried the queue/voting — the party's main shared activity.

This change replaces the burger/side-menu on both guest views with a persistent bottom tab bar holding two tabs, "Voten" (→ `/voting`) and "Hinzufügen" (→ `/guest`), with the current view's tab marked active. It also makes a guest land on the voting view (`/voting`) immediately after a successful PIN entry, so the queue is the first thing they see.

## Scope

In scope:
- Web frontend guest views: remove the burger button, `.side-menu`, and overlay from `guest.html` and `voting-comp.html`; add a shared bottom tab bar (`.bottom-nav`) to both, with the active tab reflecting the current view.
- Web frontend PIN entry (`code-input.ts`): redirect to `/voting` instead of `/guest` after `resolvePin` succeeds.
- Associated CSS cleanup in `guest.css` and `voting-comp.css` (remove side-menu/burger styles, add bottom-nav styles).

Out of scope:
- Backend changes — none; routing and PIN resolution are unchanged on the server.
- iOS app navigation (the iOS app already uses its own bottom tab navigation; this change is web-only).
- The error path of PIN entry ("Party nicht gefunden.") and the set of guest views themselves — unchanged.
- The host/dashboard navigation.

## Approach

Each guest view template (`guest.html`, `voting-comp.html`) ends with a `<nav class="bottom-nav">` containing two `routerLink` buttons: "Voten" → `/voting` and "Hinzufügen" → `/guest`. The button matching the current view carries the `active` class. The previous burger trigger, `.side-menu`, and click-catching overlay are removed from both templates, and the corresponding styles are dropped from the two CSS files in favor of `.bottom-nav` / `.bottom-nav-btn` rules.

In `code-input.ts`, the success branch of `resolveAndJoin` navigates to `/voting` rather than `/guest`, so the voting view is the guest's entry point after joining.
