# Spec Delta: host

## ADDED Requirements

### Requirement: Host Dashboard Shows the Whole Queue on Every Screen
The web host dashboard is the only host view of the queue. Every waiting song MUST show its rank, cover, title, artist, like count and the "Song entfernen" button at every viewport width. On narrow screens the cover MUST get smaller rather than hiding rank or likes. There is no separate host voting page: `/voting-host` MUST redirect to `/dashboard`.

#### Scenario: Host on a phone sees ranks and likes
- GIVEN the host opens the dashboard in a 390 px wide window
- AND song B (3 likes) is ranked first
- WHEN the queue is rendered
- THEN B's row shows rank "1", the like count "3" and the "Song entfernen" button

#### Scenario: Old host voting link
- GIVEN a host with a stored PIN opens `/voting-host`
- WHEN the route loads
- THEN the app redirects to `/dashboard`

### Requirement: Host Filters the Queue on the Dashboard
The queue card of the web host dashboard MUST offer a field "In der Warteschlange suchen …" that filters the shown songs by title or artist (case-insensitive). Filtering MUST NOT change the rank numbers. If no song matches, "Kein Song passt zu „<Suchbegriff>“" MUST be shown.

#### Scenario: Filter keeps the ranks
- GIVEN B has rank 1 and C has rank 2 in the queue
- WHEN the host types C's title into the filter field
- THEN only C is shown, still with rank 2

#### Scenario: Filter without match
- GIVEN the queue contains no song by "xyz"
- WHEN the host types "xyz" into the filter field
- THEN "Kein Song passt zu „xyz“" is shown

### Requirement: Host Adds Songs from the Dashboard
The web host dashboard MUST offer a button "+ Song" that opens a song search inside the dashboard. It searches the party's provider and adds songs like the former host search page: blocked results greyed out with "Nicht erlaubt.", queued songs with a disabled checkmark (see `search/spec.md`). A button "Fertig" closes the search. `/search-host` MUST redirect to `/dashboard`.

#### Scenario: Host adds a song without leaving the dashboard
- GIVEN the host is on the dashboard
- WHEN the host taps "+ Song", searches for "Daft Punk" and taps "+" on a result
- THEN the song is added to the queue and shown in the queue card
- AND the host is still on `/dashboard`

#### Scenario: Host closes the search
- GIVEN the song search is open on the dashboard
- WHEN the host taps "Fertig"
- THEN the search closes and focus returns to "+ Song"

#### Scenario: Old host search link
- GIVEN a host with a stored PIN opens `/search-host`
- WHEN the route loads
- THEN the app redirects to `/dashboard`

### Requirement: Dashboard Confirmations Manage Focus
When a confirmation opens on the web host dashboard, keyboard focus MUST move into it: for "Song entfernen?" to its first button ("Auch sperren", or "Nur entfernen" for the playing song), for "Party wirklich beenden?" to "Abbrechen". Pressing Escape MUST close the confirmation without changes. When it closes without removing the button that opened it, focus MUST return to that button.

#### Scenario: Removal question takes the focus
- GIVEN song X is waiting in the queue
- WHEN the host activates "Song entfernen" on song X
- THEN focus is on "Auch sperren"

#### Scenario: End-party question takes the focus
- GIVEN the host is on the dashboard
- WHEN the host activates "Party beenden"
- THEN focus is on "Abbrechen"

#### Scenario: Escape closes and returns focus
- GIVEN the removal question for song X is open
- WHEN the host presses Escape
- THEN the question closes, song X stays in the queue
- AND focus is back on song X's "Song entfernen" button

## MODIFIED Requirements

### Requirement: Host Sees PIN and QR Code After Creation
After a party is created, the host view MUST display the 5-digit PIN and a QR code image that guests can scan. The QR code MUST be loaded from `GET /api/party/{id}/qr`.

In all web host and TV views, the two codes MUST be named consistently and shown with different icons:
- The party PIN that guests use MUST be labelled "Voting-PIN".
- The host PIN MUST be labelled "Gastgeber-PIN" and carry the hint "Geheim – damit kommst du zurück ins Dashboard."

The term "Host-PIN" MUST NOT appear in the web UI. The two codes MUST NOT share the same icon.

On the web host views (dashboard and go-live step) each label MUST carry a short tag saying who the code is for: "für Gäste" next to "Voting-PIN" and "nur für dich" next to "Gastgeber-PIN".

On the host dashboard the Gastgeber-PIN MUST be hidden by default and shown as "•••••", placed below the party actions. A button "Anzeigen" reveals it; while it is visible the button reads "Verbergen". The hint "Geheim – damit kommst du zurück ins Dashboard." stays visible in both states. Every time the dashboard loads, the PIN starts hidden again.

#### Scenario: Host dashboard shows PIN and QR code
- GIVEN the host has just created a party
- WHEN the host dashboard loads
- THEN the PIN is visible as a large readable number labelled "Voting-PIN"
- AND a QR code image is displayed (loaded from `/api/party/{id}/qr`)
- AND scanning the QR code navigates to `/join/{pin}` in a guest browser

#### Scenario: Host sees the host PIN explained
- GIVEN the host is on the host dashboard
- WHEN the host looks for the host PIN
- THEN it is labelled "Gastgeber-PIN" with the hint "Geheim – damit kommst du zurück ins Dashboard."
- AND it uses a different icon than the "Voting-PIN"

#### Scenario: Host sees who each PIN is for
- GIVEN the host is on the host dashboard or the go-live step
- WHEN the host looks at the PIN labels
- THEN "Voting-PIN" carries the tag "für Gäste"
- AND "Gastgeber-PIN", where shown, carries the tag "nur für dich"

#### Scenario: Gastgeber-PIN is hidden until revealed
- GIVEN the host is on the host dashboard
- WHEN the dashboard loads
- THEN the Gastgeber-PIN shows "•••••" below the party actions, with the button "Anzeigen"
- WHEN the host chooses "Anzeigen"
- THEN the 5-digit Gastgeber-PIN is visible and the button reads "Verbergen"
- WHEN the host reloads the dashboard
- THEN the Gastgeber-PIN is hidden again

### Requirement: Host Routes Require Stored PIN
Angular routes `startpage` and `dashboard` MUST be protected by a route guard that verifies a host PIN exists in `localStorage`. If no PIN is found, the guard MUST redirect the user to the home page (`/`). The former routes `voting-host` and `search-host` redirect to `dashboard`, so the same guard applies.

#### Scenario: Unauthenticated user navigates to dashboard
- GIVEN no host PIN is stored in `localStorage`
- WHEN the user navigates to `/dashboard`
- THEN the user is redirected to `/`

#### Scenario: Host navigates to dashboard with stored PIN
- GIVEN a host PIN is stored in `localStorage`
- WHEN the host navigates to `/dashboard`
- THEN the route is activated normally

#### Scenario: Unauthenticated user opens an old host link
- GIVEN no host PIN is stored in `localStorage`
- WHEN the user navigates to `/voting-host`
- THEN the user ends up on `/`

### Requirement: Host Navigation Adapts to Screen Width
From 1024 px viewport width the web host pages (dashboard, blacklist during the party) MUST show the host navigation as a permanently visible side rail with icon and text per entry; below that width it MUST stay a burger menu. Both contain the same entries, "Dashboard" and "Blacklist", and mark the current page. The rail and the slide-in menu MUST show the MusicVoting logo instead of the text "MusicVoting" and a badge "Party läuft · <Voting-PIN>".

#### Scenario: Host on a laptop sees the navigation rail
- GIVEN the host opens the dashboard in a window at least 1024 px wide
- THEN the entries "Dashboard" and "Blacklist" are visible at the left edge without opening a menu
- AND "Dashboard" is marked as the current page
- AND the rail shows the logo and "Party läuft · 47291" for a party with Voting-PIN 47291

#### Scenario: Host on a phone uses the burger menu
- GIVEN the host opens the dashboard in a window narrower than 1024 px
- THEN only the burger button is visible
- WHEN the host taps it
- THEN the same entries, the logo and the badge slide in

#### Scenario: Removed entries
- GIVEN the host opens the navigation
- THEN no "Voting" and no "Suchen" entry is shown

### Requirement: Go-Live Step Explains a Separate TV Device
The go-live step MUST explain how to open the player on a separate device under the heading "Anderes Gerät am TV?" as a numbered list of four steps: "MusicVoting öffnen", "Gastgeber wählen", "Gastgeber-PIN eingeben", "Player öffnen". The player route requires the host PIN, so a copied link alone would not work on another device.

#### Scenario: Host opens the player on a separate device
- GIVEN the host is on the go-live step
- THEN "Anderes Gerät am TV?" is followed by an ordered list with the four steps "MusicVoting öffnen", "Gastgeber wählen", "Gastgeber-PIN eingeben" and "Player öffnen"
- WHEN the host follows them on another device and that player registers
- THEN the go-live step shows "Party ist live 🎉"
