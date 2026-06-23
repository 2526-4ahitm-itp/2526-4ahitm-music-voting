# Tasks

## 1. Localization infrastructure
- [x] 1.1 Create `musicvoting/app/app/de.lproj/Localizable.strings` with all German string entries from the key table in design.md
- [x] 1.2 Create `musicvoting/app/app/en.lproj/Localizable.strings` with all English string entries from the key table in design.md
- [x] 1.3 Add `CFBundleDevelopmentRegion = de` and `CFBundleLocalizations = [de, en]` to `Info.plist`

## 2. StartView & InfoView
- [x] 2.1 Replace hardcoded German strings in `StartView.swift` with `start.*` keys
- [x] 2.2 Replace hardcoded German strings in `InfoView.swift` with `info.*` keys

## 3. Tab bars & party-ended alert
- [x] 3.1 Replace hardcoded strings in `Gast_ContentView.swift` with `tab.*` and `alert.*` keys
- [x] 3.2 Replace hardcoded strings in `Admin_ContentView.swift` with `tab.*` and `alert.*` keys

## 4. Code & PIN entry views
- [x] 4.1 Replace hardcoded strings in `CodeInputView.swift` with `code.*` and `error.wrongCode` keys; use `String(localized:)` for `triggerError(...)` call sites
- [x] 4.2 Replace hardcoded strings in `HostPinEntryView.swift` with `hostpin.*` and `error.wrongPin` keys; use `String(localized:)` for `triggerError(...)` call sites

## 5. Host menu & Spotify auth
- [x] 5.1 Replace hardcoded strings in `HostMenuView.swift` with `hostmenu.*` keys; use `String(localized:)` for `errorMessage` assignments
- [x] 5.2 Replace hardcoded strings in `SpotifyAuthView.swift` with `spotify.*` keys; use `String(localized:)` for `errorMessage` assignments

## 6. Song add / search view
- [x] 6.1 Replace hardcoded strings in `SongAddView.swift` with `search.*` and `error.backendUnreachable` keys; use `String(localized:)` for `errorMessage` assignments; use `String(localized: "unknown")` for the fallback artist string

## 7. Voting, exit, and QR code views
- [x] 7.1 Replace hardcoded strings in `VotingView.swift` with `voting.*` keys
- [x] 7.2 Replace hardcoded strings in `ExitView.swift` with `exit.*` keys
- [x] 7.3 Replace hardcoded strings in `QRCodeView.swift` with `qr.*` keys

## 8. Backend settings view
- [x] 8.1 Replace hardcoded strings in `BackendSettingsView.swift` with `settings.backend.*` keys; use `String(localized:)` for `message` assignments; use `String(format: NSLocalizedString("settings.backend.saved", comment: ""), address)` for the interpolated strings

## 9. Admin dashboard views
- [x] 9.1 Replace hardcoded strings in `AdminDashboard.swift` with `dashboard.*` and `unknown` keys
- [x] 9.2 Replace hardcoded strings in `CurrentSongPlaying.swift` with `dashboard.nowPlaying.*` keys
- [x] 9.3 Replace hardcoded strings in `QueueCard.swift` with `dashboard.queue.*` keys

## 10. Verification
- [ ] 10.1 Build succeeds with no compiler warnings about missing localizations
- [ ] 10.2 Run the app with device language set to **German** — all strings appear as before (no regression)
- [ ] 10.3 Run the app with device language set to **English** — all strings appear in English
- [ ] 10.4 Error paths work in both languages: wrong guest code shows localized error; wrong host PIN shows localized error; search failure shows localized error
- [ ] 10.5 `BackendSettingsView` save/reset messages include the address correctly in both languages
