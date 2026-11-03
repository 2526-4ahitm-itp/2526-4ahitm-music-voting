# Fragen (beantwortet): refactor-design-fixes

Bitte unter jeder Frage bei **Antwort:** eintragen. Ein Kürzel wie „A“ reicht, freie Antworten sind genauso okay.
Die mit **(Empfehlung)** markierte Option ist schon in `proposal.md`, `design.md` und den Delta-Specs eingearbeitet. Wenn du sie nimmst, ändert sich nichts.

---

## TV-Seite (`/startpage`)

### Q1 – Wie viele Songs der Warteschlange soll der TV zeigen?
Bei ≥ 32px Schrift passen nicht alle Songs auf den Bildschirm.
- **A (Empfehlung):** Top 5, darunter „+ 12 weitere“
- B: Top 3
- C: Alle Songs, die Liste scrollt automatisch
- D: Andere Zahl: ___

**Antwort:** A

### Q2 – Wie groß soll der QR-Code auf dem TV sein?
- **A (Empfehlung):** Eigener Block rechts, etwa ein Drittel der Bildschirmhöhe, darunter groß der Gäste-Code
- B: Klein in der Ecke, dafür mehr Platz für Cover und Warteschlange
- C: Groß, solange die Warteschlange leer ist, danach klein in der Ecke

**Antwort:** A

### Q3 – Was steht auf dem TV, wenn die Warteschlange leer ist?
Heute steht dort „Der Host kann den ersten Song im Dashboard starten.“, ein Text für den Host.
- **A (Empfehlung):** „Scan den Code und wünsch dir den ersten Song!“
- B: „Noch keine Songs – scan den QR-Code!“
- C: Eigener Text: ___

**Antwort:** A

### Q4 – Was passiert mit dem „powered by HTL Leonding“-Block?
- **A (Empfehlung):** Kleine Fußzeile am TV, sonst nirgends
- B: Bleibt wie bisher
- C: Ganz entfernen
- D: Nur auf der Startseite (`/`)

**Antwort:** A & auf der startseite soll das auch angezeigt werden

---

## Beitritt als Gast

### Q5 – Was passiert mit der Weiterleitung zur iOS-App beim Beitritt im Web?
Heute versucht `code-input` bei jedem Beitritt zuerst `musicvotingapp://` zu öffnen und wartet 1,5 s. In iOS Safari kann dabei der Dialog „Adresse ungültig“ erscheinen.
- **A (Empfehlung):** Der Web-Beitritt geht sofort durch. Ein kleiner Hinweis „In der App öffnen“ erscheint nur auf iOS-Geräten.
- B: Weiterleitung entfernen, ganz ohne App-Hinweis
- C: So lassen wie bisher, nur eine Ladeanzeige dazu

**Antwort:** gleich lassen

### Q6 – Was steht im Willkommens-Fenster nach dem Beitritt?
Eine Party hat heute **keinen Namen**. Für „Du bist bei <Party>!“ bräuchte es ein neues Feld im Backend, das der Host beim Erstellen der Party ausfüllt.
- **A (Empfehlung):** Ohne Partyname: „Du bist dabei! 🎉 Like Songs, die du hören willst, oder füg eigene hinzu.“, einmal pro Gerät und Party
- B: Mit Partyname. Dafür bekommt die Party ein Namensfeld (Backend + Host-Formular, eigener Change)
- C: Kein Willkommens-Fenster, nur ein kurzer Toast „Du bist dabei!“

**Antwort:** A

### Q7 – Welche Bestätigung kommt nach dem Hinzufügen eines Songs?
- **A (Empfehlung):** Kurzer Toast unten über der Leiste: „Song hinzugefügt“ (ca. 2 s), dazu das Häkchen am Song
- B: Nur das Häkchen wie bisher, aber mit kurzer Animation
- C: Toast mit Link „Zur Warteschlange“

**Antwort:** A

### Q8 – Was sehen Gäste, wenn die Party beendet wird?
Laut `guest/spec.md` soll „Die Party ist beendet.“ erscheinen. Der Code springt aber heute direkt zu `/`.
- **A (Empfehlung):** Eigener Bildschirm „Die Party ist beendet. Danke fürs Mitfeiern!“ mit Button „Zur Startseite“
- B: Kurzer Hinweis (3 s), danach automatisch zu `/`
- C: Eine Zusammenfassung „Deine Party in Zahlen“ (Anzahl Songs, meistgelikter Song). Dafür bräuchte es einen Backend-Endpunkt und einen eigenen Change.

**Antwort:** A

### Q8b – Sollen gesperrte Songs in der Gast-Suche einen Hinweis bekommen?
Laut `search/spec.md` sind sie heute **ohne Text** nur ausgegraut, damit Gäste nicht sehen, was gesperrt ist. Die Critique sagt, Erstnutzer halten das für einen Fehler.
- **A (Empfehlung):** Spec bleibt so (kein Text). Der ausgegraute Button bekommt aber ein `aria-label` „Nicht verfügbar“ und einen Tooltip „Nicht verfügbar“, ohne Grund.
- B: Sichtbarer Text „Nicht verfügbar“ am Song (Änderung an `search/spec.md`)
- C: Gar nichts ändern

**Antwort:** A

---

## Host

### Q9 – Wie sollen die zwei Codes heißen?
Heute heißen sie „Voting-PIN“ / „Host-PIN“ und haben beide eine 👑.
- **A (Empfehlung):** „Gäste-Code“ (öffentlich, am TV) und „Gastgeber-Code“ mit Hinweis „geheim, damit kommst du zurück ins Dashboard“
- B: „Party-Code“ und „Host-Code“
- C: Eigene Namen: ___

**Antwort:** Voting-PIN und Gastgeber_PIN

### Q10 – Welche Musikdienste soll „Party erstellen“ anbieten?
Heute stehen dort „Spotify“ und „Amazon Music“. Amazon erzeugt aber eine Spotify-Party. YouTube steht in der Spec, ist im Web aber nicht umgesetzt.
- **A (Empfehlung):** Nur Spotify, ohne Dropdown, mit einem Satz „Du brauchst Spotify Premium.“
- B: Spotify aktiv, „YouTube (bald verfügbar)“ ausgegraut daneben
- C: Dropdown bleibt, Amazon wird entfernt

**Antwort:** B

### Q11 – Wo legt der Host die Blacklist an?
Heute ist die Blacklist ein Setup-Schritt vor dem Dashboard. Wörter und Künstler gehen **nur dort**, während der Party gibt es nur „Song sperren“.
- **A (Empfehlung):** Kein eigener Setup-Schritt mehr. Die Blacklist-Seite ist jederzeit über das Dashboard-Menü erreichbar („Blacklist“), auch während der Party.
- B: Setup-Schritt bleibt, aber kompakter (nur Wörter, Rest „Mehr …“), dazu auch über das Dashboard erreichbar
- C: Bleibt wie bisher

**Antwort:** Bleibt wie bisher, die Blacklist soll man aber auch während der Party genau so ausführlich bearbeiten könne wie beim Set-Up

### Q12 – Wie sieht der Abschluss der Einrichtung aus?
- **A (Empfehlung):** Neuer letzter Schritt „Deine Party ist bereit“: Button „Player auf dem TV öffnen“ mit kurzer Erklärung („Öffne diese Seite auf dem Gerät, das am TV hängt“), danach „Party ist live 🎉“ und weiter zum Dashboard
- B: Kein eigener Schritt, aber das Dashboard zeigt oben einen deutlichen Hinweis „Öffne jetzt den Player auf dem TV“ mit Erklärung
- C: Der Player öffnet sich automatisch in einem neuen Tab

**Antwort:** A

### Q12b – Wird der Player wirklich auf einem anderen Gerät (TV-PC) geöffnet, oder auf demselben Laptop in einem zweiten Fenster?
Davon hängt ab, ob der Schritt einen Link oder QR-Code zum Player zeigt (anderes Gerät) oder nur einen Button (gleiches Gerät).
- A: Meistens dasselbe Gerät (Laptop am Beamer/TV)
- B: Meistens ein eigenes Gerät
- C: Beides. Dann zeigt der Schritt einen Button **und** einen Link zum Kopieren.

**Antwort:** A, soll aber auch auf einem eigenen Gerät möglich sein

### Q13 – Wie wird das Entfernen eines Songs aus der Warteschlange abgesichert?
Heute gibt es keine Rückfrage und kein Rückgängig.
- **A (Empfehlung):** Rückgängig-Toast „Song entfernt · Rückgängig“ (5 s). Der Song wird erst nach Ablauf wirklich gelöscht, alles im Frontend, kein Backend nötig.
- B: Bestätigungsdialog vor dem Löschen
- C: So lassen

**Antwort:** A

---

## Look

### Q14 – Welche Icons und welche Schrift?
Heute sind die Icons Emoji (🪩 👑 🔊 ❌ 🚫) und die Schrift ist Segoe UI/System.
- **A (Empfehlung):** Icons von [Lucide](https://lucide.dev) (MIT, als Angular-Paket oder Inline-SVG). Schrift: eine kräftige, selbst gehostete Display-Schrift für Überschriften und Song-Titel am TV, dazu eine gut lesbare Textschrift (Vorschlag kommt im Design-Schritt, nur Fonts unter OFL-Lizenz).
- B: Nur Icons ersetzen, Systemschrift bleibt
- C: Eigene Wünsche (Schrift/Icon-Set): ___

**Antwort:** A

### Q15 – Wie stark darf sich der Look verändern?
Die Farben (Lila → Koralle) bleiben.
- **A (Empfehlung):** TV als „Bühne“: dunkler Hintergrund mit dem Farbverlauf als Licht/Glow, Cover groß, auffälliger. Handy-Ansichten bleiben hell und ruhig, nur mit den neuen Icons, der neuen Schrift und weniger Farbverlauf-Flächen.
- B: Überall dunkler „Club“-Look (auch am Handy)
- C: Hell bleiben, nur Details (Icons, Schrift, Abstände)

**Antwort:** A

---

## Prozess

### Q16 – Ein großer Change oder mehrere kleine?
Alle fünf Bereiche stecken heute in **einem** Change.
- **A (Empfehlung):** Ein Change. Die Umsetzung erfolgt in den Abschnitten von `tasks.md`, mit einem Commit pro Abschnitt.
- B: Aufteilen in 5 Changes (TV, Voting, Gast-Beitritt, Barrierefreiheit, Host-Einrichtung)

**Antwort:** A

---

## Nachfragen (2026-11-03)

- **Q9:** „Gastgeber-PIN“ mit Bindestrich. Der Hinweis „Geheim – damit kommst du zurück ins Dashboard.“ bleibt unter der Gastgeber-PIN.
- **Q5 „gleich lassen“:** Option C. Die App-Weiterleitung bleibt, während der Wartezeit erscheint „Party wird gesucht …“.
- **Q4 „auch auf der Startseite“:** Gemeint ist die Landingpage `/`. Die HTL-Fußzeile kommt auf den TV (`/startpage`) und auf `/`.
- **Q12b:** Meistens dasselbe Gerät, ein eigenes Gerät muss aber auch gehen. Deshalb gibt es den Button „Player auf dem TV öffnen“ und eine Anleitung für ein eigenes Gerät (MusicVoting → Gastgeber → Gastgeber-PIN → Player öffnen). „Link kopieren“ entfällt (Entscheidung A, 2026-11-03), weil der Player die Gastgeber-PIN braucht.

- **Q15 (Nachtrag nach Ansicht):** Am TV ausprobiert wurden hell/weiß, voller Marken-Farbverlauf und gedämpfter Farbverlauf. Entscheidung: zurück zur dunklen Bühne (Option A) mit dem Farbverlauf als Licht hinter dem Cover.

**Status:** Alle Fragen sind beantwortet und in Proposal, Design, Specs und Tasks eingearbeitet.
