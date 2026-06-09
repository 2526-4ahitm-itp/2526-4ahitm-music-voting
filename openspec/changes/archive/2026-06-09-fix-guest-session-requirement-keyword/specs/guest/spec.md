# Δ guest/spec.md

## MODIFIED Requirements

### Requirement: Guest Session Persists Across Reloads
A guest's anonymous identity MUST be restored across reloads of the same device when a previously stored identity exists, so that the guest's existing likes and adds remain attributed to them. The persistence mechanism (localStorage, cookie, or device ID) is not yet fixed — see the project's open questions.

#### Scenario: Guest reloads the page
- GIVEN a guest has added one song and liked two songs
- WHEN the guest reloads the page
- THEN the same guest identity is restored
- AND the two likes are still shown as "liked by me"
