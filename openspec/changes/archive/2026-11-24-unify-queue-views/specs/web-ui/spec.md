# Spec Delta: web-ui

## MODIFIED Requirements

### Requirement: Interactive Elements Are Real, Labelled Controls
Every element that reacts to a click or tap MUST be a native `<button>` or `<a>` (or an element with the matching role, `tabindex="0"` and Enter/Space handling). Interactive elements MUST NOT be nested inside other interactive elements. Every control without visible text MUST have a German `aria-label` describing its action.

#### Scenario: Icon-only controls are named
- GIVEN the back arrow, the menu button, the player controls and the queue actions are rendered
- WHEN a screen reader focuses them
- THEN they announce German action names such as "Zurück", "Menü öffnen", "Pause", "Nächster Song" and "Song entfernen"

#### Scenario: Keyboard user goes back
- GIVEN a keyboard-only user is on the "Party erstellen" page
- WHEN the user presses Tab until the back arrow is focused and presses Enter
- THEN the app navigates back

#### Scenario: Icon button has a label
- GIVEN a guest sees search results on the guest page
- WHEN a screen reader focuses the add button of a search result
- THEN it announces "Song hinzufügen"

#### Scenario: No nested buttons
- GIVEN any page of the web app is rendered
- WHEN the DOM is inspected
- THEN no `<button>` or `<a>` contains another `<button>` or `<a>`

### Requirement: HTL Credit Appears as a Footer on TV and Landing Page
The "powered by HTL Leonding" credit MUST appear as a single, unobtrusive footer line on the TV dashboard (`/startpage`) and on the landing page (`/`). On the landing page the line MUST be at least 20px high so it is noticed, while staying smaller than the role buttons. It MUST NOT appear as a separate content block on any page, and MUST NOT appear on the guest or host views.

#### Scenario: Credit on landing page and TV only
- GIVEN the web app is running
- WHEN a visitor opens `/` and the TV opens `/startpage`
- THEN both show the footer line "powered by HTL Leonding"
- AND the guest page `/voting` and the host dashboard do not show it

### Requirement: Brand Logo on Landing Page and TV
The MusicVoting logo mark MUST appear on the landing page (`/`) above the "MusicVoting" wordmark and on the TV dashboard (`/startpage`) in the footer directly in front of the wordmark. Below 600 px viewport width the landing page MUST show the logo mark at the left of its top bar, with the dark/light switch at the right. In dark mode the TV logo MUST have a faint white glow behind it so its dark segments stay visible on the dark stage; in light mode it has no glow. It is decorative next to the written name (empty alt text). Images in the UI MUST be served in a size close to their display size, not as multi-thousand-pixel originals.

#### Scenario: Logo on landing page and TV
- GIVEN the web app is running
- WHEN a visitor opens `/` and the TV opens `/startpage`
- THEN `/` shows the logo mark above "MusicVoting"
- AND the TV footer shows the logo mark in front of "MusicVoting", followed by "powered by HTL Leonding"

#### Scenario: Landing page top bar on a phone
- GIVEN a visitor opens `/` in a 390 px wide window
- THEN the top bar shows the logo mark at the left and the dark/light switch at the right

#### Scenario: TV logo glow in dark mode
- GIVEN the TV page is in dark mode
- WHEN the footer is rendered
- THEN the logo mark has a faint white glow behind it
- WHEN the TV page switches to light mode
- THEN the glow is gone

### Requirement: Host Can Switch Between Dark and Light Mode
All stage pages MUST offer a dark mode and a light mode; dark mode is the default. Every page except the TV page `/startpage` MUST show an icon-only toggle button in its top bar: a moon in dark mode, a sun in light mode, without visible text. It MUST be a real control with `role="switch"`, `aria-checked`, the `aria-label` "Heller Modus" and a tooltip naming the mode it switches to. The choice MUST be stored on the device and applied on the next visit and, without a reload, in other open tabs of the same browser, including the TV page. Both modes MUST meet the contrast rule "Text Meets WCAG AA Contrast".

#### Scenario: Host switches to light mode
- GIVEN the host is on the host dashboard in dark mode
- WHEN the host activates the toggle "Heller Modus"
- THEN the dashboard switches to the light look
- AND the switch reports `aria-checked="true"` and shows a sun

#### Scenario: Toggle has no visible text
- GIVEN any page with the toggle, at any viewport width
- WHEN the top bar is rendered
- THEN the toggle shows only an icon
- AND its tooltip reads "Hellen Modus einschalten" in dark mode and "Dunklen Modus einschalten" in light mode

#### Scenario: Choice is remembered
- GIVEN the host turned on light mode
- WHEN the host reloads the dashboard
- THEN the dashboard is shown in light mode

#### Scenario: TV follows the choice in the same browser
- GIVEN the TV page is open in another tab of the same browser
- WHEN the host turns on light mode on the dashboard
- THEN the TV page switches to light mode without a reload

#### Scenario: Default is dark
- GIVEN a device that never chose a mode
- WHEN the host opens the dashboard
- THEN dark mode is shown

### Requirement: Guests Keep Their Own Dark/Light Choice
The guest pages (join page `/code` and `/join/:pin`, and the guest page `/voting`) MUST store their dark/light choice separately from the host pages, the TV page and the other entry pages. Switching on a guest page MUST NOT change the host pages or the TV, and switching on a host page MUST NOT change a guest page whose mode was already chosen. Until a guest chooses, the guest pages start with the mode chosen on the entry pages of that device.

#### Scenario: Guest choice is separate from the host choice
- GIVEN a phone on which the host dashboard is in dark mode
- WHEN a guest page on the same phone is switched to light mode
- THEN the guest pages are shown in light mode
- AND the host dashboard and the TV page stay in dark mode

#### Scenario: Guest starts from the landing page choice
- GIVEN a guest switched the landing page to light mode and never used the switch on a guest page
- WHEN the guest joins a party
- THEN the join and voting pages are shown in light mode

#### Scenario: Switch on the entry pages
- GIVEN a visitor opens the landing page or the join page
- WHEN they look at the top bar
- THEN the toggle "Heller Modus" is shown
- AND turning it on also applies to the guest page later on the same device
