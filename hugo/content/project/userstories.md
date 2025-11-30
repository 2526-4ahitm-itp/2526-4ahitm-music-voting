---
title: Userstories
date: 2025-11-30
lastmod: 2025-11-30
author: miriam
tags: [user stories]
---

# User Stories 

## 1. Musik suchen

**Als** Gast einer Feier
**möchte ich** Lieder suchen können,
**um** Musik vorzuschlagen.

* **Rolle:** Gast
* **Priorität:** 0 (Muss)

### Akzeptanzkriterien:

* **Szenario:** Gast sucht ein Lied
    * **Gegeben:** Der Gast befindet sich auf der Hauptseite der App.
    * **Wenn:** Der Gast einen Suchbegriff (Titel oder Interpret) in das Suchfeld eingibt.
    * **Dann:** Die App zeigt eine Liste relevanter Ergebnisse von Spotify an.
    * **Und:** Die Ergebnisse enthalten mindestens Titel, Interpret und Album-Cover (falls vorhanden).

---

## 2. Musik zur Warteschlange hinzufügen

**Als** Gast
**möchte ich** Musik zur Warteschlange hinzufügen,
**um** meinen Musikgeschmack einzubringen.

* **Rolle:** Gast
* **Priorität:** 0 (Muss)

### Akzeptanzkriterien:

* **Szenario:** Lied zur Warteschlange hinzufügen
    * **Gegeben:** Der Gast hat ein Lied in den Suchergebnissen gefunden.
    * **Wenn:** Der Gast auf den "Hinzufügen"-Button des Liedes klickt.
    * **Dann:** Das Lied wird an das Ende der Warteschlange (Queue) angefügt.
    * **Und:** Der Gast erhält eine visuelle Bestätigung, dass das Lied hinzugefügt wurde.
    * **Aber:** Das Hinzufügen ist nicht möglich, wenn das Lied bereits in der Warteschlange oder auf der Blacklist ist.

---

## 3. QR-Code

**Als** Gast
**möchte ich** per QR-Code auf die Website kommen,
**um** die Musik einfach, ohne eine App herunterladen zu müssen, mitbestimmen zu können.

* **Rolle:** Gast
* **Priorität:** 2 (Sollte)

### Akzeptanzkriterien:

* **Szenario:** Zugriff per QR-Code
    * **Gegeben:** Der Gastgeber hat den QR-Code generiert und angezeigt.
    * **Wenn:** Ein Gast den QR-Code mit seinem Smartphone scannt.
    * **Dann:** Die mobile Browser-Version der Musik-App wird ohne Umwege geöffnet.
    * **Und:** Die URL der App ist im QR-Code korrekt hinterlegt.

---

## 4. Lieder über Spotify abspielen

**Als** Gastgeber
**möchte ich** Lieder über mein Spotify Konto abspielen,
**um** eine große Auswahl an Musik zu haben und die einfachste Kompatibilität zu gewährleisten.

* **Rolle:** Gastgeber
* **Priorität:** 0 (Muss)

### Akzeptanzkriterien:

* **Szenario:** Spotify-Integration
    * **Gegeben:** Der Gastgeber ist in der App und mit seinem Spotify-Konto angemeldet.
    * **Wenn:** Das erste Lied in der Warteschlange an der Reihe ist.
    * **Dann:** Die Wiedergabe startet automatisch über das verknüpfte Spotify-Konto des Gastgebers.
    * **Und:** Der aktuelle Wiedergabestatus (aktuelles Lied) wird in der App korrekt angezeigt.

---

## 5. Lieder blacklisten

**Als** Gastgeber
**möchte ich** bestimmte Lieder blacklisten,
**um** nur zur Party passende Lieder zu erlauben.

* **Rolle:** Gastgeber
* **Priorität:** 2 (Sollte)

### Akzeptanzkriterien:

* **Szenario:** Lied blacklisten
    * **Gegeben:** Der Gastgeber sieht ein unpassendes Lied in der Suche oder der Warteschlange.
    * **Wenn:** Der Gastgeber das Lied zur Blacklist hinzufügt.
    * **Dann:** Das Lied wird aus der Warteschlange entfernt (falls vorhanden).
    * **Und:** Das Lied erscheint nicht mehr in den Suchergebnissen für Gäste.
    * **Und:** Blackgelistete Lieder können nur vom Gastgeber wieder entfernt werden.

---

## 6. Lieder überspringen

**Als** Gastgeber
**möchte ich** Lieder überspringen können,
**um** unpassende oder langweilige Lieder nicht länger abzuspielen.

* **Rolle:** Gastgeber
* **Priorität:** 1 (Sollte/Muss)

### Akzeptanzkriterien:

* **Szenario:** Aktuelles Lied überspringen
    * **Gegeben:** Ein Lied wird gerade abgespielt und der Gastgeber ist angemeldet.
    * **Wenn:** Der Gastgeber den "Überspringen"-Button betätigt.
    * **Dann:** Die aktuelle Wiedergabe stoppt sofort und das nächste Lied in der Warteschlange beginnt zu spielen.
    * **Und:** Der "Überspringen"-Button ist nur für den Gastgeber sichtbar und aktivierbar.

---

## 7. Musik voten

**Als** Gast
**möchte ich** für Lieder voten können,
**um** sie in der Warteschlange höher zu ranken.

* **Rolle:** Gast
* **Priorität:** 2 (Sollte)

### Akzeptanzkriterien:

* **Szenario:** Für ein Lied stimmen
    * **Gegeben:** Der Gast sieht die Warteschlange mit den vorgeschlagenen Liedern.
    * **Wenn:** Der Gast auf den "Vote"-Button (Daumen hoch) eines Liedes klickt.
    * **Dann:** Der Zähler für dieses Lied erhöht sich um eins.
    * **Und:** Das Lied wird in der Warteschlange neu sortiert (Lieder mit mehr Votes rücken nach oben).
    * **Und:** Jeder Gast kann pro Lied nur einmal voten.

---

## 8. Default Playlist

**Als** Gastgeber
**möchte ich** eine vorgefertigte Playlist aus Spotify einfügen können,
**um** diese abzuspielen, falls in der Warteschlange keine weiteren Lieder mehr sind.

* **Rolle:** Gastgeber
* **Priorität:** 1 (Sollte/Muss)

### Akzeptanzkriterien:

* **Szenario:** Fallback-Playlist einstellen
    * **Gegeben:** Der Gastgeber ist angemeldet.
    * **Wenn:** Der Gastgeber den Link einer Spotify-Playlist in den Einstellungen hinterlegt.
    * **Dann:** Die App spielt automatisch Lieder aus dieser Playlist ab, sobald die manuelle Warteschlange leer ist.
    * **Und:** Die Wiedergabe wechselt zurück zur Warteschlange, sobald neue Lieder hinzugefügt werden.

---

## 9. Login

**Als** Gastgeber
**möchte ich** mich bei meinem Spotify Account anmelden,
**um** von dort die Lieder abspielen zu lassen.

* **Rolle:** Gastgeber
* **Priorität:** 0 (Muss)

### Akzeptanzkriterien:

* **Szenario:** Spotify-Anmeldung
    * **Gegeben:** Der Gastgeber möchte die App das erste Mal nutzen.
    * **Wenn:** Der Gastgeber auf den "Mit Spotify anmelden"-Button klickt.
    * **Dann:** Der Gastgeber wird zur offiziellen Spotify-Login-Seite weitergeleitet.
    * **Und:** Nach erfolgreicher Anmeldung wird der Gastgeber zur App zurückgeleitet und sein Login-Status als "angemeldet" angezeigt.
    * **Und:** Die App speichert das notwendige Zugangs-Token, um die Musikwiedergabe steuern zu können.