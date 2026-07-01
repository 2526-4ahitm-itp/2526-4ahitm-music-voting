## 1. Diagnose the transition (confirm the mechanism first)

- [ ] 1.1 Extend the advance/play logging: record the *resolved device id* from `resolvePlayableDeviceId` and a best-effort `GET /me/player/devices` snapshot (each `id`, `is_active`, `name`) at the moment `play(next)` runs
- [ ] 1.2 Rebuild + redeploy, reproduce the stall (4 songs, let it auto-advance), and read the logs
- [ ] 1.3 Determine from the logs whether the SDK device is absent/`is_active:false` at advance time (→ device dropped/wrong-target) or present but Spotify state merely lags (→ timing) — record the finding in `design.md` and pick the fix layer

## 2. Fix the advance so the device actually switches

- [ ] 2.1 (Leading) In the advance play step, activate/transfer playback to the resolved SDK device before playing the next uri — reuse the transfer approach from `restoreCurrentTrackOnDevice` (`PUT /me/player {device_ids:[deviceId], play:true}`), scoped to the party's registered device only
- [ ] 2.2 Ensure `resolvePlayableDeviceId` prefers the registered SDK device and does not silently fall back to a stale/phantom device when the SDK device is momentarily absent (per the 1.3 finding)
- [ ] 2.3 If a single transfer+play still races the SDK settle, add a bounded re-assert (re-issue the play once after a short delay) — re-play only, never gating the `2xx` commit
- [ ] 2.4 (Alternative / only if 1.3 points to timing) Adjust `startpage.ts` to advance shortly before the SDK pauses (small, duration-guarded margin) instead of after end

## 3. Verify

- [ ] 3.1 Backend unit tests for any new pure/testable seams (device-resolution preference; transfer-body construction) following the existing no-HTTP-mock pattern
- [ ] 3.2 Run `./mvnw test` in `musicvoting/backend` and confirm green
- [ ] 3.3 Rebuild + redeploy; live-check: 4 songs auto-advance through all four with **no manual Play**, and the logs show the resolved device = the SDK device and `current` following the device across each transition
