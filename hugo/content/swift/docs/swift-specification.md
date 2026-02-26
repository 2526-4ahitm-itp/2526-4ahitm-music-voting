---
title: Spezifikation für Mobile Computing (Swift)
description: How to further develop the application
tags: [ Docs, Swift ]
showDate: true
authors:
  - simone
---


<br>
<br>

# Ziel

## Allgemeines Ziel
MusicVoting ist eine Web-Anwendung für Partys. 
Gäste können über ihr Smartphone Musikwünsche abgeben und über 
Likes darüber abstimmen, welche Songs als Nächstes laufen. 
Auf dem Monitor/TV läuft ein Dashboard, das die Musik abspielt und live anzeigt, 
was gerade spielt und was als Nächstes dran ist.

### Genauerre Zielsetzung
Die Spezifikation für das gesammte Projekt finden Sie hier:
{{< article link="docs/specification/" >}}

## Ziel der Swift-App
Die Swift-App ist die mobile Version unserer Webanwendung, die es den Gästen ermöglicht,
auch mit einer Smartphone-App an der Musikauswahl teilzunehmen.
Diese App ist jedoch nicht erforderlich, sondern soll als zusätzliches Feature entwickelt werden, 
um die Benutzerfreundlichkeit zu erhöhen und den Gästen eine bequemere Möglichkeit 
zu bieten, ihre Musikwünsche abzugeben und zu liken.


---

# Grundprinzip
- Es gibt **pro Party genau eine Warteschlange** (Queue)
- Eine Party nutzt **genau einen Musik-Anbieter**: z.B. **Spotify** oder **YouTube**
  - Dies kann beim erstellen der Party durch den Gastgeber in der App ausgewählt werden.
- Gäste sind **anonym**
  - Beim "beitreten" der muss kein name oder ähnliches angegeben werden.
  - Dies wird durch das Backend gemanaged, das jedem Gast eine zufällige ID zuweist.
- Gäste geben Wünsche ab und **liken** Songs. Die Songs mit den meisten Likes laufen zuerst.

---

# Benutzerrollen

## Gast
- Kann über einen QR-Code oder 5 Ziffer-Code der Party beitreten.
- Kann Songs suchen (abhängig vom Anbieter der Party).
- Kann Songs zur Warteschlange hinzufügen (mit Limit).
- Kann Songs liken und das Like auch wieder entfernen (Toggle).

## Gastgeber 
- Erstellt eine Party und wählt den Anbieter (Spotify/YouTube).
- Meldet sich beim Anbieter an (Login gilt **nur für diese Party**).
- Steuert die Wiedergabe: Pause/Resume, Skip, Songs entfernen, Blacklist pflegen, Party beenden.

## Monitor/TV 
- Zeigt die Party und spielt die Musik **im Browser auf dem Monitor/TV** ab.
- Zeigt dauerhaft QR-Code, aktuellen Song, Fortschritt (Zeitbalken) und die Warteschlange.
- Hat **keine Host-Bedienelemente**.
- Verbindet sich nach einem Reload automatisch wieder mit der Party (**ohne erneute PIN-Eingabe**).

> [!IMPORTANT]
> Der Monitor/TV "existiert" nicht in der Swift App. 
> <br>
> <br>
> Damit der User trotzdem die Möglichkeit hat,
> die gleichen Informationen wie am Monitor/TY am Smartphone sehen kann, 
> soll die Swift App die gleichen Informationen anzeigen, wie sie auch am Monitor/TV zu sehen sind.

---

# Ablauf

## 1) Party erstellen (Gastgeber)
1. Host öffnet die Swift-App.
2. Klickt „Party erstellen“.
3. Wählt **Spotify** oder **YouTube** (oder andere Anbieter, den wir unterstützen wollen).
4. Host loggt sich beim gewählten Anbieter ein (OAuth) – **nur für diese Party**.
5. Das System erstellt:
    - eine Party-ID,
    - einen **neuen PIN** für diese Party,
    - eine Join-URL (für den QR-Code).
6. Host sieht PIN, QR/Join-Link und die Host-Steuerung.

## 2) Party auf dem Monitor anzeigen
1. Monitor öffnet `musicvoting.com`.
2. Klickt „Party anzeigen“.
3. PIN eingeben.
4. Dashboard ist ab jetzt mit der Party verbunden, startet Wiedergabe und zeigt alles live an.
5. Nach einem Reload verbindet sich das Dashboard automatisch wieder (PIN wird nicht erneut abgefragt).

## 3) Gäste beitreten
### Version 1: QR-Code
1. Gäste scannen den QR-Code am Monitor.
2. Sie landen in der Mobile-App (wenn die App nicht installiert ist, 
werden sie auf die Web-App weitergeleitet).
3. Sie können Songs suchen, Songs hinzufügen und liken.

### Version 1: 5 Ziffern-Code
1. Gäste öffnen die Swift-App.
2. Klicken „Party beitreten“.
3. Geben den 5 Ziffern-Code ein.
3. Sie können Songs suchen, Songs hinzufügen und liken.

---

# Regeln der Warteschlange

## Sortierung (wichtig)
Die Warteschlange wird automatisch sortiert:
1. **mehr Likes zuerst**
2. bei gleicher Like-Zahl: **ältester Wunsch zuerst**

## Keine Duplikate
- Ein Song darf pro Party nur **einmal** in der Warteschlange vorkommen.
- Wenn ein Gast einen Song hinzufügen will, der schon in der Warteschlange ist, bekommt er die Meldung:
    - „Song ist schon in der Warteschlange.“
    - und ob man den bestehenden Song liken möchte (ja/nein).

## Limit für Musikwünsche
- Pro Gast sind maximal **10 hinzugefügte Songs pro Minute** erlaubt.
- Wird das Limit überschritten, erscheint eine Meldung wie:
    - „Zu viele Anfragen — bitte kurz warten.“

## Likes (Toggle)
- Pro Gast **maximal ein Like pro Song**.
- Gast kann Like wieder entfernen (Toggle).
- Like-Zahlen aktualisieren sich live auf allen Geräten.

---

# Blacklist (pro Party)
- Der Host kann pro Party eine **Blacklist** pflegen.
- Beim Hinzufügen eines Songs wird geprüft, ob ein Blacklist-Wort als **Teilstring** im Songtitel oder Künstlernamen vorkommt.
- Wenn geblockt, sieht der Gast:
    - „Nicht erlaubt.“

---

# Wiedergabe (Playback)
- Die Musik läuft **auf dem Monitor/TV** (im Browser).
- Wenn ein Song zu Ende ist oder der Host skippt:
    - wird der Song **komplett aus der Warteschlange entfernt** (keine History/Zuletzt gespielt).
    - das System wählt den nächsten Song anhand der Sortierung.
- Wenn die Warteschlange leer ist:
    - zeigt das Dashboard „Warteschlange ist leer“
    - Wiedergabe von random Songs aus den Top-Charts des Anbieters (Spotify/YouTube).

### YouTube Werbung
- Ziel ist „keine Werbung“, aber es gilt **Best effort**:
    - Es gibt **keine Garantie**, dass wirklich nie Werbung auftaucht.

---

# Suche & Top-Charts
- Gäste fügen Songs **nur über Suche** hinzu (kein Link-Paste).
- Wenn das Suchfeld leer ist, werden **Top Charts (10)** angezeigt:
    - dynamisch vom jeweiligen Anbieter (Spotify/YouTube),
    - **nicht landabhängig**.

---

# Gast-Anzeige
Dauerhaft sichtbar:
- QR-Code zum Beitreten
- aktueller Song:
    - Cover
    - Titel
    - Künstler
    - **animierter Zeitbalken**
    - Zeit: `mm:ss / mm:ss`
- Warteschlange:
    - Cover, Titel, Künstler, Like-Zahl pro Eintrag
    - sortiert nach den Regeln oben
- **Keine** Anzeige, wer den Song gewünscht hat.

---

# Stabilität & Reconnect
- Alle Clients (Host, Gäste, Dashboard) sollen bei Verbindungsproblemen automatisch reconnecten.
- Nach Reconnect wird der aktuelle Stand neu geladen (Party-Status, Queue, aktuelle Wiedergabe).

---

# Party-Ende
- Die Party läuft, bis der Host sie beendet.
- Beim Beenden:
    - Party wird geschlossen,
    - Warteschlange wird geleert,
    - Provider-Tokens werden gelöscht,
    - Clients sehen „Party beendet“ und ob sie einer neunen Party beitreten möchten.

---

# Akzeptanzkriterien (Checkliste)
1. Gäste können per QR-Code oder 4 Ziffern-Code beitreten und sehen Updates live.
2. Pro Gast maximal 10 Songs pro Minute; darüber wird geblockt.
3. Duplikate werden nicht zugelassen.
4. Blacklist blockiert Songs und zeigt „Nicht erlaubt“.
5. Likes sind togglebar und aktualisieren live.
6. Sortierung ist immer: Likes desc, dann ältester zuerst.
7. Nur Host kann entfernen/pause/skip/end.
8. Dashboard spielt auf dem Monitor und zeigt animierten Fortschritt.
9. Dashboard reconnectet nach Reload ohne PIN.
10. Bei Netzproblemen reconnecten Clients automatisch und synchronisieren sich.

---
# An dieser App arbeiten:

{{< author name="simone" >}}
{{< author name="miriam" >}}

