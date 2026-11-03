# Spec Delta: web-ui (new capability)

## Purpose

Cross-cutting requirements for every page of the Angular web app (guest, host and TV dashboard): language, accessibility, focus, status announcements, contrast, motion, image fallbacks and form of address. The iOS app is not covered.

## ADDED Requirements

### Requirement: Document Language Is German
The web app's root document MUST declare `lang="de"`, because all user-facing text is German.

#### Scenario: Screen reader uses German pronunciation
- GIVEN any page of the web app is loaded
- WHEN the document root is inspected
- THEN its `lang` attribute is `"de"`

### Requirement: Interactive Elements Are Real, Labelled Controls
Every element that reacts to a click or tap MUST be a native `<button>` or `<a>` (or an element with the matching role, `tabindex="0"` and Enter/Space handling). Interactive elements MUST NOT be nested inside other interactive elements. Every control without visible text, such as icon buttons, the back arrow, the menu button and the player controls, MUST have a German `aria-label` describing its action (for example "Zurück", "Menü öffnen", "Song hinzufügen", "Pause", "Nächster Song", "Song entfernen").

#### Scenario: Keyboard user goes back
- GIVEN a keyboard-only user is on the "Party erstellen" page
- WHEN the user presses Tab until the back arrow is focused and presses Enter
- THEN the app navigates back

#### Scenario: Icon button has a label
- GIVEN a guest is on the add/search view
- WHEN a screen reader focuses the add button of a search result
- THEN it announces "Song hinzufügen"

#### Scenario: No nested buttons
- GIVEN any page of the web app is rendered
- WHEN the DOM is inspected
- THEN no `<button>` or `<a>` contains another `<button>` or `<a>`

### Requirement: Focus Is Always Visible
Every focusable element MUST show a visible focus indicator when focused via keyboard (`:focus-visible`), with at least 3:1 contrast against the surrounding background. `outline: none` MUST NOT be used without a replacement indicator of equal visibility. The five code-input boxes MUST be grouped with the accessible name "Party-Code" and each box MUST be labelled "Ziffer 1" to "Ziffer 5".

#### Scenario: Focused code box is visible
- GIVEN a guest tabs into the code-input page
- WHEN the first code box receives focus
- THEN a clearly visible focus ring is shown around it
- AND a screen reader announces "Party-Code, Ziffer 1"

### Requirement: Status Changes Are Announced
Confirmations, errors and loading messages that appear without a page change, such as "Song hinzugefügt", "Nicht erlaubt.", "Party nicht gefunden.", "Party wird gesucht …" and "Die Party ist beendet.", MUST be rendered in a live region (`aria-live="polite"`, or `role="alert"` for errors) so screen readers announce them.

#### Scenario: Add error is announced
- GIVEN a guest using a screen reader adds a song that is already queued
- WHEN the backend rejects it with "Song ist schon in der Warteschlange."
- THEN the message is announced by the screen reader without moving focus

### Requirement: Text Meets WCAG AA Contrast
All text MUST meet WCAG 2.2 AA contrast against the background it is actually rendered on, including every point of a gradient behind it: at least 4.5:1 for normal text and 3:1 for text of 24px or larger (or 18.66px bold). Meaning MUST NOT be conveyed by colour alone. A blocked or disabled state MUST also be recognisable without colour, through a label, an icon or a disabled control.

#### Scenario: Subtitle on the gradient is readable
- GIVEN a subtitle is rendered on the purple-to-coral gradient
- WHEN its contrast is measured at the lightest point of the gradient behind it
- THEN the ratio is at least 4.5:1

### Requirement: Motion Respects User Preference
All non-essential animations (vote pop, rank movement, soundwave, page transitions) MUST be disabled or reduced to a simple fade when `prefers-reduced-motion: reduce` is set.

#### Scenario: Reduced motion on a phone
- GIVEN a guest's phone requests reduced motion
- WHEN the guest likes a song
- THEN no pop animation plays
- AND the liked state is still shown immediately

### Requirement: Cover Images Have a Working Fallback
Every album cover in the web app MUST be rendered through one shared cover component. It MUST show the bundled placeholder image when the track has no image URL, the `images` array is empty or missing, or the image fails to load. Covers are decorative next to the song title, so they MUST use `alt=""`. Pages MUST NOT index into an images array without a guard.

#### Scenario: Search result without cover
- GIVEN a search result whose `album.images` is empty
- WHEN the guest or host search renders it
- THEN the placeholder image is shown
- AND no broken-image icon appears

#### Scenario: Cover URL fails to load
- GIVEN a queue entry whose cover URL returns an error
- WHEN the voting view renders it
- THEN the placeholder image replaces the broken image

### Requirement: HTL Credit Appears as a Footer on TV and Landing Page
The "powered by HTL Leonding" credit MUST appear as a single, unobtrusive footer line on the TV dashboard (`/startpage`) and on the landing page (`/`). It MUST NOT appear as a separate content block on any page, and MUST NOT appear on the guest or host views.

#### Scenario: Credit on landing page and TV only
- GIVEN the web app is running
- WHEN a visitor opens `/` and the TV opens `/startpage`
- THEN both show the footer line "powered by HTL Leonding"
- AND the guest views `/voting` and `/guest` and the host dashboard do not show it

### Requirement: Guests and Hosts Are Addressed with "du"
All user-facing text in the web app MUST address the user with the informal "du". Formal "Sie" MUST NOT be used.

#### Scenario: Code input page uses "du"
- GIVEN a guest opens the code-input page
- WHEN the page text is read
- THEN it uses "du"-forms such as "Gib den Code ein"
- AND it contains no "Sie"-forms

### Requirement: Host Can Switch Between Dark and Light Mode
The stage pages (TV dashboard `/startpage`, host dashboard, host voting, host search and the blacklist page) MUST offer a dark mode and a light mode. Dark mode is the default. The host pages MUST show a switch "Heller Modus" in the always-visible top bar; it MUST be a real control with `role="switch"` and `aria-checked`. The choice MUST be stored on the device and MUST be applied on the next visit and in other open tabs of the same browser, including the TV page, without a reload. The TV page itself MUST NOT show the switch (see dashboard spec "No Host Controls on Dashboard"). Both modes MUST meet the contrast rule "Text Meets WCAG AA Contrast". Guest views are not affected.

#### Scenario: Host switches to light mode
- GIVEN the host is on the host dashboard in dark mode
- WHEN the host turns on "Heller Modus"
- THEN the dashboard switches to the light look
- AND the switch reports `aria-checked="true"`

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
