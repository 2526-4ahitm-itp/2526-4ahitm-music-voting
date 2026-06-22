# Proposal: Fix Create Party Back Navigation

## Intent

On the "Create party" page, the back arrow currently navigates straight to the home page (`/`), skipping the "Host options" page the user came from. This jumps back two screens instead of one and breaks the expected back-navigation flow (Home → Host options → Create party).

## Scope

In scope:
- Change the back arrow on the "Create party" page to navigate to `/host-options` (the immediate previous page) instead of `/`

Out of scope:
- Any other back/navigation arrows in the app
- Changes to the Host options or Home page flows themselves

## Approach

`create-party.ts`'s `goBack()` currently calls `this.router.navigate(['/'])`. It is changed to navigate to `/host-options`, matching the actual navigation chain (Home → `/host-options` → `/create-party`).
