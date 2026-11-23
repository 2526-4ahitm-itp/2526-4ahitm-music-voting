# Proposal

## Why

Das Backend markiert gesperrte Suchtreffer (`blocked`) und blendet für Gäste Songs gesperrter Künstler aus (`audience=guest`, `hiddenHint`). Die Web-Suche nutzt das (`search/spec.md` „Blacklisted Search Results Cannot Be Added“, `guest/spec.md` „Blocked Search Results Stay Discreet“). Die iOS-App ignoriert es: Gesperrte Songs sehen normal aus und haben ein aktives „+“, Songs gesperrter Künstler werden auch Gästen angezeigt, und erst beim Antippen kommt „Nicht erlaubt.“. Gäste und Host bekommen in iOS also ein anderes, schlechteres Verhalten als im Web.

## What Changes

- iOS-Gäste suchen mit `audience=guest`: Songs gesperrter Künstler kommen gar nicht erst an, wie im Web.
- Gesperrte Treffer werden ausgegraut, ihr „+“ ist deaktiviert. Gäste sehen keinen Grund (Bedienungshilfe-Label „Nicht verfügbar“); der Host sieht „Nicht erlaubt.“ am Treffer, wie in der Web-Host-Suche.
- Unter dem Suchfeld erscheint für Gäste derselbe Hinweis wie im Web: „Dieser Artist ist nicht zulässig.“ bzw. „Einige Ergebnisse sind auf dieser Party nicht zulässig.“; wurden alle Treffer entfernt, ersetzt er „Keine Ergebnisse gefunden.“.
- Ändert der Host die Blacklist, aktualisiert sich eine offene iOS-Suche (SSE `blacklist-updated` geht künftig auch an iOS-Clients der Party).
- Die Texte sind iOS-eigene Texte und werden wie alle iOS-Texte lokalisiert (Deutsch Basis, Englisch zweitsprachig).

## Capabilities

### New Capabilities

_Keine._

### Modified Capabilities

- `search`: neue Anforderung „iOS Search Applies the Party Blacklist Like the Web“.

## Impact

- iOS: `SongAddView`/`SongAddViewModel` (Decoding von `blocked`/`hiddenHint`, `audience=guest`, Darstellung, SSE), `Localizable.strings` (de/en).
- Backend: `SpotifyCallbackResource.events` liefert `blacklist-updated` auch im iOS-Zweig (party-gefiltert).
- Tests: iOS-ViewModel-Tests, Backend-SSE-Filtertest.
