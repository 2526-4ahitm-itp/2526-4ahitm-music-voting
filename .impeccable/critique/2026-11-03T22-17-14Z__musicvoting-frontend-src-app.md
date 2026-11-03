---
target: musicvoting/frontend/src/app
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/simonesperrer/IdeaProjects/itp_projekt/2526-4ahitm-music-voting/musicvoting/frontend/src/app"
timestamp: 2026-11-03T22-17-14Z
slug: musicvoting-frontend-src-app
---
# Impeccable Critique — Web-Frontend (2026-11-03, nach dem Bühnen-Umbau)

Method: dual-agent (A: Design-Review · B: Detector + Browser), isoliert voneinander.
Ziel: `musicvoting/frontend/src/app`. Backend lief nicht: Seiten nur im Leerzustand gerendert, befüllte Zustände aus Templates, CSS und DOM-Specs beurteilt.

## Design Health Score

| # | Heuristik | Score | Wichtigster Punkt |
|---|---|---|---|
| 1 | Sichtbarkeit des Systemstatus | 3 | Live-Regionen, Soundwave, „Warte auf den Player …“ gut; Gast sieht nicht, was läuft und wo sein Song steht |
| 2 | Sprache der Nutzer | 3 | Warmes „du“; „Blacklist“, „Dashboard“, „Voting“ sind Englisch, Gast-Überschriften sind Slogans statt Ortsangaben |
| 3 | Kontrolle und Freiheit | 2 | Blacklist-Eintrag entfernen ohne Rückfrage, kein Rückgängig beim Hinzufügen, Gast kann Party nicht verlassen |
| 4 | Konsistenz | 3 | Ein Bühnen-System überall; kleine Abweichungen (Theme-Schalter mit/ohne Text, Zurück-Pfeil fehlt auf party-ready) |
| 5 | Fehlervermeidung | 3 | Rückfragen bei Entfernen/Sperren und Party beenden, gesperrte Songs deaktiviert |
| 6 | Erkennen statt Erinnern | 3 | Host-Seiten auch am Laptop nur über Burger-Menü erreichbar |
| 7 | Flexibilität und Effizienz | 2 | Keine Tastenkürzel, Song hinzufügen nur auf eigener Seite, kein „als Nächstes spielen“ |
| 8 | Ästhetik und Reduktion | 3 | Sauber; heller Clip-Art-Platzhalter bricht die dunkle Bühne auf TV und Dashboard |
| 9 | Fehler erkennen und beheben | 3 | Freundliche, konkrete Meldungen; gesperrte Songs geben am Handy keinerlei Hinweis (nur `title`) |
| 10 | Hilfe und Dokumentation | 2 | Willkommens-Hinweis und Anderes-Gerät-Anleitung gut; kein „Wie funktioniert's?“ |
| **Gesamt** | | **27/40** | **Acceptable** (Grenze zu Good bei 28) |

Vorher (2026-11-03 morgens, vor dem Umbau): 18/40.

## Design-Specificity-Urteil

**Bewertung:** Einheitlich, aber nur halb produktspezifisch. Der TV ist klar für einen Partyraum gebaut: große Schrift, QR und PIN fix, Top 5 mit Rang und Herzen, FLIP-Animation. Die Gast-Ansichten am Handy (Suchfeld, Zeilen mit Cover und Button, zwei Tabs) könnten aus jeder Musik-App stammen. Was MusicVoting von einem geteilten Spotify-Queue unterscheidet – „der Raum entscheidet, sichtbar“ – fehlt am Handy: kein Rang, kein Now-Playing, keine Party-Kennung. Das Markenlogo wird nur als Favicon genutzt.

**Detector:** 0 Funde im Code (mit Config), 0 gerendert auf `/`, `/code`, `/host-options`, `/create-party` (Handy und Desktop), 0 im Overlay auf `/dashboard`, `/startpage` (1920×1080) und `/voting`. Ohne Config 2 × `broken-image` (QR-`[src]`-Bindung in `startpage.html` und `host-dashboard.html`) – echte Fehlalarme, Fallback-Bild existiert, im Overlay kein Fund. URL-Scan von `/voting` und `/guest` läuft wegen SSE in ein Timeout.

**Zusätzlich aus dem Browser:** `htl-leonding-logo.jpg` ist 2763×727 px für eine kleine Fußzeile (Angular-Warnung NG0913). `/voting` ohne Backend: „EmptyErrorImpl“ beim Laden der Playlist wird nicht abgefangen.

## Gesamteindruck

Der Umbau hat gewirkt: ein System, gute Barrierefreiheit, starke Momente am TV und bei „Party ist live 🎉“. Die größte Chance liegt am Gast-Handy: Dort passiert das eigentliche Produkt (abstimmen), es fühlt sich aber noch wie ein Werkzeug an statt wie Teil der Party.

## Was gut funktioniert

1. **TV-Seite** – für Distanz gebaut, QR immer sichtbar, Rangliste mit großen Herzen und „+ N weitere“, ruhige FLIP-Animation.
2. **Entfernen-Rückfrage im Dashboard** – „Auch sperren / Nur entfernen / Abbrechen“ genau da, wo die Absicht entsteht; beim laufenden Song ohne „Auch sperren“.
3. **Barrierefreiheit** – `aria-pressed`-Herzen, Live-Regionen, beschriftete Ziffernfelder, Fokusführung im Menü, Kontrast-Test über alle Tokens.

## Priority Issues

**[P1] Gast-Handy macht „der Raum entscheidet“ nicht sichtbar**
- Warum: Kernunterschied zu Spotify Jam. Wer kurz aufs Handy schaut, sieht weder was läuft noch ob die Stimme etwas bewirkt hat.
- Fix: in `voting-comp.html` eine kompakte Now-Playing-Leiste oben; Rangnummer pro Zeile (Stil `.rank` wie im Dashboard); nach einem Like die neue Position kurz hervorheben; Toast nach Hinzufügen mit Platz („Song hinzugefügt – Platz 7“) und Aktion „Zum Voten“.
- Befehl: `/impeccable bolder`

**[P1] Cover-Platzhalter und Leerzustände brechen die Bühne**
- Warum: Der leere TV ist das Erste, was der Raum sieht – genau dann, wenn alle scannen sollen. Ein greller hellgrauer Clip-Art-Noten-Block dominiert, „Als Nächstes“ steht über einer leeren Fläche.
- Fix: Platzhalter in `mv-cover.ts` als dunkle Marken-Kachel mit Linien-Icon; in `startpage.html` Warteschlangen-Überschrift im Leerzustand ausblenden oder mit Text füllen; im Leerzustand QR/Beitreten größer.
- Befehl: `/impeccable polish`

**[P2] Blacklist-Setup ist der schwerste Schritt im Ablauf**
- Warum: Wort-Formular, Tabs, zweite Suche, Ergebnisse und Liste auf einer optionalen Seite.
- Fix: Wort, Künstler und Song in ein Suchfeld zusammenführen (Ergebnisse: „Wort „x“ sperren“, dann Künstler, dann Songs).
- Hinweis: Die Empfehlung, „Weiter“ immer aktiv zu machen, widerspricht der Host-Spec („Weiter“ deaktiviert, solange nichts gesperrt ist) – Teamentscheidung, nicht ändern ohne Spec-Change.
- Befehl: `/impeccable distill`

**[P2] Host-Navigation am Laptop versteckt; Gastgeber-PIN dauerhaft groß sichtbar**
- Warum: Suchen und Blacklist nur im Burger; zwei große 5-stellige Codes nebeneinander verwirren, und die geheime PIN ist für Umstehende lesbar.
- Fix: ab 1024 px die Menüeinträge als feste Leiste in `mv-host-menu.ts`; Gastgeber-PIN im Dashboard als „•••••“ mit „Anzeigen“ und unter die Aktionen.
- Hinweis: Die Spec verlangt heute, dass die Gastgeber-PIN mit Hinweis angezeigt wird – Verbergen bräuchte einen Spec-Change.
- Befehl: `/impeccable layout`

**[P3] Marke und Party-Identität**
- Logo nur als Favicon; Gast-Seiten zeigen nie, in welcher Party man ist.
- Fix: Logo auf `/` und im TV-Footer; kleiner Chip „Party 12345“ in der Gast-Kopfzeile (mit Platz für „Party verlassen“).
- Befehl: `/impeccable clarify`

## Persona Red Flags

- **Sam (Tastatur/Screenreader):** Bestätigung „Song entfernen“ ist ein inline `alertdialog`, Fokus springt vermutlich nicht auf die Buttons (nicht verifiziert); TV-Like-Zahl als `aria-label` auf `span` ohne Rolle; Emoji in Texten wird vorgelesen.
- **Casey (Gast, einhändig, laut):** Suchfeld ganz oben außer Daumenreichweite; Überschriften sind Slogans; kein Now-Playing; gesperrter Song: Tippen auf das graue Plus bewirkt nichts und sagt nichts. Like-Button 52 px im Daumenbereich: gut.
- **Jordan (erstmals Host):** „Gastgeber-PIN nötig“ taucht auf, bevor erklärt ist, was das ist; Blacklist-Schritt am schwersten; zwei PINs nebeneinander.
- **Oma bei der Familienfeier:** englische Begriffe, Slogan-Überschriften, Theme-Schalter am Handy nur als Mond-Symbol.

## Kleinere Beobachtungen

- Einfügen-Button auf `/code` wirkt wie eine Hauptaktion und bricht bei 390 px um.
- Hellmodus: Play-Button im Dashboard blass-lila, wirkt deaktiviert.
- `voting-host` wiederholt die Gast-Liste ohne Rang und ohne Aktionen – wenig Zweck.
- HTL-Logo 2763 px breit für eine Fußzeile.
- Fußzeile „powered by“ auf `/` konkurriert auf kurzen Handys mit den Rollen-Buttons (nach der Vergrößerung heute).

## Fragen

1. Soll das Gast-Handy eine kleine Kopie des TV werden (Now-Playing oben, Rangliste, eigene Likes markiert) statt Suche-plus-Liste?
2. Braucht der Host eigene Seiten `/voting-host` und `/search-host`, oder wird die Dashboard-Warteschlange der eine Ort zum Sortieren, Hinzufügen, Entfernen und Sperren?
3. Was macht das Party-Ende zum Höhepunkt – „Heute gewählt: Top 3“ auf TV und Handys?
4. Soll ein Tippen auf einen gesperrten Song einen sanften Hinweis „Gerade nicht verfügbar“ zeigen (ohne Grund)?

## Nicht verifiziert

Befüllte Zustände nur aus Code; `/select-playlist`, `/select-blacklist`, `/party-ready` nicht gerendert (leiten ohne Party weiter); kein echter Screenreader-Test.
