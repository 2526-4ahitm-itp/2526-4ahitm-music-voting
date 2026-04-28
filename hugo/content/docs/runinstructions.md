---
title: How To Run
description: How to run the application
tags: [ Developer ]
---

## Voraussetzungen

1. in application.properties die Spotify Daten eintragen
   Spotify Client ID, Client Secret und Redirect URI müssen in der Datei
   `musicvoting/backend/src/main/resources/application.properties` eingetragen werden.

(Für die Daten muss sich ein Spotify Developer Konto angelegt
werden: https://developer.spotify.com/dashboard/applications)

Die Daten stehen im Whats App Gruppenchat zur Verfügung.

```properties
app.public.host=127.0.0.1
## Wenn die Swift App per XCode seperat am Handy läuft
## Hotspot am Handy aktivieren und die IP Adresse des Handys hier eintragen
##app.public.host=172.20.10.2
app.public.port=8080
app.web.port=4200
spotify.client.id=##Client ID hier eintragen
spotify.client.secret=##Client Secret hier eintragen
spotify.redirect.uri=http://${app.public.host}:${app.public.port}/api/spotify/callback
spotify.web.redirect.uri=http://${app.public.host}:${app.web.port}/dashboard
spotify.ios.redirect.uri=musicvotingapp://callback
quarkus.http.host=0.0.0.0
quarkus.http.port=${app.public.port}
quarkus.datasource.db-kind=postgresql
quarkus.datasource.username=musicvoting
quarkus.datasource.password=musicvoting
quarkus.datasource.jdbc.url=jdbc:postgresql://localhost:5432/musicvoting
quarkus.hibernate-orm.database.generation=none
musicvoting.join.base-url=http://localhost:4200/join

```

## Starten der ganzen Anwendung

1. Navigieren Sie zum Skript-Verzeichnis:
   ```bash
   cd script/
   ```

2. Die ganze Anwendung (DB, Backend, Frontend) starten:
   ```bash
   ./start.sh
   ```

## Einzelnd starten

### Datenbank

1. Navigieren Sie zum MusicVoting-Verzeichnis:
    ```bash
    cd musicvoting
    ```
    2. Starten Sie die Datenbank mit Docker:
        ```bash
        docker compose up -d
        ```

### Backend

1. Navigieren Sie zum Backend-Verzeichnis:
   ```bash
   cd musicvoting/backend
   ```
2. Starten Sie das Backend mit Maven:
   ```bash
   mvn quarkus:dev
   ```

### Frontend

1. Navigieren Sie zum Frontend-Verzeichnis:
   ```bash
   cd musicvoting/frontend
   ```
2. Installieren Sie die Abhängigkeiten:
   ```bash
   npm install
   ```
3. Starten Sie das Frontend:
   ```bash
   npm start
   ```