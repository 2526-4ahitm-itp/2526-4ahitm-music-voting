# Spec Delta: dashboard

## ADDED Requirements

### Requirement: Dashboard Uses the Full Width at 1920 px
On a 1920×1080 display the now-playing column and the queue column of the TV dashboard MUST together span the content width. The horizontal gap between the two columns MUST be a fixed size of at most 6 % of the viewport width (115 px at 1920 px), so no empty area opens up in the middle.

#### Scenario: No empty middle on a full-HD TV
- GIVEN the dashboard runs in a 1920×1080 browser window with a playing song and a non-empty queue
- WHEN the layout is measured
- THEN the gap between the right edge of the now-playing column and the left edge of the queue column is at most 115 px

### Requirement: Dashboard Pulses When a Like Count Changes
When the like count of a visible queue entry changes on the TV dashboard, its heart and its number MUST pulse once (at most 600 ms), so the change is noticeable from the couch. Under `prefers-reduced-motion: reduce` the heart and number MUST only change colour briefly, without scaling or movement. Entries whose count did not change MUST NOT pulse.

#### Scenario: A like makes the entry pulse
- GIVEN song B is shown with 2 likes on the dashboard
- WHEN a `vote-updated` event raises B's like count to 3
- THEN B's heart and number pulse once
- AND the other entries do not pulse

#### Scenario: Reduced motion
- GIVEN the TV's browser reports `prefers-reduced-motion: reduce`
- WHEN song B's like count changes
- THEN B's heart and number briefly change colour without scaling
