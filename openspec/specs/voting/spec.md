# Voting Specification

## Purpose

Defines the like mechanism: one vote per guest per song, toggleable, with live updates across all clients. Votes drive the queue order (see `queue/spec.md`).

## Requirements

### Requirement: One Like per Guest per Song
The one-like-per-guest constraint MUST be enforced server-side using a `deviceId` supplied by the client. The database MUST reject a second vote from the same `deviceId` for the same song via a unique constraint on `(queue_entry_id, device_id)`. The frontend MUST include the `deviceId` in every vote request.

#### Scenario: Double-tap produces only one like
- GIVEN a guest with deviceId "abc" has not yet liked song X
- WHEN the guest triggers "like" twice in quick succession on song X
- THEN only one `vote` row exists for (song X, "abc")
- AND song X's like count is exactly one for this guest

#### Scenario: Second vote from same device is rejected
- GIVEN a guest with deviceId "abc" has already liked song X
- WHEN the client sends a second like request for song X with deviceId "abc"
- THEN the server rejects the request
- AND the like count for song X does not increase

### Requirement: Likes Are Togglable
A guest MUST be able to remove their own like by sending a toggle request with their `deviceId`. The server MUST delete the `vote` row for `(queue_entry_id, device_id)` when toggling off.

#### Scenario: Guest unlikes a previously liked song
- GIVEN a guest with deviceId "abc" has liked song X
- WHEN the guest sends a toggle-like request for song X with deviceId "abc"
- THEN the `vote` row for (song X, "abc") is deleted
- AND song X's like count decreases by one

### Requirement: Persistent Device Identity
Each client MUST generate a persistent `deviceId` UUID on first use and store it durably so it survives app close and reopen. On web, the `deviceId` MUST be stored in both `localStorage` and a long-lived cookie (min 1 year) so that clearing one storage mechanism alone does not create a new identity. On iOS, the `deviceId` MUST be stored in `UserDefaults` and survive app restarts.

#### Scenario: Web guest closes and reopens the browser
- GIVEN a guest has voted for song X using deviceId "abc"
- WHEN the guest closes the browser tab and reopens the app
- THEN the same deviceId "abc" is used for subsequent requests
- AND the queue shows song X with `hasVoted: true`

#### Scenario: Web guest clears localStorage but cookie remains
- GIVEN a guest has deviceId "abc" stored in both localStorage and cookie
- WHEN the guest clears localStorage only
- THEN the app recovers deviceId "abc" from the cookie
- AND no new identity is created

### Requirement: Optimistic Vote UI
When a guest toggles a vote, the UI MUST update the heart icon and like count immediately without waiting for the server response. If the server returns an error, the UI MUST revert to the state before the tap.

#### Scenario: Vote tap gives immediate feedback
- GIVEN a guest views a song with 2 likes and `hasVoted: false`
- WHEN the guest taps the heart button
- THEN the heart fills and the count shows 3 immediately
- AND the server request is sent in the background

#### Scenario: Vote tap reverts on error
- GIVEN a guest taps the heart and the server returns an error
- WHEN the error response arrives
- THEN the heart returns to unfilled and the count returns to its previous value

### Requirement: Live Like Updates
When a like is added or removed, the backend MUST emit a `vote-updated` SSE event scoped to the party. Every client that shows vote counts (the TV dashboard, the host dashboard, and the guest voting view) MUST subscribe to this event and reload the queue on receipt so that like counts and sort order stay consistent across devices without polling.

#### Scenario: Live update on all clients
- GIVEN guest A, guest B, the host dashboard, and the TV dashboard are all viewing the queue
- WHEN guest A likes song X
- THEN the backend emits `vote-updated` on the party SSE stream
- AND guest B's voting view, the host dashboard, and the TV dashboard each reload the queue
- AND song X's like count increases by one on every client
- AND the queue re-sorts if the new count changes the order

### Requirement: Voted State Is Highlighted, Not Disabled
In the web voting view, a song the guest has liked MUST be shown as a highlighted state, not as a disabled one:
- The card MUST stay fully opaque, in colour and tappable, so the guest can remove the like again (see "Likes Are Togglable").
- The heart MUST be filled in the accent colour, and the card MUST get an accent tint or outline.
- The like count MUST be shown on every card, including when it is 0.
- Heart, count and highlight MUST change immediately on tap (see "Optimistic Vote UI").

#### Scenario: Liked song stays tappable
- GIVEN a guest has liked song X
- WHEN the guest taps song X's heart again
- THEN the like is removed
- AND the heart becomes unfilled and the count decreases by one immediately

#### Scenario: Liked song is highlighted, not greyed out
- GIVEN a guest has liked song X and not song Y
- WHEN the voting view renders
- THEN song X's card is fully opaque and in colour, with a filled accent heart
- AND song X's card is visually distinct from song Y's card
- AND neither card is greyed out

#### Scenario: Zero likes are shown
- GIVEN song Y has no likes
- WHEN the voting view renders
- THEN song Y's card shows the count 0

### Requirement: Playing Song Shows a Soundwave Instead of a Heart
In the web voting view the currently playing song MUST keep its soundwave indicator instead of the heart and MUST NOT be votable.

#### Scenario: Playing song cannot be liked
- GIVEN a song is currently playing
- WHEN the guest looks at it in the voting view
- THEN it shows the soundwave indicator and no like button

### Requirement: Vote Button Animates and Exposes Its State
On the tap that adds a like, the heart MUST play a short "pop" animation (at most 300 ms), but not when `prefers-reduced-motion: reduce` is set. The vote button MUST expose its state to assistive technology: `aria-pressed="true"`/`"false"` and an `aria-label` of "Song liken" (not liked) or "Like entfernen" (liked).

#### Scenario: Screen reader announces the vote state
- GIVEN a guest has liked song X
- WHEN a screen reader focuses song X's vote button
- THEN it announces "Like entfernen" and the pressed state
