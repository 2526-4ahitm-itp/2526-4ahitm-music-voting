---
target: musicvoting/frontend/src/app
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/simonesperrer/IdeaProjects/itp_projekt/2526-4ahitm-music-voting/musicvoting/frontend/src/app"
timestamp: 2026-11-17T07-21-53Z
slug: musicvoting-frontend-src-app
---
# Impeccable Critique — Web-Frontend (2026-11-17, nach 8.3–8.5)

Method: dual-agent (A: Design-Review · B: Detector + Browser), isoliert voneinander.
Ziel: `musicvoting/frontend/src/app`. Kein Backend: Seiten mit Mock-Daten (Demo-Party, PIN 47291) auf eigenem Dev-Server gerendert; Toasts, Rückfragen, Welcome-Sheet und Party-Ende aus Templates und DOM-Specs beurteilt.

## Design Health Score

| # | Heuristik | Score | Wichtigster Punkt |
|---|---|---|---|
| 1 | Sichtbarkeit des Systemstatus | 3 | Läuft-gerade-Leiste, Ränge, Toast „Platz N“ wirken; Dashboard am Handy ohne Rang und Likes |
| 2 | Sprache der Nutzer | 3 | Warmes „du“; „Voting“ (Host-Navigation), „Blacklist“, „Standard-Playlist“ sind Fachsprache |
| 3 | Kontrolle und Freiheit | 3 | Neu „Party verlassen“ mit Rückfrage; Like rückgängig; Entfernen mit Rückfrage; kein Rückgängig nach dem Entfernen |
| 4 | Konsistenz | 2 | Warteschlange in drei Varianten (Dashboard, Host-„Voting“, Dashboard am Handy); Theme-Schalter mal mit Text, mal nur Symbol |
| 5 | Fehlervermeidung | 3 | Doppelte Songs deaktiviert, gesperrte ausgegraut, Rückfragen bei Entfernen und Beenden |
| 6 | Erkennen statt Erinnern | 3 | Neu: feste Host-Leiste ab 1024 px, Party-Kennung bei Gästen; party-ready verlangt eine Pfeilkette fürs zweite Gerät |
| 7 | Flexibilität und Effizienz | 2 | Enter sperrt Wort, PIN einfügen; keine Tastenkürzel, jede Entfernung mit Rückfrage |
| 8 | Ästhetik und Reduktion | 3 | Ruhig und einheitlich; leere TV-Mitte bei 1920 px, Leerfläche Blacklist am Laptop, drei lila Flächen auf party-ready |
| 9 | Fehler erkennen und beheben | 3 | Freundliche, konkrete Meldungen; Backend-Texte wörtlich; Gäste erfahren den Sperrgrund nie |
| 10 | Hilfe und Dokumentation | 2 | Welcome-Sheet und Untertitel; nichts erklärt, was „der Player“ ist |
| **Gesamt** | | **27/40** | **Acceptable** (Grenze zu Good bei 28) |

Vorher: 18/40 (2026-11-03 morgens), 27/40 (2026-11-03 abends). Ziel ≥ 28/40 knapp verfehlt: Kontrolle und Erkennen gewinnen durch „Party verlassen“ und die Host-Leiste, Konsistenz fällt auf 2, weil die Leiste den unfertigen Host-„Voting“-Bereich gleichrangig neben das Dashboard stellt.

## Design-Specificity-Urteil

**LLM:** Teils eigenständig. Gast-Handy (Ränge, Korallenherz, Läuft-gerade-Leiste, Toast mit Platz) und TV (großer QR, PIN, Rangliste) sind produktspezifisch; die Host-Seite (Leiste, gestapelte Karten, Leerzustände „Bereit für Musik?“) ist austauschbares Admin-Muster.

**Detector:** CLI 0 Funde mit Config; ohne Config 2 × `broken-image` (QR-`[src]` in `host-dashboard.html`, `startpage.html`), bekannte Fehlalarme. Overlay auf 13 Seiten/Größen: 11 ohne Fund, 2 × `dark-glow` am Cover „Läuft gerade“ (`startpage.css:66-71`, `host-dashboard.css:31-35`, lila `box-shadow`) – passt zur dunklen Bühne mit Markenlicht, aber fest eingetragenes rgba statt Token (P3). Konsole: 0 Fehler/Warnungen, kein NG0913 mehr, kein 404.

## Gesamteindruck

Gast-Erlebnis rund; die Schwäche liegt jetzt auf der Host-Seite: Warteschlange in drei Varianten, party-ready als Anleitung statt Startmoment. Größter Hebel: Host-Warteschlange vereinheitlichen.

## Was gut funktioniert

1. Abstimmen am Handy – Rang, Cover, Titel, Zahl und 44-px-Herz im Daumenbereich; gelikter Zustand klar, dunkel und hell.
2. TV für Distanz – große Titel, QR und PIN vom Sofa lesbar, animierte Positionswechsel (FLIP).
3. Rückmeldungen ohne Schuld – Toast mit Platz, gesperrte Songs diskret, zweistufiges Entfernen.

## Priority Issues

**[P1] Host-Warteschlange in drei Varianten, „Voting“-Seite ohne Zweck**
- Warum: Am Handy sieht der Host weder Rang noch Likes; widerspricht „Der Raum entscheidet, sichtbar“.
- Fix: gemeinsame Host-Zeile mit Rang, Likes und Entfernen, auch unter 1024 px; `/voting-host` aus `mv-host-menu` streichen oder sinnvoll machen; „Voting“ → „Warteschlange“.
- Befehl: `/impeccable distill`, dann `/impeccable adapt`

**[P1] party-ready ist eine Anleitung, kein Startmoment**
- Warum: „Player auf dem TV öffnen“ schwächer als „Zum Dashboard“; Chip „Party ist live 🎉“ sieht wie ein Knopf aus.
- Fix: „Player auf dem TV öffnen“ als einziger Hauptknopf, Chip als Statustext, „Zum Dashboard“ sekundär; Zweitgerät-Anleitung als nummerierte Schritte (kein Kopier-Link, kein Zurück – Teamentscheidungen 2026-11-03).
- Befehl: `/impeccable clarify` + `/impeccable layout`

**[P2] Dashboard-Rückfragen ohne Fokusführung**
- Warum: `role="alertdialog"` für Entfernen/Sperren und Party beenden, aber Fokus springt nicht hinein und nicht zurück.
- Fix: in `host-dashboard.ts` per `afterNextRender` auf den ersten Knopf fokussieren, beim Schließen zurück auf den Auslöser.
- Befehl: `/impeccable harden`

**[P2] TV: leere Mitte, Likes ohne Reaktion**
- Warum: ca. 450 px leer zwischen den Spalten bei 1920 px; steigende Like-Zahl vom Sofa nicht wahrnehmbar.
- Fix: Spalten in `startpage.css` neu verteilen; kurzer Puls am Herz bei Like-Änderung (ohne bei reduzierter Bewegung).
- Befehl: `/impeccable layout` + `/impeccable animate`

**[P3] Austauschbare Host-Oberfläche und Kleinigkeiten**
- Fix: Logo und Live-Badge „Party läuft · 47291“ in der Leiste, einheitliche Beschriftung des Theme-Schalters, Glow-rgba als Token.
- Befehl: `/impeccable bolder` / `/impeccable polish`

## Persona Red Flags

- **Casey (Gast, eine Hand):** lange Titel früh abgeschnitten; Suchfeld über der Warteschlange belegt Platz; Toast „Zum Voten“ nach 4 s weg.
- **Jordan (erstmals Host):** Player geht auf party-ready unter; „Standard-Playlist“/„Blacklist“ Fachsprache; „Player öffnen“ zeigt nicht, ob ein Player verbunden ist; zwei fünfstellige PINs nur per Hilfetext unterschieden.
- **Sam (Screenreader/Tastatur):** Dashboard-Rückfragen ohne Fokusführung; grauer Künstlertext im Hellmodus im echten Gerät prüfen.

## Minor Observations

- „Code aus Zwischenablage einfügen“ bricht bei 390 px um → „Code einfügen“.
- Startseite am Handy: Theme-Schalter allein in leerer Kopfzeile.
- Host-Leiste: „MusicVoting“ als Text statt Logo.
- Dunkelviolettes Logo-Segment auf dem TV schwach.
- Fortschritt im Mock „0:00“ (laut beiden Agenten Mock-bedingt) – in echter App prüfen.

## Questions to Consider

- Braucht der Host getrennte Seiten „Voting“ und „Suchen“, oder reicht das Dashboard mit „+ Song“?
- Wie sähe party-ready aus, wenn der Host nur 10 Sekunden und ein Ziel hätte?
- Was, wenn der TV kurz feiert, sobald ein Song auf Platz 1 springt?
