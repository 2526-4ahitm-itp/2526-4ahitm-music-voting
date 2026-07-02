# Proposal: iOS Default Playlist Picker

## Intent

The `add-default-playlist-and-queue-autorefill` change adds a default playlist selection step to the **web** host creation flow, but explicitly defers the iOS equivalent. This change fills that gap: after a host authenticates via Spotify on iOS, the app presents a playlist picker before navigating to the admin dashboard, allowing the host to set a default playlist (or skip) from the mobile app.

Without this, a host who creates a party on iOS gets automatic queue refill only if the web client was used to set a playlist, or gets recommendations/Top-Charts fallback. With this change, iOS hosts have full control over the default playlist at creation time, matching the web experience.

## Scope

**In scope:**
- A new `PlaylistPickerView` shown after Spotify auth succeeds on iOS (between `spotifyAuth` and `admin` in the navigation flow).
- Calls `GET /api/party/{id}/spotify/playlists` to list the host's playlists (endpoint added by the parent change).
- Selecting a playlist calls `PUT /api/party/{id}/default-playlist` with the chosen playlist ID.
- A prominent "Ohne Standard-Playlist fortfahren" skip action that calls no endpoint and navigates straight to admin.
- A new `SiteState` case `.playlistPicker` added to `ContentView.swift`.
- Localization strings (German primary, English secondary) for the picker.

**Out of scope:**
- Changing the default playlist after party creation (creation-time only, same as web).
- Any backend changes — the two endpoints are provided by `add-default-playlist-and-queue-autorefill`.
- Auto-refill logic — purely backend, already handled.

## Dependencies

This change requires the backend endpoints from `add-default-playlist-and-queue-autorefill` to be deployed:
- `GET /api/party/{id}/spotify/playlists`
- `PUT /api/party/{id}/default-playlist`

## Approach

`SpotifyAuthView` currently navigates directly to `.admin` when `isLoggedIn` becomes true. The change intercepts that transition: instead of `.admin`, it navigates to `.playlistPicker`. The picker fetches playlists, shows a scrollable list (image + name + track count), and either calls the default-playlist endpoint then goes to `.admin`, or skips directly to `.admin`. On network error, an inline error message is shown with a retry; the skip action remains always available so a network failure cannot trap the host.
