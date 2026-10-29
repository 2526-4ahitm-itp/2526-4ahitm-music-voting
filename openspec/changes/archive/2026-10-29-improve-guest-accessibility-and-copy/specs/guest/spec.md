## ADDED Requirements

### Requirement: Accessible Guest Screens
The web app MUST declare German as its document language (`<html lang="de">`). On the guest screens (`/code`, `/voting`, `/guest`):
- every interactive control MUST be a native control (`<button>`, `<input>`) reachable by keyboard and MUST have an accessible name in German,
- the five PIN boxes MUST form a group named „Party-PIN“ and each box MUST be labelled „Ziffer N von 5“,
- search fields MUST have an accessible name independent of their placeholder,
- cover images next to a visible song title MUST be decorative (`alt=""`),
- the bottom tab of the current view MUST carry `aria-current="page"`,
- keyboard focus MUST be visible on every control.

#### Scenario: Screen reader reads German
- GIVEN a guest uses a screen reader on any page of the web app
- WHEN the page loads
- THEN the document language is German (`lang="de"`)

#### Scenario: Back control works with the keyboard
- GIVEN a guest on `/code` navigates with the Tab key
- WHEN focus reaches the back control and the guest presses Enter
- THEN the app navigates to the start page
- AND the control is announced as a button named „Zurück“

#### Scenario: PIN boxes are labelled
- GIVEN a screen reader user on `/code`
- WHEN focus moves into the third PIN box
- THEN it is announced as „Ziffer 3 von 5“ within the group „Party-PIN“

#### Scenario: Current tab is announced
- GIVEN a guest on `/voting`
- WHEN a screen reader reaches the bottom tab bar
- THEN the „Voten“ tab is announced as the current page

### Requirement: Consistent Informal Guest Copy
All guest-facing text MUST address the guest informally („du“). The guest side MUST use „Warteschlange“ for the party's song list (not „Playlist“) and „PIN“ for the 5-digit join code (not „Code“). The PIN entry view MUST tell the guest where to find the PIN (on the TV). The voting view MUST explain in one line that likes decide the order. When the queue is empty, the voting view MUST show „Warteschlange ist leer“.

#### Scenario: PIN entry explains where the PIN is
- GIVEN a guest opens `/code`
- WHEN the guest reads the instructions
- THEN the text uses „du“ and says that the PIN is shown on the TV

#### Scenario: Voting view explains likes
- GIVEN a guest opens `/voting`
- WHEN the guest reads the header
- THEN a line states that songs with more likes play earlier

#### Scenario: Empty queue
- GIVEN the party's queue is empty
- WHEN a guest opens `/voting`
- THEN the view shows „Warteschlange ist leer“
