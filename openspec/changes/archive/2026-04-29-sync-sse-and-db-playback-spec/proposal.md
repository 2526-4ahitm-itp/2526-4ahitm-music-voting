# Proposal: Sync SSE Events and DB-Backed Playback into Specs

## Problem

Several specs are out of sync with the implemented behaviour:

- `playback/spec.md` does not capture that `GET /track/current` reads from `PartyEntity.currentlyPlayingEntryId` in the database, not from Spotify's `/me/player/currently-playing` API.
- `voting/spec.md` says likes must "propagate promptly" but does not name the mechanism.
- `queue/spec.md` does not mention the SSE events emitted on add/remove.
- `dashboard/spec.md` does not describe how the TV display receives live updates.

## Change

Update four specs to reflect already-landed implementation:

1. **playback** — add "DB-Backed Currently Playing Track" requirement and `track-changed` SSE event.
2. **voting** — specify `vote-updated` SSE as the live-update mechanism.
3. **queue** — add "Live Queue Updates via SSE" requirement (`queue-updated` on add/remove).
4. **dashboard** — describe SSE-driven live updates (`queue-updated`, `vote-updated`, `track-changed`).

No code changes are required; this change is documentation only.
