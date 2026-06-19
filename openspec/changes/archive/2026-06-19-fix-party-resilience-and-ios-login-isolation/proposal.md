# Proposal: Fix Party Resilience and iOS Login SSE Isolation

## Intent
Two backend bugs were found during testing. First, all party operations (QR code,
search, add song, vote, Spotify callback, host auth) returned 404 after any backend
restart, because `PartyRegistry` only held parties in memory and had no DB fallback
when looking up a party by ID. Second, creating a new party from the iOS app caused
the web app to refresh its player unexpectedly, because `iosCallback` was emitting a
spurious `login-success` event with `source=web` that the web SSE listener acted on.

## Scope
In scope:
- Party endpoint resilience: every lookup-by-ID path falls back to the database
- iOS login SSE isolation: `iosCallback` must not emit web login-success events

Out of scope:
- Changes to the party creation flow
- Changes to how the web app handles login-success events

## Approach
Add `findById(String id)` to `PartyRegistry`, mirroring the existing `findByPin` /
`findByHostPin` pattern: check the in-memory map first, then fall back to
`PartyEntity.findActiveById()` and `findOrReconstruct()`. Replace all
`partyRegistry.find(PartyId.of(id))` call-sites with `findById()`. Remove the
second `loginEventBus.emit()` call (the `source=web` one) from `iosCallback()`.
