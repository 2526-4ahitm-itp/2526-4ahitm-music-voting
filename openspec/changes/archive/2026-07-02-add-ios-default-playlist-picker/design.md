# Design: iOS Default Playlist Picker

## Navigation flow

Current (after Spotify auth):
```
SpotifyAuthView → isLoggedIn=true → appState.currentSite = .admin
```

New flow:
```
SpotifyAuthView → isLoggedIn=true → appState.currentSite = .playlistPicker
PlaylistPickerView → pick or skip → appState.currentSite = .admin
```

### Changes to `ContentView.swift`
- Add `.playlistPicker` to the `SiteState` enum.
- Add a `case .playlistPicker: PlaylistPickerView()` branch in the switch.

### Changes to `SpotifyAuthView.swift`
- Both places that set `appState.currentSite = .admin` (the `onChange(of: auth.isLoggedIn)` and the `.task`) are changed to `.playlistPicker`.

## `PlaylistPickerView`

A self-contained view + `@MainActor ObservableObject` view-model following the same pattern as `SongAddView` / `VotingView`.

### Model

```swift
struct SpotifyPlaylist: Identifiable, Decodable {
    let id: String
    let name: String
    let trackCount: Int
    let imageUrl: String?
}
```

### ViewModel (`PlaylistPickerViewModel`)

State:
- `playlists: [SpotifyPlaylist]` — loaded from backend
- `isLoading: Bool`
- `isSaving: Bool`
- `errorMessage: String?`

Methods:
- `loadPlaylists()` — `GET /api/party/{id}/spotify/playlists` with `Authorization: Bearer <hostPin>`
- `selectPlaylist(_ playlist: SpotifyPlaylist)` — `PUT /api/party/{id}/default-playlist` body `{ "playlistId": id }`, then navigate to `.admin`
- `skip()` — navigate directly to `.admin` (no API call)

The host PIN is read from `PartySessionStore` (same as `AdminDashboard`).

### View layout

Matches the app's visual style (gradient background, `.ultraThinMaterial` cards, white text):

```
[gradient background]
  [logo image]
  Title: "Standard-Playlist wählen"
  Subtitle: "Wähle eine Playlist als Fallback wenn die Warteschlange leer wird."
  
  [ScrollView]
    ForEach playlists:
      HStack {
        AsyncImage(playlist cover, 52×52, rounded)
        VStack { name (headline), "\(trackCount) Songs" (caption) }
        Spacer()
        Image(systemName: "chevron.right")
      }
      .onTapGesture { selectPlaylist(...) }
      .background(.ultraThinMaterial, RoundedRectangle(30))
  
  [Spacer]
  
  Button "Ohne Standard-Playlist fortfahren" (skip, always enabled)
  
  [error banner if errorMessage != nil]
```

Loading state: show `ProgressView` instead of the list. A loading indicator overlays the skip button area only during `isSaving` (so skip remains tappable while playlists load but the chosen playlist is being saved).

### Error handling
- `loadPlaylists` failure → show error message + "Erneut versuchen" button; skip remains available.
- `selectPlaylist` failure → show inline error; list remains interactive so the host can try another playlist or skip.

## Localization keys

| Key | German | English |
|-----|--------|---------|
| `playlistpicker.title` | `Standard-Playlist wählen` | `Choose default playlist` |
| `playlistpicker.subtitle` | `Wähle eine Playlist als Fallback wenn die Warteschlange leer wird.` | `Pick a playlist to fill the queue when it runs dry.` |
| `playlistpicker.skip` | `Ohne Standard-Playlist fortfahren` | `Continue without default playlist` |
| `playlistpicker.trackCount` | `%lld Songs` | `%lld songs` |
| `playlistpicker.error.load` | `Playlists konnten nicht geladen werden.` | `Could not load playlists.` |
| `playlistpicker.error.save` | `Playlist konnte nicht gespeichert werden.` | `Could not save playlist.` |
| `playlistpicker.retry` | `Erneut versuchen` | `Try again` |

## API contract (from parent change)

`GET /api/party/{id}/spotify/playlists`
- Auth: `Authorization: Bearer <hostPin>`
- Response: `[{ "id": "...", "name": "...", "trackCount": 42, "imageUrl": "https://..." }]`

`PUT /api/party/{id}/default-playlist`
- Auth: `Authorization: Bearer <hostPin>`
- Body: `{ "playlistId": "spotify:playlist:..." }` or `{ "playlistId": null }` to clear

## File locations

| File | Action |
|------|--------|
| `ContentView.swift` | Add `.playlistPicker` case to `SiteState` + switch |
| `SpotifyAuthView.swift` | Redirect to `.playlistPicker` instead of `.admin` |
| `views_content/views/PlaylistPickerView.swift` | New file |
| `de.lproj/Localizable.strings` | New keys |
| `en.lproj/Localizable.strings` | New keys |
