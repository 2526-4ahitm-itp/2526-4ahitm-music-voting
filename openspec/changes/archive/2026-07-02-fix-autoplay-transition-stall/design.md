## Context

The party's audio plays through the **Spotify Web Playback SDK** device created on the startpage (`spotify-player.ts`). There is no Spotify-native queue — each track is started individually via the backend: `POST /track/next` → `playNextAndRemove` → `play(party, uri)` → `PUT /me/player/play {uris:[uri]}` against the resolved device.

End-of-track detection lives in `startpage.ts`:

```
SDK plays track → track ends → SDK emits player_state_changed { paused:true, position:0 }
                                        │
                          maybeAdvanceOnEnd() sees paused+ended
                                        │
                                POST /track/next   ← fired AFTER the device has paused
```

So the advance's `play(next)` lands in the **end-of-track transition window**. Live logs (2026-07-01) show the tell-tale disagreement and outcome:

```
10:58:14 NEXT   current=S1  device=S1  is_playing=TRUE    (Web API lags; SDK already paused locally)
10:58:57 RESUME current=S2  device=S1  is_playing=FALSE   (43s later device STILL on S1, settled+paused)
10:59:37 PAUSE  current=S2  device=S2  is_playing=TRUE    (resume's identical play() DID work once settled)
```

`current` advances correctly (the `fix-resume-plays-previous-song` revert is working), but the device does not follow — until a settled resume re-issues the play. Every party start also shows `device=<previous test's last track>`, hinting the account/device state is stale/transitional at these moments.

## Goals / Non-Goals

**Goals:**
- Auto-advance actually starts the next track on the SDK device — no manual Play needed.
- Confirm the precise failure mechanism with a decisive datapoint before committing to a fix.
- Keep the resume/`Wiederhol` deterministic behavior intact.

**Non-Goals:**
- Re-introducing any snapshot-gated *commit* on advance (see `fix-resume-plays-previous-song`: reverted, harmful).
- Reworking the two-driver autoplay model (startpage SDK + host dashboard) beyond what's needed to make the transition land.
- Gapless/crossfade playback — only that the next track *starts*.

## Leading Hypothesis (to confirm first)

At end-of-track the SDK device briefly goes `not_ready` and drops off `GET /me/player/devices`. `resolvePlayableDeviceId` then can't match the stored SDK device id and falls back to "first active / first listed" — a stale or phantom device — so `play(next)` is accepted (`2xx`) but never reaches the device the host is actually listening on. Resume works because by the time the host presses Play the SDK device is `ready` again and resolves correctly.

**Decisive datapoint:** log the *resolved device id* plus the full `/me/player/devices` list (id, is_active, name) at the moment of the advance `play`. If the SDK device is absent/inactive there, the hypothesis holds.

## Diagnostic Finding (2026-07-01, party `753d4f14`)

The `[playback …-device]` logging from task 1.1 **refutes the leading hypothesis**. Across a 4-song reproduction that stalled going into song 3, **every** advance resolved the party's SDK device and reported it active:

```
NEXT/PLAY current=Hello        device=Hello         is_playing=true    → song 2 STARTS
  PLAY-device resolved=242a7fbe… devices=[id=242a7fbe… is_active=true name=Web Player MusicVoting]
NEXT       current=tau mich auf device=tau mich auf  is_playing=TRUE
PLAY       current=tau mich auf device=tau mich auf  is_playing=FALSE   ← device already idled
  PLAY-device resolved=242a7fbe… devices=[id=242a7fbe… is_active=true name=Web Player MusicVoting]   → song 3 STALLS
```

So the SDK device is **never absent, never inactive, and always the resolved target** — `resolvePlayableDeviceId` is correct and needs no change (task 2.2 is unnecessary). The only thing that differs between the two advances that *worked* (songs 1→2) and the one that *stalled* (2→3) is the device's `is_playing` at the instant `play(next)` was issued: the working advances hit the device while it still read `is_playing=true`; the stalled one hit it 106 ms after it had flipped to `is_playing=false` (end-of-track idle).

**Confirmed mechanism (timing, not wrong-device):** because `maybeAdvanceOnEnd` fires only after the SDK has paused, `play(next)` lands in the end-of-track idle window. A bare `PUT /me/player/play {uris:[next]}` into a *just-idled but still active* SDK device is accepted (`2xx`) but does **not** wake it, so playback stays paused on the finished song. The identical call succeeds once the device has settled — which is why **resume always works** and autoplay stalls.

## Chosen Fix Layer

- **Not** device-resolution (2.2): the resolver already returns the correct active device.
- **Rejected: device transfer (2.1).** Two live iterations proved `PUT /me/player {device_ids:[id], play:true}` is unsafe regardless of order relative to `play(uris)`:
  - *Transfer before play (14:16, party `154acf1e`):* `play:true` resumed the previous track, the following `play(uris)` lost the race → device played the *previous* song while `current` showed the next.
  - *Transfer after play (new-party start 15:00, party `7525322c`):* the new party's first `play(uris)` hadn't propagated, so `transfer{play:true}` resumed the **account's stale currently-playing context** (a track left over from a prior party/session) → played the wrong song while `current` showed the new first song.
  - Root problem: a transfer with `play:true` resumes *whatever context the account/device currently holds*, which is not deterministically the uri we just set. Any transfer can therefore play the wrong song. Abandoned.
- **Chosen backend fix (2.3): bounded re-assert of the exact uri.** Issue `play(uris:[next])` to the resolved device (commits on `2xx`), then — best-effort — re-issue the **same** `play(uris:[next])` once after a ~700 ms settle delay, carrying `position_ms` so a play that already took continues seamlessly instead of restarting. Because the re-assert always names the exact next uri, it can only ever (re)play the *correct* song; the worst case is a silent stall (recoverable by resume), never a wrong song. Re-play only; never gates the `2xx` commit.
- **Fallback held in reserve (2.3):** if a single transfer+play still races the settle in the next live test, add one bounded re-assert (re-issue play after a short delay) — re-play only, never gating the commit. Not implemented yet; revisit after re-testing.
- Frontend advance-timing (2.4) is **not** taken as the primary fix: since the advance fires only after the SDK has locally paused, success would still hinge on racy server-side lag; keeping the reliability backend-owned avoids truncating songs.

## Decisions

- **Diagnose before fixing.** First extend the advance/play logging with the resolved device id + devices snapshot and reproduce once. Cheap, and it prevents fixing the wrong layer. (The `[playback …]` logging from `fix-resume-plays-previous-song` already gives us the scaffolding.)
- **Leading fix — activate the SDK device before playing on advance.** Mirror `restoreCurrentTrackOnDevice`'s transfer step: `PUT /me/player {device_ids:[resolvedDevice], play:true}` (or equivalent) so the SDK device is the active target, then `play(uris)`. This is the same mechanism that already recovers a not-ready device at registration, so it is proven in-codebase.

## Open Questions

- **Which layer fixes it — backend device-transfer, or frontend advance-timing?**
  - *Backend*: transfer/activate the device as part of advance. Keeps the client dumb; one extra Spotify call per song.
  - *Frontend*: fire `/track/next` ~1–2s *before* the SDK pauses (while `is_playing=true`), so the switch happens on a live device. Simpler call path but timing-sensitive and risks cutting songs short.
  - Decide after the diagnostic confirms whether the device is droppable at end (favors backend transfer) or merely lagging (may favor frontend timing).
- **Transfer-then-play vs. play-then-verify-retry?** If a single transfer+play still races the SDK settle, a bounded re-assert (re-issue play once after a short delay) may be needed — but *only* to re-play, never to gate the commit (which stays on `2xx`).
- **Does `resolvePlayableDeviceId` need to prefer the registered SDK device more strongly** (e.g., wait/retry for the stored device to reappear) rather than falling back to "first listed"?

## Risks / Trade-offs

- **Extra Spotify call on every advance** (device transfer) → once per song, negligible quota/latency.
- **Transfer could steal playback** from another legitimately-active device → scope the transfer to the party's registered SDK device id only; never transfer to an arbitrary device.
- **Frontend-timing option risks truncating songs** if the pre-end advance fires too early → keep any early-advance margin small and duration-guarded.
