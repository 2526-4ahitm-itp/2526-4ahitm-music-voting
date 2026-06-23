---
title: Bedienungsanleitung
description: So benutzt du MusicVoting – für Gäste und Gastgeber
tags: [ Guide ]
showDate: true
date: 2026-06-23
lastmod: 2026-06-23
---

Diese Anleitung erklärt, wie du MusicVoting benutzt – als **Gast** (Abschnitt 1) oder als **Gastgeber/Host** (Abschnitt 2).

> [!TIP]
> Die App läuft im Browser unter **https://it220241.cloud.htl-leonding.ac.at**.
> Optional gibt es auch eine iOS-App.

---

# 1. Für Gäste

Als Gast brauchst du **keinen Account** und musst **keinen Namen** angeben – du bleibst anonym.

## 1.1 Party beitreten

Du hast zwei Möglichkeiten:

**a) QR-Code scannen**
Scanne den QR-Code, der am Monitor/TV angezeigt wird. Dein Browser öffnet direkt die Party.

**b) PIN eingeben**
Öffne die App und gib den **5-stelligen PIN** ein, der am Monitor angezeigt wird.

> [!NOTE]
> Stimmt der PIN nicht (oder ist die Party schon beendet), erscheint eine Fehlermeldung
> wie **„Party nicht gefunden.“** und du kommst nicht hinein.

Nach dem Beitreten landest du zuerst auf der **Voting-Ansicht** (der Warteschlange).
Unten findest du eine Leiste mit zwei Tabs:

- **Voten** – die aktuelle Warteschlange.
- **Hinzufügen** – Songs suchen und hinzufügen.

## 1.2 Songs suchen und hinzufügen

1. Wechsle unten auf den Tab **„Hinzufügen“**.
2. Tippe einen Song- oder Künstlernamen ins Suchfeld.
   - Lässt du das Feld **leer**, werden die **Top 10** des Anbieters angezeigt.
3. Tippe beim gewünschten Treffer auf das **„+“**, um ihn zur Warteschlange hinzuzufügen.

> [!NOTE]
> - Songs lassen sich **nur über die Suche** hinzufügen – Links oder IDs einfügen geht nicht.
> - Ist ein Song bereits in der Warteschlange, zeigt das Ergebnis statt „+“ ein **Häkchen** und ist nicht anklickbar.

### Wenn etwas nicht klappt

| Meldung | Bedeutung |
|---|---|
| „Song ist schon in der Warteschlange.“ | Diesen Song hat schon jemand hinzugefügt – like ihn einfach. |
| „Zu viele Anfragen — bitte kurz warten.“ | Du hast das Limit von 10 Songs pro Minute erreicht. Kurz warten. |
| „Nicht erlaubt.“ | Der Song steht auf der Blacklist des Gastgebers. |

## 1.3 Abstimmen (Liken)

Auf dem Tab **„Voten“** siehst du die ganze Warteschlange:

- Tippe auf das **Herz**, um einen Song zu liken. Herz und Zähler reagieren sofort.
- Erneutes Tippen entfernt dein Like wieder (**Toggle**).
- Du hast **ein Like pro Song**.

Die Reihenfolge richtet sich nach den Likes:
**mehr Likes zuerst**, bei Gleichstand **der ältere Wunsch zuerst**.
Alle Änderungen (neue Songs, neue Likes, der aktuell laufende Titel) erscheinen **live** – du musst nichts neu laden.

> [!NOTE]
> Deine Likes und hinzugefügten Songs bleiben dir erhalten, auch wenn du die Seite neu lädst
> oder die App schließt und wieder öffnest.

## 1.4 Party-Ende

Wenn der Gastgeber die Party beendet, siehst du **„Die Party ist beendet.“** und kommst zurück zur Startseite.
Danach kannst du einer neuen Party beitreten, sobald du einen neuen PIN oder QR-Code bekommst.

## 1.5 Gut zu wissen

- **Anonym:** Niemand sieht, welchen Song du gewünscht oder geliked hast.
- **Kein Ton auf deinem Handy:** Die Musik läuft nur auf dem Monitor/TV der Party.
- **Verbindung weg?** Die App verbindet sich nach kurzen Aussetzern automatisch wieder und lädt den aktuellen Stand neu.

---

# 2. Für Gastgeber (Host)

> [!TIP]
> Du brauchst einen **Spotify-Premium-Account** – die Wiedergabe funktioniert nur mit Premium.

## 2.1 Party erstellen

1. Öffne die App und wähle **„Party erstellen“**.
2. Wähle deinen **Musik-Anbieter** (Spotify).
   - Der Anbieter gilt für die ganze Party und kann später **nicht** mehr gewechselt werden.
3. Melde dich bei Spotify an (OAuth).
   - Dieser Login gilt **nur für diese Party**.
4. Die App erzeugt für dich:
   - einen **5-stelligen Gast-PIN** (den geben deine Gäste ein),
   - einen **QR-Code** zum Beitreten,
   - einen separaten **Host-PIN**, mit dem deine Steuerung abgesichert ist.

> [!NOTE]
> Gast-PIN und Host-PIN sind **unterschiedlich**. Den Host-PIN brauchst du nicht weiterzugeben –
> teile nur den Gast-PIN bzw. den QR-Code mit deinen Gästen.

## 2.2 Musik auf den Monitor/TV bringen

Die Musik läuft **immer auf dem Monitor/TV** (im Browser) – nicht auf deinem Steuer-Gerät.

1. Öffne die App auf dem Monitor/TV und wähle **„Party anzeigen“**.
2. Gib den **Gast-PIN** ein.
3. Der Monitor zeigt nun dauerhaft: QR-Code, aktuellen Song mit Fortschrittsbalken und die Warteschlange.
4. Nach einem Reload verbindet sich der Monitor **automatisch wieder** – der PIN muss nicht erneut eingegeben werden.

> [!IMPORTANT]
> Solange noch **kein Monitor/TV** geöffnet ist, sind deine Play-/Pause-/Skip-Tasten
> deaktiviert (ein Hinweis erklärt das). Sobald der Monitor offen ist, werden sie automatisch aktiv.

## 2.3 Wiedergabe steuern

Auf deinem Host-Gerät stehen dir folgende Steuerungen zur Verfügung:

- **Play** – startet beim ersten Druck den ersten Song aus der Warteschlange.
- **Pause / Resume** – pausiert bzw. setzt die Wiedergabe fort. Das Symbol zeigt ▶ (gestoppt/pausiert) oder ⏸ (läuft).
- **Skip** – überspringt den aktuellen Song; der nächstplatzierte Song aus der Warteschlange startet.
- **Song entfernen** – du kannst jeden Song aus der Warteschlange entfernen.

Die Reihenfolge bestimmen die Likes deiner Gäste:
**mehr Likes zuerst**, bei Gleichstand **der älteste Wunsch zuerst**.

> [!NOTE]
> Ein Fortschrittsbalken auf deinem Gerät bleibt mit dem Monitor synchron –
> du musst nichts nachladen.

## 2.4 Blacklist pflegen

Du kannst pro Party eine **Wortliste (Blacklist)** führen:

- Füge Wörter hinzu, die du nicht hören möchtest.
- Beim Hinzufügen prüft die App, ob ein Blacklist-Wort als **Teilstring** im Titel oder Künstlernamen vorkommt.
- Gäste, deren Song geblockt wird, sehen **„Nicht erlaubt.“**.
- Songs, die **bereits** in der Warteschlange stehen, werden durch ein neues Blacklist-Wort **nicht** nachträglich entfernt.

## 2.5 Party beenden

1. Wähle **„Party beenden“** und bestätige.
2. Dabei wird die Warteschlange geleert, deine Spotify-Tokens werden gelöscht und alle Gäste sehen, dass die Party beendet ist.
3. Du landest wieder auf der Startseite.

> [!NOTE]
> - Beendest du die Party nicht selbst, endet sie **automatisch nach 2 Tagen**.
> - Eine **neue** Party erfordert immer einen **neuen** Spotify-Login – Tokens werden nicht wiederverwendet.

## 2.6 Häufige Fragen

**Die Play-Tasten sind ausgegraut.**
Es ist noch kein Monitor/TV geöffnet. Öffne die „Party anzeigen“-Ansicht auf dem TV; danach werden die Tasten aktiv.

**Spotify meldet „Sitzung abgelaufen“.**
Bei „Spotify-Sitzung abgelaufen. Bitte neu anmelden.“ die Party neu starten und erneut bei Spotify anmelden. Normalerweise erneuert die App das Token aber automatisch im Hintergrund – auch bei Partys, die länger als eine Stunde laufen.

**Wer hat welchen Song gewünscht?**
Das wird bewusst **nicht** angezeigt – Gäste bleiben anonym.
