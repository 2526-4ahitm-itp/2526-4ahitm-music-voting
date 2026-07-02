# Tasks

## 1. Navigation wiring

- [x] 1.1 Add `.playlistPicker` to `SiteState` enum in `ContentView.swift`
- [x] 1.2 Add `case .playlistPicker: PlaylistPickerView()` to the switch in `ContentView.swift`
- [x] 1.3 In `SpotifyAuthView.swift`, change both `.admin` assignments (in `.task` and `onChange`) to `.playlistPicker`

## 2. Model + ViewModel

- [x] 2.1 Define `SpotifyPlaylist` struct (`id`, `name`, `trackCount`, `imageUrl?`) — `Identifiable & Decodable`
- [x] 2.2 Create `PlaylistPickerViewModel: ObservableObject` with `loadPlaylists()`, `selectPlaylist(_:)`, `skip()` methods and loading/saving/error state
- [x] 2.3 `loadPlaylists()` calls `GET /api/party/{id}/spotify/playlists` with `Authorization: Bearer <hostPin>`
- [x] 2.4 `selectPlaylist(_:)` calls `PUT /api/party/{id}/default-playlist` with body `{ "playlistId": id }`, then navigates to `.admin`
- [x] 2.5 `skip()` navigates to `.admin` with no API call

## 3. View

- [x] 3.1 Create `PlaylistPickerView.swift` at `views_content/views/PlaylistPickerView.swift`
- [x] 3.2 Gradient background + logo matching app style (same as `HostMenuView`)
- [x] 3.3 Loading state: `ProgressView` while `isLoading`
- [x] 3.4 Playlist list: `ScrollView` + `ForEach` with cover image (52×52), name, track count, chevron; tap calls `selectPlaylist`
- [x] 3.5 Skip button always visible and enabled (below the list)
- [x] 3.6 Error banner with retry button when `errorMessage != nil` (does not replace skip button)
- [x] 3.7 Saving overlay / disabled state on list rows while `isSaving`
- [x] 3.8 Navigation bar: back button → `.hostMenu` (abort party creation entirely)

## 4. Localization

- [x] 4.1 Add keys to `de.lproj/Localizable.strings`: `playlistpicker.title`, `playlistpicker.subtitle`, `playlistpicker.skip`, `playlistpicker.trackCount`, `playlistpicker.error.load`, `playlistpicker.error.save`, `playlistpicker.retry`
- [x] 4.2 Add same keys to `en.lproj/Localizable.strings` with English values

## 5. Spec delta

- [x] 5.1 Add "iOS Host Playlist Picker After Spotify Auth" requirement to `openspec/specs/host/spec.md` with the three scenarios below

## 6. Verify

- [x] 6.1 Create party → Spotify auth → picker loads playlists → tap one → navigate to admin; confirm `defaultPlaylistId` is set on the backend
- [x] 6.2 Create party → Spotify auth → tap skip → navigate to admin; confirm no `defaultPlaylistId` is set
- [x] 6.3 Simulate load failure (stop backend) → error banner shown, skip still works
- [x] 6.4 Simulate save failure → inline error shown, other playlists still tappable
