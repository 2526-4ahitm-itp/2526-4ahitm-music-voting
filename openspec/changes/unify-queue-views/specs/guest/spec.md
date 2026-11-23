# Spec Delta: guest

## ADDED Requirements

### Requirement: Guest Like Is Confirmed with the Rank
After a guest likes a song, a confirmation MUST say "Geliked – jetzt auf Platz <N>", where N is the song's rank among the waiting songs once the server has re-sorted the queue; without a known rank it says "Geliked". Taking a like back shows no confirmation.

#### Scenario: Like names the new rank
- GIVEN song C is waiting at rank 3
- WHEN the guest likes C and the re-sorted queue puts C at rank 2
- THEN "Geliked – jetzt auf Platz 2" is shown

#### Scenario: Un-like is silent
- GIVEN the guest has liked song C
- WHEN the guest takes the like back
- THEN no confirmation is shown

### Requirement: Guest Confirmations Stand Out
Confirmations on the guest page ("Song hinzugefügt – Platz <N>", "Geliked – jetzt auf Platz <N>") MUST be clearly noticeable: a filled brand-colour card with an icon (check for an add, heart for a like), at least 1.0625rem bold text, at least 4.5:1 contrast, shown for about 1.5 seconds at the bottom of the page. Error messages keep their own error colour and stay about 4 seconds.

#### Scenario: Like confirmation is noticeable
- GIVEN a guest likes a song
- WHEN the confirmation appears
- THEN it is a filled brand-colour card with a heart icon and bold text
- AND it disappears after about 1.5 seconds


### Requirement: Guest Uses One Page for Queue and Search
The web guest experience MUST be a single page at `/voting`. It always shows the queue, and guests like songs there. The search field on that page searches the party's provider (see `search/spec.md`), so guests add songs from the same page. There MUST NOT be a tab bar or any other navigation between guest views. The former add/search route `/guest` MUST redirect to `/voting`.

#### Scenario: Guest searches and adds without changing page
- GIVEN a guest is on `/voting`
- WHEN the guest types "Daft Punk" into the search field
- THEN search results from the party's provider replace the queue list on the same page
- WHEN the guest taps "+" on a result and the add succeeds
- THEN the guest is still on `/voting`

#### Scenario: Emptying the search field shows the queue again
- GIVEN a guest sees search results on `/voting`
- WHEN the guest clears the search field
- THEN the queue list with ranks and likes is shown again

#### Scenario: Old add/search link
- GIVEN a guest opens `/guest`
- WHEN the route loads
- THEN the app redirects to `/voting`

#### Scenario: No tab bar
- GIVEN a guest is on `/voting`
- WHEN the page is rendered
- THEN no "Voten" or "Hinzufügen" tab is shown

### Requirement: Guest Votes on Queued Songs from Search Results
A web guest search result whose song is already in the queue MUST show that song's like count and the same like button as in the queue list, instead of "+". Liking it from the result MUST behave exactly like liking it in the queue (see `voting/spec.md`). A result whose song is not in the queue shows "+". Both states MUST update live when the queue changes.

#### Scenario: Queued song can be liked from the search
- GIVEN song X is in the queue with 2 likes and the guest has not liked it
- WHEN the guest searches and song X appears in the results
- THEN song X shows "2" and an unfilled heart instead of "+"
- WHEN the guest taps the heart
- THEN song X shows "3" with a filled heart, in the results and in the queue

#### Scenario: Song is added by someone else while results are open
- GIVEN a guest sees song Y with "+" in the search results
- WHEN another guest adds song Y to the queue
- THEN song Y's "+" turns into the like count and heart without a manual refresh

## MODIFIED Requirements

### Requirement: Guest Is Welcomed After Joining
After a guest joins a party for the first time on a device, the guest page MUST show a one-time welcome sheet with "Du bist dabei!" and a short guide: "Tipp auf ♥ bei Songs, die du hören willst – je mehr Likes, desto früher laufen sie." and "Such oben nach einem Song und tipp auf +, um ihn hinzuzufügen.", plus a button "Los geht's" that closes it. The sheet MUST close by itself after 10 seconds. It MUST NOT appear again for the same `deviceId` and party, including after a reload. Joining a different party shows it again.

#### Scenario: First join shows the welcome
- GIVEN a guest has never joined party P on this device
- WHEN the guest joins party P and lands on the guest page
- THEN the welcome sheet with "Du bist dabei!" and the two-line guide is shown
- WHEN the guest taps "Los geht's"
- THEN the sheet closes

#### Scenario: Welcome closes by itself
- GIVEN the welcome sheet is shown
- WHEN 10 seconds pass without a tap
- THEN the sheet closes and is not shown again for party P

#### Scenario: Reload does not show the welcome again
- GIVEN a guest has dismissed the welcome sheet for party P
- WHEN the guest reloads the voting view
- THEN the welcome sheet is not shown


### Requirement: Guest Lands on the Voting View After Joining
After a guest successfully enters a valid party PIN, the app MUST navigate the guest to the guest page (`/voting`), so the queue is the first thing shown. The guest adds songs through the search field on that page.

#### Scenario: Guest joins with a valid PIN
- GIVEN a guest enters a valid party PIN that resolves successfully
- WHEN the PIN resolution completes
- THEN the app navigates the guest to `/voting`
- AND the queue and the search field are shown

### Requirement: Guest Search and Add Give Feedback
The web guest page MUST tell the guest what is happening at every step while searching and adding:
- While a search request is running, a loading indicator MUST be shown.
- A search that returns no results MUST show "Keine Treffer für „<Suchbegriff>“".
- A failed search or a failed queue load (network or server error) MUST show "Verbindung verloren – versuch es gleich nochmal." instead of leaving stale content without a message.
- Status messages MUST be announced to screen readers (see `web-ui/spec.md`).

#### Scenario: Search without results
- GIVEN a guest is on the guest page
- WHEN the guest searches for "xyzxyzxyz" and no tracks are found
- THEN "Keine Treffer für „xyzxyzxyz“" is shown

#### Scenario: Network error while searching
- GIVEN the backend is unreachable
- WHEN the guest searches
- THEN "Verbindung verloren – versuch es gleich nochmal." is shown

### Requirement: Guest Add Is Confirmed with the Rank
After a successful add, a confirmation MUST appear at the bottom of the guest page for about 1.5 seconds, besides the like count replacing the "+" on the result. It MUST say "Song hinzugefügt – Platz <N>" (the rank among the waiting songs) and offer no action, because the guest is already on the queue page; without a known rank it says "Song hinzugefügt". Backend errors (for example "Song ist schon in der Warteschlange.", "Zu viele Anfragen — bitte kurz warten.") MUST be shown in the same area, with at least 4.5:1 contrast.

#### Scenario: Successful add is confirmed
- GIVEN a guest sees song X in the search results
- WHEN the guest taps "+" on song X and the add succeeds
- THEN "Song hinzugefügt" appears at the bottom of the page without an action button
- AND song X's "+" turns into its like count and heart

### Requirement: Guest Voting View Shows What Plays and the Ranking
The web guest page MUST make visible that the room decides the order:
- The currently playing song MUST be shown in a compact bar at the top (cover, title, artist, a "Läuft gerade" indicator), not as an entry inside the list.
- Every waiting song MUST show its rank as a number, counted from 1 in queue order (see `queue/spec.md`).
- The "Läuft gerade" bar MUST stay visible while the guest searches.

#### Scenario: Guest sees the playing song and the ranks
- GIVEN song A is playing and songs B (3 likes) and C (1 like) are waiting
- WHEN a guest opens the guest page
- THEN A is shown in the bar at the top with "Läuft gerade"
- AND B is shown with rank 1 and C with rank 2

#### Scenario: Filter keeps the ranks
- GIVEN B has rank 1 and C has rank 2
- WHEN the guest searches for C and then clears the search field
- THEN the queue is shown again with B at rank 1 and C at rank 2

#### Scenario: Playing bar stays while searching
- GIVEN song A is playing
- WHEN the guest searches for another song
- THEN A is still shown in the bar at the top

#### Scenario: Add confirmation names the rank
- GIVEN three songs are waiting
- WHEN a guest adds a new song that ends up fourth
- THEN "Song hinzugefügt – Platz 4" is shown

### Requirement: Guest Sees Which Party They Are In
The guest page MUST show the plain page title "Warteschlange" in the top bar. Directly below the title the top bar MUST show the party as "Party <Voting-PIN>" (e.g. "Party 47291") and a button "Party verlassen".

#### Scenario: Guest sees the party in the top bar
- GIVEN a guest has joined the party with Voting-PIN 47291
- WHEN the guest opens `/voting`
- THEN the top bar shows the title "Warteschlange" and below it "Party 47291" and "Party verlassen"

## REMOVED Requirements

### Requirement: Guest Bottom Tab Navigation
**Reason**: Guests no longer switch between two views. Queue and search live on one page (see "Guest Uses One Page for Queue and Search"), as decided on 2026-11-23.
**Migration**: `/guest` redirects to `/voting`. Searching and adding happen through the search field on `/voting`.
