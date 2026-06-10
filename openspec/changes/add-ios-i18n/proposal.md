# Proposal: iOS Internationalization (i18n)

## Intent

All user-facing strings in the iOS app are currently hardcoded in German. The app ignores the device language setting, so any user with their iPhone set to English (or any other language) still sees German text.

This change introduces proper iOS localization so the app respects the system language. German remains the primary language; English is added as a second language. The device language setting determines which strings are shown at runtime — no in-app language picker is needed.

## Scope

In scope:
- Create `de.lproj/Localizable.strings` (German — existing text extracted verbatim)
- Create `en.lproj/Localizable.strings` (English translations)
- Add `CFBundleDevelopmentRegion = de` and `CFBundleLocalizations = [de, en]` to `Info.plist`
- Replace all hardcoded string literals in every active Swift view and view-model with `LocalizedStringKey` or `String(localized:)` references
- Files in scope: `StartView.swift`, `CodeInputView.swift`, `HostMenuView.swift`, `HostPinEntryView.swift`, `SongAddView.swift`, `SpotifyAuthView.swift`, `VotingView.swift`, `ExitView.swift`, `QRCodeView.swift`, `BackendSettingsView.swift`, `AdminDashboard.swift`, `CurrentSongPlaying.swift`, `QueueCard.swift`, `SongRow.swift`, `InfoView.swift`, `Admin_ContentView.swift`, `Gast_ContentView.swift`

Out of scope:
- Files under `views_content/dump/` (unused/prototype files)
- Backend string changes (error messages returned from the API remain German — they are defined in the backend spec and shown verbatim)
- Adding more languages beyond `de` and `en`
- Runtime language switching (the OS setting controls the language)

## Approach

iOS's built-in `NSLocalizedString` / `LocalizedStringKey` infrastructure is used:

- **`Text("key")`** in SwiftUI already resolves `"key"` as a `LocalizedStringKey`; no API change is needed for those call sites — only the key name and corresponding `.strings` entries must align.
- **Error/status strings assigned to `@State` variables** (e.g. `errorMessage = "Falscher Code"`) are not `LocalizedStringKey`; they must be replaced with `String(localized: "key")`.
- **`TextField` placeholders and `Label` titles** use `LocalizedStringKey` initializers that accept a string literal directly — the literal becomes the lookup key.
- The German `.strings` file contains the exact text already in the app; the English file provides translations.
- `CFBundleDevelopmentRegion = de` tells iOS that German is the base language, so German strings are used as a fallback if a translation is missing.
