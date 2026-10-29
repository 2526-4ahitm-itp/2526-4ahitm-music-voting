## ADDED Requirements

### Requirement: Liked State Is Visible and Reversible on the Guest View
On the web voting view (`/voting`), a song the guest has liked MUST stay fully visible and interactive: the card MUST NOT be faded, greyed out or made unclickable. The liked state MUST be shown on the like button itself (filled heart on the brand primary color) and exposed to assistive technology via `aria-pressed="true"`. The like button MUST carry a German accessible name: „Song liken“ when not liked and „Like entfernen“ when liked. Tapping the like button of a liked song MUST remove the like (see "Likes Are Togglable"). While a vote request for a song is in flight, further taps on that song's like button MUST be ignored, so a double-tap cannot like and immediately unlike. When the like count changes, it MUST show a short emphasis animation unless the guest's system requests reduced motion.

#### Scenario: Liked song stays active
- GIVEN a guest has liked song X on `/voting`
- WHEN the queue is displayed
- THEN song X's card is fully opaque and not greyed out
- AND song X's like button shows a filled heart, has `aria-pressed="true"` and the label „Like entfernen“

#### Scenario: Guest removes a like from the voting view
- GIVEN a guest has liked song X, which shows 3 likes
- WHEN the guest taps song X's like button
- THEN the heart becomes unfilled and the count shows 2 immediately
- AND the like button has `aria-pressed="false"` and the label „Song liken“

#### Scenario: Double-tap during a pending request
- GIVEN a guest taps the like button of song X and the server has not answered yet
- WHEN the guest taps the same like button again
- THEN no second vote request is sent
- AND the optimistic state from the first tap stays

#### Scenario: Failed vote is visible
- GIVEN a guest taps the like button of song X
- WHEN the server returns an error
- THEN heart and count revert to the state before the tap
- AND the guest sees a feedback message that the like did not work
