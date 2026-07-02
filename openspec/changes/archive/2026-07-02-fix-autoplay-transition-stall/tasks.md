## 1. Diagnose the transition (confirm the mechanism first)

- [x] 1.1 Extend the advance/play logging: record the *resolved device id* from `resolvePlayableDeviceId` and a best-effort `GET /me/player/devices` snapshot (each `id`, `is_active`, `name`) at the moment `play(next)` runs
- [x] 1.2 Rebuild + redeploy, reproduce the stall (4 songs, let it auto-advance), and read the logs
- [x] 1.3 Determine from the logs whether the SDK device is absent/`is_active:false` at advance time (→ device dropped/wrong-target) or present but Spotify state merely lags (→ timing) — record the finding in `design.md` and pick the fix layer — **Finding: device always present + `is_active:true` + correctly resolved; failure is timing (bare play into just-idled SDK device no-ops). Fix layer = backend activate/transfer (2.1), not resolution (2.2).**

## 2. Fix the advance so the device actually switches

- [~] 2.1 (Leading) In the advance play step, activate/transfer playback to the resolved SDK device before playing the next uri — reuse the transfer approach from `restoreCurrentTrackOnDevice` (`PUT /me/player {device_ids:[deviceId], play:true}`), scoped to the party's registered device only — **REVERTED: live tests showed `transfer{play:true}` resumes the account's stale currently-playing context (played the previous/other party's song while `current` showed the right one), in either order. A transfer is fundamentally unsafe here; superseded by 2.3.**
- [~] 2.2 Ensure `resolvePlayableDeviceId` prefers the registered SDK device and does not silently fall back to a stale/phantom device when the SDK device is momentarily absent (per the 1.3 finding) — **N/A: 1.3 showed the resolver already returns the correct active device every time; no change needed**
- [x] 2.3 If a single transfer+play still races the SDK settle, add a bounded re-assert (re-issue the play once after a short delay) — re-play only, never gating the `2xx` commit — **Chosen fix: after the play 2xx, re-issue the exact next uri once after a ~700 ms settle delay (with `position_ms` for seamless continuation). Re-play only; can never play the wrong song.**
- [~] 2.4 (Alternative / only if 1.3 points to timing) Adjust `startpage.ts` to advance shortly before the SDK pauses (small, duration-guarded margin) instead of after end — **not taken: reliability kept backend-owned (see design.md Chosen Fix Layer)**

## 3. Verify

- [ ] 3.1 Backend unit tests for any new pure/testable seams (device-resolution preference; transfer-body construction) following the existing no-HTTP-mock pattern
- [ ] 3.2 Run `./mvnw test` in `musicvoting/backend` and confirm green
- [x] 3.3 Rebuild + redeploy; live-check: 4 songs auto-advance through all four with **no manual Play**, and the logs show the resolved device = the SDK device and `current` following the device across each transition — **Verified live by user 2026-07-02 on the re-assert build (new-party start + multi-transition play the correct song).**
