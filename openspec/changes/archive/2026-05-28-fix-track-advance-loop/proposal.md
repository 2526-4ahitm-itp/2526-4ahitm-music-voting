# Proposal: Fix Track Advance Loop (Same Song Repeats)

## Intent
When a song ends the dashboard calls `POST /track/next`, but the backend's `playNextAndRemove` always picks `queue.get(0)` — which is the **currently playing entry** because it is still in the `queue_entry` table at that point. The backend re-plays the same song, removes it, and sets `currentlyPlayingEntryId` to the (now deleted) row. The pattern is: every song plays twice before advancing.

A second risk exists on the frontend: because `play()` sends `{"uris": [uri]}` (no playlist context), the Spotify SDK moves the just-finished track into `previous_tracks` when the song ends. If the SDK fires a brief `paused=true, position=0` state during the transition to the new track, the `previous_tracks.length > 0` guard is already satisfied, and `playNext()` gets called a second time, potentially skipping the song that just started.

## Scope
In scope:
- Backend: `playNextAndRemove` skips the currently playing entry when selecting the next track
- Frontend: `playNext()` is protected by an `isAdvancing` flag so it cannot be called concurrently

Out of scope:
- Changing the queue sort or schema
- Handling the truly empty-queue case differently (already returns "Warteschlange ist leer")

## Approach
**Backend**: Fetch `partyEntity` at the top of `playNextAndRemove`, read `currentlyPlayingEntryId`, and stream-filter the queue to exclude that entry before calling `findFirst()`. If the filtered queue is empty (only the current track remains), delete it and return the empty message.

**Frontend**: Add `private isAdvancing = false` to `Startpage`. Guard `playNext()` with an early return if `isAdvancing`, set it to `true` on entry, and clear it after 3 seconds in `finally` — enough time for the Spotify SDK to emit a stable playing state for the new track so spurious end-of-track events during transition are ignored.
