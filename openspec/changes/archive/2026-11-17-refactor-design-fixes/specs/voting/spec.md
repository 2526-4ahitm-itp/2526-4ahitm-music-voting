# Spec Delta: voting

## ADDED Requirements

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

