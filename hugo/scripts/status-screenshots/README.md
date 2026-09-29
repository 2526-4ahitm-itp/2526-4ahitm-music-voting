# Screenshots für die Präsentation „Projektstatus“

Das Skript fotografiert alle Seiten, die in `hugo/data/status.yaml` unter `screens` stehen,
und legt die Bilder in `hugo/content/status/screens/` ab. Die Präsentation liegt unter
`/status/` auf der Hugo-Seite.

## Präsentation erneuern

1. **App lokal starten**: Datenbank, Backend und Frontend (siehe „How To Run“, Variante B –
   `script/start.sh`). Das Frontend muss unter `http://localhost:4200` laufen.
2. **Party anlegen**: im Browser `http://127.0.0.1:4200` → „Gastgeber einer Party“ → „Party erstellen“,
   bei Spotify anmelden, Standard-Playlist wählen. Den **Host-PIN** aus dem Dashboard notieren.
3. **Screenshots machen**:
   ```bash
   cd hugo/scripts/status-screenshots
   npm install          # nur beim ersten Mal
   node screenshots.mjs --host-pin 12345 --seed
   ```
   `--seed` füllt die Warteschlange mit ein paar Songs und Likes, damit die Bilder nicht leer
   sind. Zum Abspielen im Player einmal im Dashboard auf Play drücken und das Skript dann (ohne
   `--seed`) erneut laufen lassen.
4. **Texte und Datum anpassen** in `hugo/data/status.yaml`: `stand`, `ist`, `limits`, `soll` und
   die `text`-Felder der Screenshots.
5. Mit `hugo server` unter `http://localhost:1313/status/` prüfen.

## Optionen

| Option | Bedeutung |
|---|---|
| `--host-pin <PIN>` | Host-PIN der Party (Pflicht) |
| `--seed` | Songs + Likes in die Warteschlange legen |
| `--only a.png,b.png` | nur diese Screenshots neu machen |
| `--base <URL>` | Frontend-URL (Standard `http://localhost:4200`) |
| `--wait <ms>` | Wartezeit pro Seite (Standard 3500) |
| `--chrome <Pfad>` | Chrome/Chromium (Standard `/usr/bin/google-chrome`, oder `CHROME_PATH`) |

## Neue Seite aufnehmen

Einen Eintrag unter `screens` in `hugo/data/status.yaml` ergänzen (`file`, `route`, `device`,
`role`, `title`, `text`). Host-Seiten (mit Host-PIN) und Gast-Seiten sind in `screenshots.mjs`
in `HOST_ROUTES` bzw. `GUEST_ROUTES` eingetragen – eine neue geschützte Route dort ergänzen.

> Hinweis: Das Skript blockiert das Spotify Web Playback SDK. So registriert der unsichtbare
> Chrome kein eigenes Wiedergabegerät und nimmt der Party die Musik nicht weg. Der Player
> (`/startpage`) zeigt trotzdem den aktuellen Stand aus dem Backend.
>
> Für Screenshots mit laufender Musik: Player in deinem normalen Browser öffnen, im Dashboard
> Play drücken und dann `node screenshots.mjs --host-pin <PIN> --only dashboard.png,startpage.png`.
