## 1. Implementation

- [x] 1.1 `QueueStateService`: subscribe to `PartyService.partyId$` (`distinctUntilChanged`), clear the set and `refresh()` on each change
- [x] 1.2 `refresh()`: ignore a response if the current party changed meanwhile

## 2. Tests

- [x] 2.1 Unit test: switching party clears old URIs and loads the new party's queue
- [x] 2.2 Unit test: set is empty right after switching, before the new queue arrives
- [x] 2.3 Unit test: late response of the left party is ignored
- [x] 2.4 Unit test: same party ID again does not reload
- [x] 2.5 Run `npx ng test --watch=false --browsers=ChromeHeadless` in `musicvoting/frontend` — green

## 3. Verify

- [ ] 3.1 Manual check: guest adds song X in party A, host creates party B, guest joins B in the same tab → X is addable in B
