# Δ playback/spec.md

## ADDED Requirements

### Requirement: SSE Streams Deliver Only Events for the Subscribed Party
Every SSE event that carries a `partyId` in its payload MUST be delivered only to clients whose `partyId` query parameter matches that payload value. This applies to all event types: `progress`, `queue-updated`, `track-changed`, `vote-updated`, and `party-ended`. A client that supplies no `partyId` query parameter MAY receive all events of that type (backward-compatible fallback).

#### Scenario: party-ended for party A is not delivered to a client on party B
- GIVEN two parties A and B are active
- AND client X is subscribed to `/spotify/events` with `partyId=A`
- WHEN party B is ended and a `party-ended` event is emitted with `partyId=B`
- THEN the event is NOT delivered to client X
- AND client X remains on the active party A screen

#### Scenario: party-ended is delivered to the correct party
- GIVEN client Y is subscribed to `/spotify/events` with `partyId=B`
- WHEN party B is ended
- THEN the `party-ended` event IS delivered to client Y
- AND client Y navigates back to the start page
