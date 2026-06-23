# Proposal: Show Checkmark on Search Results for Songs Already in the Queue

## Intent

Today, the "+" add button on a search result only shows a brief in-flight spinner/checkmark while the add request is in progress, then resets to "+" regardless of outcome — even if the add succeeded, or failed because the song is already queued. There is no lasting indication that a song is already in the queue, and a guest can repeatedly tap "+" on a song someone else just added, getting a swallowed 409 ("Song ist schon in der Warteschlange.") with no feedback.

This change makes the "in queue" state durable and shared: once a song is in the party's queue, its search-result "+" button MUST show a checkmark and MUST be disabled, for every guest/host viewing search results — not just the person who added it — and MUST update live as the queue changes.

## Scope

In scope:
- Web frontend (guest search `guest.ts`/`guest.html` and host search `search-host.ts`/`search-host.html`): cross-reference search results against the current queue's track URIs; show a disabled checkmark for matches; keep live in sync via the existing `queue-updated` SSE event (re-fetch queue on receipt).
- iOS app (`SongAddView.swift` / `SongAddViewModel`): same behavior — load current queue URIs on appear and refresh on `queue-updated` SSE; disable "+" and show checkmark for queued tracks.
- A small shared helper/service per platform to fetch the current queue's track URIs and expose live updates, reused by both web search components.

Out of scope:
- Backend changes — the existing `/api/party/{id}/track/queue` endpoint and `queue-updated` SSE event are sufficient (queue entries already expose `uri`, matching search result `uri`).
- Changing the duplicate-add error response (`409 "Song ist schon in der Warteschlange."`) — it remains as a backend safety net but should no longer be reachable from the UI once results are correctly marked.
- Any change to queue ordering, voting, or playback.
- Re-enabling the button when a song leaves the queue while the *same search results* are still on screen is in scope (the live update must reflect removals too), but no special transition/animation is required.

## Approach

Each search view (guest, host, iOS) loads the set of track URIs currently in the party's queue when it mounts, and again whenever the `queue-updated` SSE event fires for that party. Search results are rendered by checking membership of `track.uri` in that set: if present, the "+" button is replaced with a disabled checkmark; otherwise it behaves as before (transient in-flight spinner while the add request is pending).

On the web, a small shared `QueueStateService` (or equivalent) wraps `getQueue()` and exposes the current set of in-queue URIs plus an `Observable` that re-emits on `queue-updated`. Both `guest.ts` and `search-host.ts` inject it. On iOS, `SongAddViewModel` gains a `queuedTrackUris: Set<String>` published property, populated via the existing `track/queue` endpoint and refreshed on the `queue-updated` SSE event (the search view subscribes to the party's SSE stream the same way the admin dashboard does).
