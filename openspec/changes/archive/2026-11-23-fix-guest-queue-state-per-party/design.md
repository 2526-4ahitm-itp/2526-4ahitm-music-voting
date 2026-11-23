## Decisions

- **React to `partyId$` inside the service** instead of calling `refresh()` from every page. All consumers (guest search, host search) get the fix at once, and a future page cannot forget it. `partyId$` is a `BehaviorSubject`, so its first emission replaces the former load in the constructor.
- **Clear before reload.** Between joining and the queue response the set is empty, so nothing from the old party can show as "already in the queue" even briefly. Worst case a guest presses add on a song that really is in B's queue during that moment — the backend answers 409 „Song ist schon in der Warteschlange.“, which is already shown.
- **Drop stale responses** by comparing the party ID at request time with the current one when the response arrives.
- `distinctUntilChanged()` avoids a reload when the same party ID is set again (e.g. reload of `/startpage?partyId=…`).
