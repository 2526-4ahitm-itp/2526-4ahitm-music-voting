---
title: How To Run
description: How to run the application
---


## Voraussetzungen

1. in application.properties die Spotify Daten eintragen
Spotify Client ID, Client Secret und Redirect URI müssen in der Datei `musicvoting/backend/src/main/resources/application.properties` eingetragen werden.

(Für die Daten muss sich ein Spotify Developer Konto angelegt werden: https://developer.spotify.com/dashboard/applications)

Die Daten stehen im Whats App Gruppenchat zur Verfügung.


```properties

## Starten des Backends 

1. Navigieren Sie zum Backend-Verzeichnis:
   ```bash
   cd musicvoting/backend
   ```

2. Quarkus starten:
   ```bash
   ./mvnw quarkus:dev
   ```



### Starten der Anwendung


1. Navigieren Sie zum Backend-Verzeichnis:
   ```bash
   cd musicvoting/frontend
   ```


2. Installieren Sie die Abhängigkeiten:
   ```bash
   npm install
   ```

3. Starten Sie die Anwendung:
   ```bash
   ng serve --host 0.0.0.0 --port 4200
   ```

Startet den Angular-Entwicklungsserver auf Port 4200 und bindet ihn an alle Netzwerkschnittstellen (0.0.0.0), sodass die Anwendung nicht nur über localhost, sondern auch von anderen Geräten oder Containern im selben Netzwerk erreichbar ist.
Der Befehl ist ausschließlich für Entwicklungszwecke gedacht, um die keine Probleme bei der redirect URI zu bekommen.



