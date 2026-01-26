---
title: How To Develop
description: How to further develop the application
showDate: true
authors:
  - simone
---


## Voraussetzungen

1. Ein premium Spotify Account 
    * (wird benötigt, um die Spotify API nutzen zu können)
2. Spotify Developer Konto

## Algemeine Entwicklungshinweise

### Nutzung der Spotify API mit einem Developer Account
Mit einem Developer Account, ist die nutzung der Aplikation nur für 25 vorgemerkte Spotify Nutzer möglich.
<br>
Diese User müssen mit der Email am Developer Dashboard in einer Liste hinzugefügt werden.


## Erstellen eines Spotify Developer Kontos
Wenn noch kein Spotify Developer Konto vorhanden ist, folgen Sie diesen Schritten, um eines zu erstellen:

1. Gehen Sie zu [Spotify for Developers](https://developer.spotify.com/dashboard/applications).
2. Melden Sie sich mit Ihrem Spotify-Konto an oder erstellen Sie ein neues Konto.
3. Klicken Sie auf "Create an App".
4. Geben Sie einen Namen und eine Beschreibung für Ihre Anwendung ein.
5. Akzeptieren Sie die Nutzungsbedingungen und klicken Sie auf "Create".

## Aplikation mit neuem Spotify Developer Konto verbinden
1. Navigieren Sie zu Ihrem Spotify Developer Dashboard.
2. Wählen Sie die Anwendung aus, die Sie mit MusicVoting verbinden möchten.
3. Notieren Sie sich die **Client ID** und **Client Secret**.
4. Fügen Sie die Redirect URI `http://127.0.0.1:8080/api/spotify/callback` in die Liste der Redirect URIs ein.
5. Speichern Sie die Änderungen.
6. Tragen Sie die **Client ID**, **Client Secret** und **Redirect URI** in der Datei `musicvoting/backend/src/main/resources/application.properties` ein.

```properties
spotify.client.id=your_client_id
spotify.client.secret=your_client_secret
spotify.redirect.uri=http://127.0.0.1:8080/api/spotify/callback
```         
(Ersetzen Sie `your_client_id` und `your_client_secret` durch die tatsächlichen Werte aus Ihrem Spotify Developer Konto.)

## Veröffentlichen der Applikation
Um die Anwendung zu veröffentlichen, muss ein Antrag bei Spotify gestellt werden, um die Nutzung der Spotify API für die Anwendung zu genehmigen.
Danach ist die Anwendung für alle Spotify Nutzer zugänglich. (Nicht nur für 25 vorgemerkte Nutzer)


