# Design: iOS Internationalization (i18n)

## Localization Infrastructure

Two `.lproj` directories are added inside `musicvoting/app/app/`:

```
app/
  de.lproj/
    Localizable.strings
  en.lproj/
    Localizable.strings
```

`Info.plist` gains two keys:

```xml
<key>CFBundleDevelopmentRegion</key>
<string>de</string>
<key>CFBundleLocalizations</key>
<array>
    <string>de</string>
    <string>en</string>
</array>
```

`CFBundleDevelopmentRegion = de` sets German as the fallback language. If a key is missing from `en.lproj`, the `de.lproj` string is used instead of showing a raw key.

## String Key Convention

Keys are dot-separated identifiers that mirror the view and string role:

```
start.tagline
start.guestButton
start.hostButton
code.prompt
host.menu.title
...
```

Short, stable, lowercase. The key is NOT the German text itself — that approach causes duplicate entries when the same phrase appears in multiple places and breaks if the German wording changes.

## SwiftUI Text() — No Code Change Needed

`Text("start.tagline")` passes `"start.tagline"` as a `LocalizedStringKey`. SwiftUI resolves it against `Localizable.strings` automatically. The only change is replacing the inline German text with the key string.

Before:
```swift
Text("Schlechte Musik auf der Party? Nicht mehr! …")
```
After:
```swift
Text("start.tagline")
```

`de.lproj/Localizable.strings`:
```
"start.tagline" = "Schlechte Musik auf der Party? Nicht mehr! …";
```

`en.lproj/Localizable.strings`:
```
"start.tagline" = "Bad music at the party? Not anymore! …";
```

## TextField Placeholders and Label Titles

Both already accept `LocalizedStringKey` via their string-literal initializers:

```swift
TextField("search.placeholder", text: $viewModel.query)
Label("tab.addSong", systemImage: "plus")
```

Same key-in-`.strings` pattern; no additional wrapper needed.

## ViewModel Error Strings — String(localized:)

`@State var errorMessage: String` is assigned plain `String` values, not `LocalizedStringKey`. These must use the `String(localized:)` initializer (Swift 5.7+, available on iOS 16+):

```swift
errorMessage = String(localized: "error.wrongCode")
```

`de.lproj/Localizable.strings`:
```
"error.wrongCode" = "Falscher Code";
```

## Complete Key Table

### Global / Shared
| Key | German | English |
|-----|--------|---------|
| `app.title` | `Music Voting` | `Music Voting` |
| `error.wrongCode` | `Falscher Code` | `Wrong code` |
| `error.wrongPin` | `Falscher PIN` | `Wrong PIN` |
| `error.backendUnreachable` | `Backend nicht erreichbar. Bitte Backend starten und erneut versuchen.` | `Backend unreachable. Please start the backend and try again.` |
| `unknown` | `Unbekannt` | `Unknown` |

### StartView
| Key | German | English |
|-----|--------|---------|
| `start.tagline` | `Schlechte Musik auf der Party? Nicht mehr! Denn MusicVoting ermöglicht es jedem Partygast ganz einfach mittels Smartphone mitzubestimmen, welche Musik gespielt werden soll.` | `Bad music at the party? Not anymore! MusicVoting lets every guest easily vote on which songs get played — straight from their smartphone.` |
| `start.guestButton` | `Gast auf einer Party` | `Guest at a party` |
| `start.hostButton` | `Gastgeber auf einer Party` | `Host a party` |

### CodeInputView
| Key | German | English |
|-----|--------|---------|
| `code.prompt` | `Geben Sie Ihren Zugangscode ein:` | `Enter your access code:` |
| `code.back` | `Zurück` | `Back` |

### HostMenuView
| Key | German | English |
|-----|--------|---------|
| `hostmenu.title` | `Gastgeber` | `Host` |
| `hostmenu.subtitle` | `Was möchtest du tun?` | `What would you like to do?` |
| `hostmenu.createParty` | `Party erstellen` | `Create party` |
| `hostmenu.createPartySubtitle` | `Neue Party starten und Spotify verbinden` | `Start a new party and connect Spotify` |
| `hostmenu.openDashboard` | `Dashboard öffnen` | `Open dashboard` |
| `hostmenu.openDashboardSubtitle` | `Bestehende Party per PIN steuern` | `Control existing party via PIN` |
| `hostmenu.error.createFailed` | `Party konnte nicht erstellt werden. Bitte versuche es erneut.` | `Could not create party. Please try again.` |

### HostPinEntryView
| Key | German | English |
|-----|--------|---------|
| `hostpin.title` | `Dashboard öffnen` | `Open Dashboard` |
| `hostpin.subtitle` | `Gib den Host-PIN deiner Party ein.` | `Enter your party's host PIN.` |

### SpotifyAuthView
| Key | German | English |
|-----|--------|---------|
| `spotify.title` | `Spotify Login` | `Spotify Login` |
| `spotify.checking` | `Spotify Login wird gepruft...` | `Checking Spotify login…` |
| `spotify.prompt` | `Bitte melde dich zuerst mit Spotify an, für das Hosten der Party.` | `Please sign in with Spotify first to host a party.` |
| `spotify.error.failed` | `Spotify-Anmeldung ist fehlgeschlagen. Bitte versuche es erneut.` | `Spotify sign-in failed. Please try again.` |
| `spotify.error.unreachable` | `Spotify-Anmeldung ist derzeit nicht erreichbar. Bitte versuche es erneut.` | `Spotify sign-in is currently unreachable. Please try again.` |

### SongAddView
| Key | German | English |
|-----|--------|---------|
| `search.placeholder` | `Suchen...` | `Search…` |
| `search.hint` | `Fange an zu suchen!` | `Start searching!` |
| `search.hintDetail` | `Suche nach Songs, Sängern und nach Musik Alben!` | `Search for songs, artists, and albums!` |
| `search.noResults` | `Keine Ergebnisse gefunden.` | `No results found.` |
| `search.error.invalid` | `Ungueltige Suchanfrage.` | `Invalid search query.` |
| `search.error.failed` | `Suche fehlgeschlagen. Bitte erneut versuchen.` | `Search failed. Please try again.` |
| `search.add.error` | `Fehler beim Hinzufuegen.` | `Error adding song.` |

### VotingView
| Key | German | English |
|-----|--------|---------|
| `voting.queue.empty` | `Warteschlange ist leer` | `Queue is empty` |

### ExitView
| Key | German | English |
|-----|--------|---------|
| `exit.guest.confirm` | `Möchtest du die Party wirklich verlassen?` | `Do you really want to leave the party?` |
| `exit.host.confirm` | `Möchtest du die Party wirklich beenden?` | `Do you really want to end the party?` |
| `exit.guest.button` | `Ja, Party verlassen` | `Yes, leave party` |
| `exit.host.button` | `Ja, Party beenden` | `Yes, end party` |

### QRCodeView
| Key | German | English |
|-----|--------|---------|
| `qr.title` | `QR-Code & PIN` | `QR Code & PIN` |
| `qr.guestPin` | `Gäste-PIN` | `Guest PIN` |
| `qr.loading` | `QR-Code wird geladen…` | `Loading QR code…` |
| `qr.error.load` | `QR-Code konnte nicht geladen werden.` | `Could not load QR code.` |
| `qr.error.unavailable` | `Kein QR-Code verfügbar.` | `No QR code available.` |
| `qr.retry` | `Erneut versuchen` | `Try again` |

### BackendSettingsView
| Key | German | English |
|-----|--------|---------|
| `settings.backend.title` | `Backend` | `Backend` |
| `settings.backend.hint` | `Trage hier die IP/Adresse deines Macs ein (im iPhone-Hotspot z.B. \`172.20.10.2:8080\`).` | `Enter your Mac's IP address here (e.g. \`172.20.10.2:8080\` via iPhone hotspot).` |
| `settings.backend.placeholder` | `z.B. 172.20.10.2:8080` | `e.g. 172.20.10.2:8080` |
| `settings.backend.saved` | `Gespeichert: %@` | `Saved: %@` |
| `settings.backend.reset` | `Zurückgesetzt auf %@` | `Reset to %@` |
| `settings.backend.invalid` | `Ungültige Adresse. Beispiel: 172.20.10.2:8080` | `Invalid address. Example: 172.20.10.2:8080` |

Note: `settings.backend.saved` and `settings.backend.reset` include a `%@` placeholder for the address value. These must use `String(format:)` combined with `NSLocalizedString`, or `String(localized:)` with a `DefaultStringInterpolation`-style approach.

### AdminDashboard
| Key | German | English |
|-----|--------|---------|
| `dashboard.hostPin` | `Host-PIN` | `Host PIN` |
| `dashboard.nowPlaying.empty` | `Noch nichts abgespielt` | `Nothing played yet` |
| `dashboard.nowPlaying.pressPlay` | `Druecke auf Play` | `Press Play` |
| `dashboard.queue.title` | `Warteschlange` | `Queue` |
| `dashboard.queue.empty` | `Keine Songs in der Warteschlange` | `No songs in the queue` |
| `unknown` | `Unbekannt` | `Unknown` |

### Tab Labels (Gast_ContentView / Admin_ContentView)
| Key | German | English |
|-----|--------|---------|
| `tab.addSong` | `Add Song` | `Add Song` |
| `tab.voting` | `Voting` | `Voting` |
| `tab.admin` | `Admin` | `Admin` |
| `tab.qrCode` | `QR-Code` | `QR Code` |

### Gast_ContentView / Admin_ContentView (alerts)
| Key | German | English |
|-----|--------|---------|
| `alert.partyEnded` | `Die Party ist beendet.` | `The party has ended.` |
| `alert.ok` | `OK` | `OK` |

### InfoView
| Key | German | English |
|-----|--------|---------|
| `info.appName` | `MusicVoting` | `MusicVoting` |
| `info.tagline` | `Schlechte Musik auf der Party? Nicht mehr!` | `Bad music at the party? Not anymore!` |
| `info.problem.title` | `Das Problem` | `The Problem` |
| `info.problem.text` | `Oft hat der Gastgeber keine Zeit für die Musik oder der Geschmack der Gäste geht auseinander. Die Folge? Langweilige Stimmung.` | `Often the host has no time to manage the music, or guests have different tastes. The result? A boring atmosphere.` |
| `info.solution.title` | `Unsere Lösung` | `Our Solution` |
| `info.solution.text` | `Jeder Gast kann via Smartphone Songs zur Playlist hinzufügen und über die Reihenfolge abstimmen. Demokratie auf dem Dancefloor!` | `Every guest can add songs to the playlist and vote on the order via smartphone. Democracy on the dance floor!` |
| `info.goal.title` | `Das Ziel` | `Our Goal` |
| `info.goal.text` | `Eine benutzerfreundliche App, die über Spotify Premium läuft und für maximale Partystimmung sorgt.` | `A user-friendly app powered by Spotify Premium that maximises the party atmosphere.` |
| `info.learnMore` | `Mehr über das Projekt erfahren` | `Learn more about the project` |

## File Changes

- `musicvoting/app/app/de.lproj/Localizable.strings` (new)
- `musicvoting/app/app/en.lproj/Localizable.strings` (new)
- `musicvoting/app/app/Info.plist` (add `CFBundleDevelopmentRegion` and `CFBundleLocalizations`)
- `musicvoting/app/app/views_content/StartView.swift` (replace hardcoded strings with keys)
- `musicvoting/app/app/views_content/Gast_ContentView.swift` (replace hardcoded strings with keys)
- `musicvoting/app/app/views_content/Admin_ContentView.swift` (replace hardcoded strings with keys)
- `musicvoting/app/app/views_content/views/CodeInputView.swift` (replace hardcoded strings with keys)
- `musicvoting/app/app/views_content/views/HostMenuView.swift` (replace hardcoded strings with keys)
- `musicvoting/app/app/views_content/views/HostPinEntryView.swift` (replace hardcoded strings with keys)
- `musicvoting/app/app/views_content/views/SongAddView.swift` (replace hardcoded strings with keys)
- `musicvoting/app/app/views_content/views/SpotifyAuthView.swift` (replace hardcoded strings with keys)
- `musicvoting/app/app/views_content/views/VotingView.swift` (replace hardcoded strings with keys)
- `musicvoting/app/app/views_content/views/ExitView.swift` (replace hardcoded strings with keys)
- `musicvoting/app/app/views_content/views/QRCodeView.swift` (replace hardcoded strings with keys)
- `musicvoting/app/app/views_content/views/BackendSettingsView.swift` (replace hardcoded strings with keys)
- `musicvoting/app/app/views_content/views/InfoView.swift` (replace hardcoded strings with keys)
- `musicvoting/app/app/views_content/views/AdminDash/AdminDashboard.swift` (replace hardcoded strings with keys)
- `musicvoting/app/app/views_content/views/AdminDash/CurrentSongPlaying.swift` (replace hardcoded strings with keys)
- `musicvoting/app/app/views_content/views/AdminDash/QueueCard.swift` (replace hardcoded strings with keys)
