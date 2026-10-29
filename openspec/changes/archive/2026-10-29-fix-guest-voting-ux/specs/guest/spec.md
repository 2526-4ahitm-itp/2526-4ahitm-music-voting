## MODIFIED Requirements

### Requirement: Guest Bottom Tab Navigation
The web guest experience MUST present a persistent bottom tab bar on both guest views — the voting view (`/voting`) and the add/search view (`/guest`). The tab bar MUST contain exactly two tabs: "Voten" navigating to `/voting`, and "Hinzufügen" navigating to `/guest`. The tab corresponding to the currently displayed view MUST be marked active. No burger button or slide-in side menu is used for navigation between guest views. The tab bar MUST NOT permanently cover content: the scrolling list on both views MUST reserve enough space at its end (including the device's bottom safe area) that the last card and its button can be scrolled fully above the tab bar. Both views MUST size to the dynamic viewport height (`100dvh`) so the mobile browser's address bar does not shift the layout.

#### Scenario: Guest switches from voting to adding songs
- GIVEN a guest is on the voting view (`/voting`) with the "Voten" tab active
- WHEN the guest taps the "Hinzufügen" tab
- THEN the app navigates to the add/search view (`/guest`)
- AND the "Hinzufügen" tab is now marked active

#### Scenario: Guest switches from adding back to voting
- GIVEN a guest is on the add/search view (`/guest`) with the "Hinzufügen" tab active
- WHEN the guest taps the "Voten" tab
- THEN the app navigates to the voting view (`/voting`)
- AND the "Voten" tab is now marked active

#### Scenario: Last song can be liked on a phone
- GIVEN a guest on a 390×844 phone viewport views a queue whose cards fill more than the screen
- WHEN the guest scrolls the list to the end
- THEN the last card's like button is fully visible above the tab bar and can be tapped

## ADDED Requirements

### Requirement: Guest Feedback Messages
Both web guest views MUST show the outcome of a guest's add and vote actions, and of failed searches, as a short German message in a shared feedback area that is announced to assistive technology (`aria-live="polite"`) and disappears on its own after a few seconds. Error messages MUST NOT only be logged to the console. The add endpoint's responses MUST map to these messages:
- success: the song was added (e.g. „„<Titel>“ ist in der Warteschlange.“),
- HTTP 409: „Song ist schon in der Warteschlange.“,
- HTTP 429: „Zu viele Anfragen — bitte kurz warten.“,
- any other failure: a generic retry message.

#### Scenario: Guest adds a song
- GIVEN a guest on `/guest` sees song X in the search results
- WHEN the guest taps "+" on song X and the server accepts it
- THEN the guest sees a message that song X is in the queue

#### Scenario: Duplicate add is explained
- GIVEN song X is already waiting in the queue
- WHEN a guest's add request for song X returns HTTP 409
- THEN the guest sees „Song ist schon in der Warteschlange.“

#### Scenario: Rate limit is explained
- GIVEN a guest's add request returns HTTP 429
- WHEN the response arrives
- THEN the guest sees „Zu viele Anfragen — bitte kurz warten.“

### Requirement: Readable PIN Entry Error
On the web PIN entry view (`/code`), error messages MUST be readable on the brand gradient (at least WCAG AA contrast, e.g. dark text on a white chip) and announced to assistive technology. When a complete PIN does not resolve to a party („Party nicht gefunden.“), the five digit boxes MUST be cleared and focus MUST return to the first box so the guest can type the PIN again.

#### Scenario: Wrong PIN resets the input
- GIVEN a guest types the 5-digit PIN "12345" that belongs to no party
- WHEN the PIN lookup fails
- THEN the guest sees „Party nicht gefunden.“ with readable contrast
- AND all five boxes are empty and the first box has focus
