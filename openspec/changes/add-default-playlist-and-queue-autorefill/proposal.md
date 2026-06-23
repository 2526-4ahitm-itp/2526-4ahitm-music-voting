# Proposal: Default Playlist Selection and Automatic Queue Refill

## Intent

Today, when the party queue runs dry the music stops — the dashboard shows "Warteschlange ist leer" and nothing starts automatically (`playback/spec.md` "Empty Queue Behavior"). At a real party this means dead air whenever guests stop adding songs. There is also a long-standing open question about what should happen on an empty queue (the web spec said stop/pause; the old Swift spec said play random Top-Charts). This change resolves it.

The host should be able to pick one of their own Spotify playlists as a **default playlist** when creating a party. While a song is playing and the queue would otherwise be empty, the system MUST keep playback going automatically:
- if a default playlist is set, it tops up the queue from that playlist;
- if no default playlist is set, it tops up the queue with Spotify recommendations seeded by the currently playing song.

Guest-added songs and votes always take precedence over auto-filled songs, so the crowd still drives the queue — the auto-fill is only filler to avoid silence.

## Scope

In scope:
- Backend: store an optional `defaultPlaylistId` on the party; expose an endpoint to list the host's Spotify playlists (OAuth already grants `playlist-read-private`); expose an endpoint to set the party's default playlist; auto-refill the queue when it would otherwise be empty while a song is playing.
- Provider (`SpotifyMusicProvider`): list the host's playlists, fetch a playlist's tracks, and fetch recommendation seeds for the currently playing track.
- Web host creation flow: after Spotify auth, show a playlist picker with an explicit "no default playlist" / skip option, then continue to the host dashboard.
- Replace the "Empty Queue Behavior" requirement: auto-refill instead of stopping (stop only when refill genuinely yields nothing).

Out of scope (call out as follow-ups):
- iOS party-creation playlist picker — the backend auto-refill benefits iOS too, but the iOS selection UI is a separate change.
- Blacklist filtering of auto-filled songs — deprioritized by the team for now; auto-filled songs are not blacklist-checked in this change.
- Letting the host change the default playlist after creation (creation-time only for v1).
- Any change to how guest adds/votes sort, beyond ensuring auto-filled songs sort below real entries.

## Approach

At party creation the existing flow (create party → Spotify OAuth → callback) is extended: after the callback, the web host sees a playlist picker populated from `GET /api/party/{id}/spotify/playlists`. Choosing a playlist calls an endpoint that stores its ID on the party; choosing "skip" leaves it null. Both paths then land on the host dashboard.

Queue refill is a backend concern triggered when the queue would drop to only the currently playing entry (or empty) while a song is playing — checked after each track advance (`playNextAndRemove` / `startFirstSongWithoutRemoving`) and exposed so the dashboard's "advance" path benefits. The backend adds a small batch of songs (e.g. up to 5) to the bottom of the queue: from the default playlist if set (picking tracks not already queued/played), otherwise from Spotify recommendations seeded by the current track. Auto-filled entries are normal queue entries (guests can still vote on them) but are inserted as lowest-priority so any guest-added song or upvote outranks them.

If recommendations are unavailable (see design — Spotify deprecated this API for newer apps) and no default playlist is set, the system falls back to the previous behavior: stop/pause and show "Warteschlange ist leer".
