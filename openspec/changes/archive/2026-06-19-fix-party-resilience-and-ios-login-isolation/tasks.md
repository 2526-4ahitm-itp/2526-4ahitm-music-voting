# Tasks

## 1. Backend — party registry DB fallback
- [x] 1.1 Add `PartyEntity.findActiveById(String id)` static finder
- [x] 1.2 Add `PartyRegistry.findById(String id)` with in-memory check and DB fallback via `findOrReconstruct`
- [x] 1.3 Replace `partyRegistry.find(PartyId.of(id))` in `PartyResource` QR endpoint with `findById`
- [x] 1.4 Replace `resolveParty()` in `TrackResource` with `findById`
- [x] 1.5 Replace `resolveParty()` in `SpotifyTokenResource` with `findById`
- [x] 1.6 Replace lookup in `HostAuthFilter` with `findById`
- [x] 1.7 Replace both lookups in `SpotifyCallbackResource` with `findById`

## 2. Backend — iOS login SSE isolation
- [x] 2.1 Remove spurious `login-success` event with `source=web` from `SpotifyCallbackResource.iosCallback()`
