# Delta for Host

## ADDED Requirements

### Requirement: Create Party Back Navigation Returns to Host Options
The back arrow on the "Create party" page MUST navigate to the "Host options" page (`/host-options`), the page from which "Create party" is reached, rather than skipping back to the home page.

#### Scenario: Host navigates back from Create party
- GIVEN the host navigated Home → Host options → Create party
- WHEN the host taps the back arrow on the "Create party" page
- THEN the host is taken to the "Host options" page
- AND not directly to the home page
