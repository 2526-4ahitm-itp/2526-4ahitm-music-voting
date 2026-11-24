# Spec Delta: dashboard

## MODIFIED Requirements

### Requirement: No Host Controls on Dashboard
The dashboard MUST NOT expose pause, resume, skip, remove, blocklist, or end-party controls. These live on the host client only.

#### Scenario: Dashboard contains no control affordances
- GIVEN the dashboard is connected to a party
- WHEN a viewer inspects the dashboard UI
- THEN no button or gesture allows pause, resume, skip, remove, blocklist edits, or ending the party
