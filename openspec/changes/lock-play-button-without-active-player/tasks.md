# Tasks

## 1. Backend
- [x] 1.1 Add `deviceActive` boolean to the `GET /party/{id}/track/current` response in `TrackResource.java`, derived from `SpotifyCredentials.getDeviceId()` for Spotify parties (`true` for other providers)
- [x] 1.2 Add/extend a backend test covering `deviceActive` `true`/`false` cases

## 2. Web frontend
- [x] 2.1 Read `deviceActive` from `/track/current` in `host-dashboard.ts`
- [x] 2.2 Bind `disabled` state of Play/Pause/Skip buttons to `deviceActive` in `host-dashboard.html`
- [x] 2.3 Show a hint message (German) when controls are locked, e.g. "Player muss zuerst geöffnet werden."
- [ ] 2.4 Verify controls unlock automatically once the startpage registers a device, without reload

## 3. iOS app
- [x] 3.1 Read `deviceActive` from `/track/current` in the admin dashboard view model
- [x] 3.2 Disable Play/Pause/Skip in `CurrentSongPlaying.swift` when `deviceActive` is `false`
- [x] 3.3 Show the same hint text as the web dashboard

## 4. Verification
- [ ] 4.1 Manually verify: fresh party, no startpage opened → controls locked on both web and iOS
- [ ] 4.2 Manually verify: opening the startpage unlocks controls on both clients without reload
