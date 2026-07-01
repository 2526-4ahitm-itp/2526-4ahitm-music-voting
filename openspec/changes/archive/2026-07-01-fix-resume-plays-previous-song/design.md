## Context

`SpotifyMusicProvider` drives playback against the Spotify Connect device. The backend treats `PartyEntity.currentlyPlayingEntryId` as the single source of truth for the current track (see the `playback` spec, "DB-Backed Currently Playing Track"). Two places let that truth drift from the device:

1. `resumePlayback` calls `PUT /me/player/play` with only `position_ms`, **no `uris`** — Spotify resumes whatever the device last loaded. If that differs from the current entry, resume plays the wrong (previous) song.
2. `playNextAndRemove` commits `currentlyPlayingEntryId = B` whenever the play call returns `2xx`. But `2xx` from Spotify only means "command accepted," not "device is now playing B" — a stale/`not_ready` web-player device can accept the command without switching, leaving the device on A while the backend records B.

The `Wiederhol` button works because `onRestartCurrent` → `play(uri)` always names the current uri. The resume fix makes resume behave the same way: never trust the device to hold the right track implicitly.

> **Update 2026-07-01 (post-deploy):** point (2) tempted an advance-side "confirm the switch" guard, which was implemented and deployed — then proven harmful by the live logs. It is now dropped. See "Advance: commit on 2xx (confirmation dropped)" below.

## Goals / Non-Goals

**Goals:**
- Resume always plays the displayed/current track.
- Ship the start/stop diagnostic logging alongside, to verify the fix and make residual drift observable.

**Non-Goals:**
- **Gating the advance commit on a device snapshot** — attempted and reverted (see below); Spotify's read side is too laggy to make it safe.
- Reworking the two-driver autoplay (startpage SDK + dashboard both call `/track/next`) — out of scope; the per-URI and cooldown guards stay as they are.
- Changing endpoint signatures, DB schema, or frontend code.
- Changing how progress (`playbackStartedAt` / `pausedPositionMs`) is modeled — only *how resume issues the play call*.

## Decisions

- **Resume re-asserts the uri.** In `resumePlayback`, resolve the current `QueueEntry` from `currentlyPlayingEntryId` and send `PUT /me/player/play` with `{ uris: [currentUri], position_ms: pausedPositionMs }` — the same shape `restoreCurrentTrackOnDevice` already uses. Keep the existing post-success bookkeeping (`playbackStartedAt` adjusted from paused position, `pausedPositionMs = null`, `lastPlaybackActive = true`). Only when there is no current entry fall back to the old bare resume.
  - *Alternative considered*: read the device snapshot first and only re-assert on mismatch. Rejected as strictly more complex and more fragile (extra call, snapshot latency) with no benefit — re-asserting the uri unconditionally at the paused position is idempotent and deterministic.
- **Advance: commit on `2xx` (confirmation dropped).** `playNextAndRemove` commits `currentlyPlayingEntryId` to the new entry (and deletes the previous) as soon as `play(party, B)` returns `2xx` — its original behavior. It does **not** read `getCurrentPlaybackSnapshot` to gate the commit.
  - *Why the snapshot-confirm was tried and reverted*: the first cut added a "lenient match" — refuse to commit only when the post-play snapshot still reported the *previous* uri A. Deployed live, the diagnostic logs showed Spotify's `currently-playing` **lags the play command by seconds and reports the previous uri during that window**, so the guard refused *healthy* advances. Concrete capture (party `5a689195`, four songs S1→S4):
    ```
    10:32:03 NEXT  current=S3 Weinerschnitzel  next=S4 Breaking Glass  device=S3 is_playing=true
    10:32:03 PLAY  (play(S4) issued, 2xx)      current=S3               device=S3 is_playing=false  ← snapshot STILL S3 → refuse
    10:32:20 RESUME current=S3 …               ← user pressed Play → re-asserts S3 → replays it
    10:32:33 NEXT  current=S3 …                ← still pinned to S3
    10:32:57 PAUSE current=S4 Breaking Glass   ← only recovered ~54s later
    ```
    Because the refusal leaves `current` unmoved, autoplay stalls on the finished song and resume replays it — exactly the reported bug. The refusal is also racy (some advances snapshot at a lucky moment and commit), which is why it was intermittent. No tightening helps: the snapshot cannot distinguish "device genuinely stuck on A" from "device hasn't updated now-playing to B yet," and a bounded re-poll would have to block for the multi-second lag observed. So confirmation-by-immediate-snapshot is unviable; advance trusts the `2xx` and relies on the resume re-assert to correct any real drift.
- **Shared logging helper.** Identical to `add-playback-transition-logging`: one `logPlaybackTransition(op, party)` using `io.quarkus.logging.Log`, called at the top of all five start/stop methods. This change subsumes that one. The logging is what made the above diagnosis possible and stays as the mechanism to observe any future drift.

## Risks / Trade-offs

- **Advance drift not enforced** → if a `2xx` play doesn't actually switch the device, the backend still records the new track. Accepted: the resume re-assert and `Wiederhol` both re-play `current` by uri, so the user-visible symptom (resume plays previous) is fixed regardless, and the logging surfaces the drift. Enforcing at commit time is not achievable with Spotify's laggy read side.
- **Re-asserting uri on resume restarts the request even if the device already had B** → harmless: playing the same uri at the same position is a no-op audibly and matches how re-registration already behaves.

## Resolved Questions

- **Should advance confirm the device switched before committing?** → **No.** Tried (lenient snapshot match) and reverted after live logs proved it refuses healthy advances and stalls autoplay (see the Advance decision above). Advance commits on `2xx`; drift is observed via logging and corrected by the resume re-assert, not blocked at commit.
