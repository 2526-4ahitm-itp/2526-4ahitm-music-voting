## Context

The backend has no logging in its main code today — `SpotifyMusicProvider` and the endpoints are silent. A recurring, intermittent bug ("autoplay pauses on its own; pressing Play resumes the *previous* song; Wiederhol plays the correct one") strongly suggests `PartyEntity.currentlyPlayingEntryId` drifts out of sync with the track the Spotify device actually holds. Without any log output, this cannot be observed on a live party. This change adds the minimum observability to confirm the drift; the fix itself lives in `fix-resume-plays-previous-song`.

## Goals / Non-Goals

**Goals:**
- Emit one log line per start/stop operation that makes backend-vs-device state visible at a glance.
- Zero behavior change — pure observability.
- Best-effort: never let logging (or the extra Spotify call it needs) break or slow real playback.

**Non-Goals:**
- Fixing the desync (separate change).
- A logging framework, log config, or persistent audit trail — plain `io.quarkus.logging.Log` at INFO is enough.
- Logging on read paths (`/track/current`, `/track/queue`) or on progress ticks — those are high-frequency and not start/stop events.

## Decisions

- **Use `io.quarkus.logging.Log` (static).** Quarkus-native, no injection, no new dependency. Alternative (JBoss `Logger` field per class) is more boilerplate for no gain here.
- **One private helper** in `SpotifyMusicProvider`, e.g. `logPlaybackTransition(String op, Party party)`, called once at the start of each of the five methods. Centralizing keeps the five call sites to a single line each and the format consistent.
- **Reuse existing reads.** The queue comes from the same source `getQueue`/native query already uses; `currentlyPlayingEntryId` from `PartyEntity`; the device-loaded track from the existing `getCurrentPlaybackSnapshot` helper (already returns `uri` + `isPlaying`). "Next song" is computed exactly as `playNextAndRemove` does (first entry whose id ≠ `currentlyPlayingEntryId`) so the log matches real advance behavior.
- **Log at the entry of each method** (before the operation acts), so the line captures the state the decision was made on. For `NEXT` this is the pre-advance state, which is exactly what we need to catch the drift.
- **Best-effort snapshot.** Wrap the `getCurrentPlaybackSnapshot` call in its own try/catch inside the helper; on failure log the device track as unavailable rather than throwing.

## Risks / Trade-offs

- **Extra Spotify API call per start/stop** → start/stop is low-frequency (human-driven or once per song), and the call is best-effort with a short-circuit on failure, so the added latency/quota cost is negligible.
- **Log verbosity** (full queue each time) → queues are small (party playlists), and this is intentionally a diagnostic aid meant to be read; can be lowered to DEBUG later if noisy.
- **Snapshot reflects the host's whole Spotify account**, not only the app's device → acceptable, because the drift we're hunting is precisely "the device is playing something other than the app's current track," which the snapshot exposes.
