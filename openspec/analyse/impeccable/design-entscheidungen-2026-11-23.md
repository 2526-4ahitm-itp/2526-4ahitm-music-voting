# Offene Design-Entscheidungen (2026-11-23)

Grundlage: `ui-ux-critique-2026-11-17.md` (Punkt 3 der Continuation vom 2026-11-17).
Aus den Antworten entsteht der nächste OpenSpec-Change.

**So ausfüllen:** Bei jeder Frage eine Option ankreuzen (`[x]`) oder unter **Antwort** frei schreiben.
⭐ = Vorschlag von Claude. Leer gelassene Fragen nehme ich als „Vorschlag übernehmen“, außer du schreibst „offen lassen“.

**Schon entschieden (wird nicht neu gefragt):** Bewertung 27/40 akzeptiert · getrennte Hell/Dunkel-Einstellung Gäste vs. Host/TV · `party-ready` ohne Zurück-Button und ohne Kopier-Link · Entfernen mit Rückfrage inkl. „Auch sperren“ · Gast-Titel „Warteschlange“ / „Song suchen“.

---

## A. Umfang

### A1. Was kommt in diesen Change?
- [ ] ⭐ P1 + P2 (Host-Warteschlange, party-ready, Fokus in den Rückfragen, TV-Layout + Like-Puls); P3 später in einem kleinen eigenen Change
- [ ] Nur P1 (Host-Warteschlange, party-ready)
- [ ] Alles, P1 bis P3

**Antwort:**

---

## B. Host-Warteschlange (P1)

### B1. Was passiert mit `/voting-host`?
Das Dashboard zeigt die Warteschlange schon mit Rang, Likes und Entfernen. `/voting-host` zeigt dieselbe Liste nur zum Ansehen, mit einem Suchfeld.
- [x] ⭐ Entfernen: Eintrag „Voting“ aus dem Host-Menü streichen, `/voting-host` leitet auf `/dashboard` weiter, Seite wird gelöscht
- [ ] Behalten, aber als „Warteschlange“ umbenennen und dieselben Zeilen wie im Dashboard zeigen (Rang, Likes, Entfernen)
- [ ] Unverändert lassen

**Antwort:**

### B2. Suchfeld „In der Warteschlange suchen“
Gibt es nur auf `/voting-host`. Falls die Seite wegfällt:
- [ ] ⭐ Ersatzlos weglassen (die Warteschlange einer Party ist meist kurz)
- [x] Ins Dashboard über die Warteschlange übernehmen

**Antwort:**

### B3. Dashboard am Handy (unter 560 px)
Rang und Likes sind dort aktuell ausgeblendet.
- [x] ⭐ Rang und Likes immer zeigen, dafür das Cover in der Zeile kleiner
- [ ] Rang und Likes zeigen, Cover am Handy ausblenden
- [ ] So lassen

**Antwort:**

### B4. Host-Seite „Suchen“ (`/search-host`)
- [ ] ⭐ Als eigene Seite behalten (Menüeintrag bleibt)
- [x] Durch einen Knopf „+ Song“ im Dashboard ersetzen, der die Suche öffnet

**Antwort:**

### B5. Begriffe im Host-Menü und Setup
„Blacklist“ und „Standard-Playlist“ sind laut Bewertung Fachsprache.
- [x] ⭐ Beibehalten (Begriffe sind bei Jugendlichen geläufig und stehen so in Specs und Doku)
- [ ] Umbenennen, z. B. „Sperrliste“ und „Start-Playlist“ (bitte eigene Begriffe eintragen)

**Antwort:**

---

## C. party-ready (P1)

### C1. Hauptknopf
- [ ] ⭐ „Player auf dem TV öffnen“ ist immer der einzige Hauptknopf, „Zum Dashboard“ immer sekundär
- [x] Wie jetzt: vor dem Start ist „Player öffnen“ Hauptknopf, sobald die Party live ist wird „Zum Dashboard“ zum Hauptknopf

**Antwort:**

### C2. Live-Status „Party ist live 🎉“
Sieht aktuell wie ein Knopf aus.
- [ ] ⭐ Als schlichter Statustext mit Punkt/Haken, ohne Rahmen und Fläche
- [x] So lassen

**Antwort:**

### C3. Anleitung „Anderes Gerät am TV?“
- [x] ⭐ Als nummerierte Schritte (1. MusicVoting öffnen → 2. Gastgeber → 3. Gastgeber-PIN eingeben → 4. Player öffnen)
- [ ] Wie jetzt als ein Satz mit Pfeilen

**Antwort:**

### C4. Reihenfolge der Seite
- [x] ⭐ Überschrift → Status → Player-Knopf → Anleitung Zweitgerät → Voting-PIN → „Zum Dashboard“ (wie jetzt)
- [ ] Voting-PIN nach oben, direkt unter die Überschrift

**Antwort:**

### C5. Zwei fünfstellige PINs (Voting-PIN und Gastgeber-PIN)
Werden nur über den Hilfetext unterschieden.
- [x] ⭐ Namen lassen, aber jede PIN immer mit eigenem Symbol und Hinweis „für Gäste“ / „nur für dich“ zeigen
- [ ] Umbenennen (bitte Begriffe eintragen)
- [ ] So lassen

**Antwort:**

---

## D. Rückfragen im Dashboard (P2)

### D1. Welcher Knopf bekommt den Fokus, wenn „Song entfernen?“ aufgeht?
- [ ] ⭐ „Abbrechen“ (sicherster Knopf; Enter löst nichts Unwiderrufliches aus)
- [ ] „Nur entfernen“
- [x] Der erste Knopf („Auch sperren“), wie in der Bewertung vorgeschlagen

**Antwort:**

### D2. Fokus bei „Party wirklich beenden?“
- [x] ⭐ „Abbrechen“
- [ ] „Ja, beenden“

**Antwort:**

### D3. Escape-Taste
- [x] ⭐ Escape schließt die Rückfrage, Fokus geht zurück auf den Knopf, der sie geöffnet hat
- [ ] Keine Escape-Unterstützung

**Antwort:**

---

## E. TV / Player-Seite (P2)

### E1. Leere Mitte bei 1920 px
- [x] ⭐ Spalten breiter verteilen: Läuft-gerade-Bereich und Rangliste wachsen, Abstand dazwischen fest
- [ ] QR-Code und PIN größer in die Mitte
- [ ] So lassen

**Antwort:**

### E2. Reaktion auf neue Likes
- [x] ⭐ Kurzer Puls am Herz und an der Zahl der betroffenen Zeile (bei „Bewegung reduzieren“ nur Farbwechsel, keine Bewegung)
- [ ] Puls an der ganzen Zeile
- [ ] Keine Reaktion

**Antwort:**

### E3. Song springt auf Platz 1
- [x] ⭐ Nichts Zusätzliches (die FLIP-Animation zeigt den Platzwechsel schon)
- [ ] Kurze Hervorhebung der neuen Nummer 1 (z. B. Glow)

**Antwort:**

### E4. Dunkelviolettes Logo-Segment auf dem TV wirkt schwach
- [ ] ⭐ Segment auf dem TV etwas heller einfärben (nur dort)
- [ ] So lassen

**Antwort:** minimaler backgroundglow für das logo in weiß beim darkmode

---

## F. Kleinigkeiten (P3, nur falls in A1 gewählt)

### F1. Host-Leiste oben/links
- [x] ⭐ Logo statt Text „MusicVoting“, darunter Badge „Party läuft · 47291“ (Voting-PIN)
- [ ] Nur Logo statt Text, kein Badge
- [ ] So lassen

**Antwort:**

### F2. Theme-Schalter
Mal mit Text, mal nur Symbol.
- [x] ⭐ Überall nur Symbol (mit `aria-label` und Tooltip)
- [ ] Überall Symbol + Text „Hell“ / „Dunkel“

**Antwort:** mache daraus einen toggle button

### F3. „Code aus Zwischenablage einfügen“ bricht bei 390 px um
- [ ] ⭐ Kürzen auf „Code einfügen“
- [x] So lassen

**Antwort:**

### F4. Startseite am Handy: Theme-Schalter allein in leerer Kopfzeile
- [x] ⭐ Logo links in die Kopfzeile, Schalter rechts
- [ ] Schalter nach unten zum Footer
- [ ] So lassen

**Antwort:**

### F5. Glow-Farbe (`rgba` fest in `startpage.css` / `host-dashboard.css`)
Rein technisch, keine sichtbare Änderung: wird als Design-Token angelegt. Nur ankreuzen, falls **nicht** gewünscht.
- [ ] Nicht machen

---

## G. Weitere Beobachtungen (optional, eigener Change möglich)

### G1. „Player öffnen“ zeigt nicht, ob ein Player verbunden ist
Überschneidet sich mit `fix-player-device-feedback` (Punkt 2 der Continuation).
- [x] ⭐ Dort mit erledigen, nicht hier
- [ ] Hier: Statuspunkt „Player verbunden / nicht verbunden“ am Knopf

**Antwort:**

### G2. Gäste: Toast „Zum Voten“ verschwindet nach 4 s
- [ ] ⭐ Auf 6 s verlängern und beim Antippen/Hover stehen lassen
- [ ] So lassen

**Antwort:**

### G3. Gäste erfahren nie, warum ein Song gesperrt ist
Aktuell: gesperrte Songs sind ausgegraut, ohne sichtbaren Text (nur Tooltip „Nicht verfügbar“); Songs gesperrter Künstler werden mit Hinweis ausgeblendet.
- [x] ⭐ So lassen (Gastgeber soll nicht bloßgestellt werden)
- [ ] Kurzer sichtbarer Text „Vom Gastgeber gesperrt“ am Song
- [ ] Genauen Grund anzeigen (Wort / Künstler / Song)

**Antwort:**

---

## Sonstiges

Weitere Wünsche oder Anmerkungen:

ich will das der gast nicht zwischen zwei seiten wechseln muss, sonder immer die warteschlage sieht und dort voten kann.
und beim suchen findest man alle songs auch die in der warteschlage. wenn das lied schon in der warteschlage ist kann man voten ansonsten hinzufügen.

