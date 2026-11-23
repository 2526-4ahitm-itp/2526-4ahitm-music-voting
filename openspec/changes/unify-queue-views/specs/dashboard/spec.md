# Spec Delta: dashboard

## ADDED Requirements

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
