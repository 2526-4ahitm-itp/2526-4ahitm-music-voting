# Tasks

## 1. Web: bottom tab bar on guest views
- [x] 1.1 In `guest.html`, remove the burger button, `.side-menu`, and overlay; add a `<nav class="bottom-nav">` with "Voten" (→ `/voting`) and active "Hinzufügen" (→ `/guest`) tabs
- [x] 1.2 In `voting-comp.html`, remove the burger button, `.side-menu`, and overlay; add a `<nav class="bottom-nav">` with active "Voten" (→ `/voting`) and "Hinzufügen" (→ `/guest`) tabs
- [x] 1.3 In `guest.css`, remove side-menu/burger/overlay styles and add `.bottom-nav` / `.bottom-nav-btn` styles
- [x] 1.4 In `voting-comp.css`, remove side-menu/burger/overlay styles and add `.bottom-nav` / `.bottom-nav-btn` styles

## 2. Web: land on voting view after join
- [x] 2.1 In `code-input.ts` `resolveAndJoin`, navigate to `/voting` instead of `/guest` on successful PIN resolution

## 3. Verify
- [ ] 3.1 Manually verify: after entering a valid PIN, the guest lands on `/voting` with the "Voten" tab active
- [ ] 3.2 Manually verify: tapping "Hinzufügen" / "Voten" switches between `/guest` and `/voting` with the correct tab marked active on each view

> Note: implementation landed in commits `badc97c9` / `9036171d`; tasks are recorded retroactively. The verify steps require running the web frontend and were not run in this session.
