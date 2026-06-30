# Platzhalter & Deployment — MusicVoting

Dieses Verzeichnis (`deploy/`) enthält ein vollständiges Docker-Compose-Setup mit
Reverse-Proxy (Caddy), das die App von außen über **HTTPS** erreichbar macht.

Ihr müsst **nur eine Datei** bearbeiten: `.env`.
Alle anderen Dateien lesen ihre Werte daraus — es ist nirgends ein Domainname
fest eingetragen.

---

## 1. Platzhalter — alle in `.env`

Kopiert zuerst die Vorlage und tragt eure Werte ein:

```bash
cd deploy
cp .env.example .env
nano .env        # Werte ersetzen
```

| Platzhalter in `.env` | Was eintragen | Pflicht | Beispiel |
|---|---|---|---|
| `DOMAIN` | Eure (Sub-)Domain, **ohne** `https://` und ohne `/` am Ende | ✅ | `party.htl-leonding.ac.at` |
| `ACME_EMAIL` | E-Mail fürs TLS-Zertifikat (Let's Encrypt) | ✅ | `team@example.com` |
| `SPOTIFY_CLIENT_ID` | Client ID aus dem Spotify Developer Dashboard | ✅ | `c0d3a084...` |
| `SPOTIFY_CLIENT_SECRET` | Client Secret aus demselben Dashboard | ✅ | `0e836c8c...` |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | DB-Zugang, kann so bleiben | – | `musicvoting` |
| `SPOTIFY_MARKET` | ISO-Land für „ähnliche Songs" | – | `AT` |
| `SPOTIFY_TOPCHARTS_PLAYLIST_ID` | Öffentliche, nutzereigene Playlist als Fallback (leer = aus) | – | *(leer)* |

> **`DOMAIN` ist der einzige Domainname-Platzhalter.** Er wird daraus automatisch
> abgeleitet an folgende Stellen verteilt — die müsst ihr **nicht** einzeln anfassen:

| Wo `DOMAIN` landet | Datei | Ergebnis (bei `party.example.com`) |
|---|---|---|
| Caddy-Site-Adresse (TLS) | `Caddyfile` → `{$DOMAIN}` | Zertifikat für `party.example.com` |
| QR-Code-Join-URL | `docker-compose.yml` → `MUSICVOTING_JOIN_BASE_URL` | `https://party.example.com/join` |
| Spotify OAuth Callback | `docker-compose.yml` → `SPOTIFY_REDIRECT_URI` | `https://party.example.com/api/spotify/callback` |
| Spotify Web-Redirect (Playlist-Auswahl) | `docker-compose.yml` → `SPOTIFY_WEB_REDIRECT_URI` | `https://party.example.com/select-playlist` |
| Öffentlicher Host fürs Backend | `docker-compose.yml` → `APP_PUBLIC_HOST` | `party.example.com` |

`ACME_EMAIL` wird in `Caddyfile` (`tls {$ACME_EMAIL}`) verwendet.

---

## 2. Voraussetzungen am Server

1. **Docker + Docker Compose** installiert.
2. **DNS:** Ein A-Record (bzw. AAAA für IPv6) für eure `DOMAIN`, der auf die
   öffentliche IP des Servers zeigt. Muss aufgelöst werden, **bevor** ihr startet —
   sonst kann Caddy kein Zertifikat holen.
3. **Ports 80 und 443** am Server von außen offen (Firewall / Security-Group).
   Port 80 wird für die Let's-Encrypt-Challenge gebraucht, 443 ist das eigentliche HTTPS.

---

## 3. Spotify Developer Dashboard

Im [Spotify Dashboard](https://developer.spotify.com/dashboard) eurer App unter
**Settings → Redirect URIs** **exakt** diese beiden Einträge hinzufügen
(`DOMAIN` ersetzen):

```
https://DOMAIN/api/spotify/callback
https://DOMAIN/select-playlist
```

(Für die iOS-App zusätzlich `musicvotingapp://callback`.)

Ohne passende Redirect-URIs schlägt der Spotify-Login fehl.

---

## 4. Starten

```bash
cd deploy
docker compose up -d --build
```

- `--build` baut Backend (Quarkus) und Frontend (Angular) aus dem Repo —
  es werden **keine** privaten ghcr-Images gebraucht, kein `docker login`.
- Beim ersten Start initialisiert Postgres das Schema aus `musicvoting/backend/setup.sql`.
- Caddy holt automatisch das TLS-Zertifikat (kann 10–30 s dauern).

Danach erreichbar unter: `https://DOMAIN`

Logs / Status:

```bash
docker compose ps
docker compose logs -f caddy      # TLS-Probleme hier sichtbar
docker compose logs -f backend
```

Stoppen / aktualisieren:

```bash
docker compose down               # stoppt alles (Daten bleiben in Volumes)
git pull && docker compose up -d --build   # Update nach Code-Änderungen
```

---

## 5. Hinweise

- **Zertifikate** liegen im Volume `caddy_data` — nicht löschen, sonst wird bei
  jedem Neustart ein neues Zertifikat geholt (Let's-Encrypt-Rate-Limits!).
- **DB-Schema:** `setup.sql` läuft nur beim ersten Start (leeres `postgres_data`-Volume).
  Schema-Änderungen → Volume zurücksetzen: `docker compose down -v` (⚠ löscht alle Daten).
- **Lokaler Test ohne echte Domain:** Caddy braucht für ein echtes Zertifikat eine
  öffentlich auflösbare Domain. Für reine Funktionstests ohne HTTPS lieber das
  bestehende `compose/`-Setup verwenden.
