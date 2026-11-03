---
title: "Recherche: Musikanbieter"
description: Welche Musikanbieter neben Spotify kommen für MusicVoting in Frage? Pro, Contra und Ähnlichkeit zu Spotify
tags: [research, future-features]
authors:
  - simone
date: 2026-10-13
showDate: true
weight: 10
---

> Stand: 13.10.2026 · Autorin: Simone (mit Claude)
> Zweck: Diskussionsgrundlage **vor** der Umsetzung des Features „Musikanbieter wechseln".
> Es ist noch keine Entscheidung getroffen und kein OpenSpec-Change angelegt.

## 1. Wie funktioniert es heute mit Spotify?

Damit die Anbieter vergleichbar sind, hier kurz, was wir von Spotify tatsächlich nutzen
(`SpotifyMusicProvider` hinter dem `MusicProvider`-Interface, Auswahl über `MusicProviderFactory`):

| Baustein | Heute mit Spotify |
|---|---|
| **Login** | Host meldet sich per OAuth an, Tokens sind party-scoped, Refresh-Token in der DB |
| **Suche** | Backend ruft `/v1/search` mit dem Host-Token auf |
| **Wiedergabe** | Player-Seite (TV) lädt das **Web Playback SDK** und wird zu einem Spotify-Gerät; das **Backend** steuert per Web API (`/me/player/play`, `pause`, `position_ms`) |
| **Queue** | Liegt in unserer DB (Quelle der Wahrheit), nicht bei Spotify |
| **Auto-Refill** | Standard-Playlist → Künstler-Top-Tracks → Top-Charts-Playlist → Suche |
| **Voraussetzung** | Host braucht **Spotify Premium** |

Für einen anderen Anbieter brauchen wir also mindestens: **Suche**, **Song-Metadaten (Titel, Cover,
Dauer)**, **Abspielen auf der Player-Seite mit Pause/Resume/Position** und ein **Signal am Songende**.
Login und Auto-Refill sind je nach Anbieter optional.

**Wichtigster Architektur-Unterschied:** Spotify ist der einzige Anbieter, bei dem das **Backend**
die Wiedergabe fernsteuern kann. Bei allen anderen läuft die Steuerung im Browser der Player-Seite.
Das Backend würde dann per SSE ein Kommando schicken (z. B. `track-changed`) und der Player spielt
selbst. Das wäre ein Umbau von `play`/`pause`/`resume` im `MusicProvider`-Interface.

## 2. Überblick

Alle Anbieter auf einen Blick. Spotify steht als Vergleich in der ersten Zeile.

| Anbieter | Nutzbar für uns? | Konto/Abo beim Host | Kosten für uns | Mainstream-Hits | Wiedergabe | Ähnlichkeit zu Spotify | Aufwand (grob) | Größter Haken |
|---|---|---|---|---|---|---|---|---|
| **Spotify** (heute) | ✅ ja | Premium | keine (App-Owner braucht Premium) | ✅ | Web Playback SDK, Steuerung durchs Backend | – | – | max. 5 Hosts im Development Mode |
| **YouTube** | ✅ ja | keins (Premium optional gegen Werbung) | keine | ✅ | IFrame Player im Browser, Video sichtbar | mittel | mittel | Such-Quota (~100 Suchen/Tag) |
| **Apple Music** | ✅ ja, mit Kosten | Apple-Music-Abo | 99 USD/Jahr (Developer Program) | ✅ | MusicKit JS im Browser | hoch | mittel–hoch | Kosten, DRM-Probleme in Chromium |
| **TIDAL** | ⚠️ unsicher | TIDAL-Abo | keine | ✅ | Player-SDK im Browser | sehr hoch (in der Theorie) | mittel, falls volle Wiedergabe geht | evtl. nur 30-s-Vorschauen |
| **SoundCloud** | ⚠️ unsicher | keins für Widget | evtl. Artist-Pro-Konto | teilweise | Widget im Browser | niedrig–mittel | mittel | App-Registrierung unklar |
| **Audius** | ✅ ja (Fallback) | keins | keine | ❌ | normales `<audio>` | mittel | niedrig–mittel | kaum bekannte Songs |
| **Jamendo** | ✅ ja (Fallback) | keins | keine | ❌ | normales `<audio>` | mittel | niedrig–mittel | kaum bekannte Songs, Namensnennung Pflicht |
| **Mixcloud** | ⚠️ passt nicht | keins | keine | – (nur DJ-Mixes) | Widget im Browser | niedrig | – | keine einzelnen Songs |
| **Deezer** | ⚠️ eher nein | Deezer Premium | keine | ✅ | JS-SDK im Browser (braucht App-ID) | hoch (wenn SDK geht) | mittel | SDK von Deezer als veraltet markiert, App-Erstellung vermutlich gesperrt, nur private Nutzung erlaubt |
| **Amazon Music** | ❌ nein | – | – | ✅ | – | – | – | geschlossene Beta, keine Wiedergabe |
| **YouTube Music** | ❌ nein | – | – | ✅ | – | – | – | keine offizielle API |
| **Qobuz** | ❌ nein | – | – | ✅ | – | – | – | API nur für Geschäftspartner |
| **Napster** | ❌ nein | – | – | ✅ | – | – | – | keine aktuelle API |

Die Aufwände sind Bauchschätzungen für unser Team, keine Zeitangaben. Regionale Dienste (Anghami,
JioSaavn, Boomplay, Yandex Music, NetEase, QQ Music) sind nicht enthalten, siehe Kapitel 3.

## 3. Anbieter im Detail

### YouTube (IFrame Player API + YouTube Data API v3)

**So würde es funktionieren:** Suche über die YouTube Data API (`search.list`) mit einem API-Key
im Backend. Die Player-Seite bettet den **IFrame Player** ein und steuert ihn per JavaScript
(`loadVideoById`, `pauseVideo`, `seekTo`, Event `onStateChange` → Songende).
`ProviderKind.YOUTUBE` gibt es im Code schon, die `MusicProviderFactory` wirft aber noch
`UnsupportedOperationException`.

**Ähnlichkeit zu Spotify:** mittel. Suche und Metadaten sind ähnlich, die Wiedergabe-Steuerung
wandert aber vom Backend in den Browser (siehe oben).

**Pro**
- Kein Abo und kein Login für den Host nötig, die Party ist sofort startklar
- Riesiger Katalog inkl. Remixes, Live-Versionen und Covers
- Videos laufen sowieso am TV, das passt gut zum Party-Setting

**Contra**
- **Quota:** Standard sind 10.000 Einheiten pro Tag, eine Suche kostet 100. Das sind nur **ca. 100
  Suchen pro Tag** für alle Partys zusammen. Mehr gibt es nur auf Antrag bei Google.
- Werbung kann zwischen und in Videos erscheinen (außer der Host hat Premium, siehe unten)
- Manche offiziellen Musikvideos erlauben kein Embedding und müssen beim Suchen herausgefiltert werden
- Die Nutzungsbedingungen verbieten, Ton und Video zu trennen: **nur mit sichtbarem Video**,
  kein reiner Audio-Player und keine Hintergrund-Wiedergabe in der iOS-App
- Suchergebnisse sind „unsauber" (Lyric-Videos, Reaktionen, …), wir bräuchten Filter

**Was bringt YouTube Premium des Hosts?**
- **Keine Werbung: wahrscheinlich ja.** Laut YouTube-Hilfe gilt Premium auch für eingebettete
  Videos auf anderen Websites, wenn man im Browser bei YouTube angemeldet ist und die
  YouTube-Cookies nicht blockiert. Ist der Browser der Player-Seite (TV) mit dem Premium-Konto
  angemeldet, sollte der eingebettete Player werbefrei laufen. Ausdrücklich für fremde Websites
  bestätigt ist das nicht, deshalb **vorher testen**.
  - Nur der Host bräuchte Premium, weil nur am TV abgespielt wird. Gäste nicht.
  - Browser, die Cookies fremder Seiten standardmäßig blockieren (z. B. Safari, Firefox im strengen
    Modus), zeigen trotzdem Werbung. Dann muss für youtube.com eine Ausnahme gesetzt werden.
  - Werbung, die Creator selbst ins Video einbauen (z. B. gesprochene Sponsor-Teile), bleibt.
- **Nur Musik ohne Video: nein.** Reine Audio- und Hintergrund-Wiedergabe gibt es mit Premium nur in
  YouTubes eigenen Apps (YouTube, YouTube Music). Für unsere App gelten die API-Bedingungen, der
  Player muss also sichtbar bleiben.
- **Praktischer Ausweg:** Bei der Suche die offiziellen „Topic"- bzw. „Official Audio"-Uploads
  bevorzugen. Das sind Songs ohne Musikvideo, nur mit dem Albumcover als Standbild. Am TV wirkt
  das wie ein normaler Musik-Player und ist trotzdem erlaubt (Details im nächsten Abschnitt).

**Kann man das Video verstecken und nur das Cover zeigen?** (Stand 03.11.2026)

Kurz: **Das Video verstecken: nein. Dafür sorgen, dass das „Video" nur das Cover ist: ja.**

Was die YouTube-Regeln verbieten:
- Ton und Bild trennen oder nur den Ton nutzen
  ([Developer Policies III.I.7](https://developers.google.com/youtube/terms/developer-policies))
- Wiedergabe aus einem Player, der auf der Seite nicht sichtbar ist (III.I.9, „background player")
- Teile des Players blockieren oder verändern (III.I.6)
- Overlays, Rahmen oder andere Elemente **vor** dem Player, auch nur über einem Teil davon
  ([Required Minimum Functionality](https://developers.google.com/youtube/terms/required-minimum-functionality))
- Player kleiner als **200 × 200 px** (empfohlen bei 16:9: mindestens 480 × 270 px); sind die
  Steuerelemente eingeblendet, müssen sie vollständig sichtbar sein

Damit fallen alle typischen Tricks weg: `display: none`, `opacity: 0`, 1×1-px-Player, Player
außerhalb des Bildschirms, ein Cover-Bild per CSS **über** den Player legen.

Warum das für uns nicht nur Theorie ist: Mehr Such-Quota als die ~100 Suchen pro Tag gibt es nur
nach einem **Compliance-Audit** durch Google
([Quota and Compliance Audits](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits)).
Ein versteckter Player würde genau dieses Audit nicht bestehen; außerdem kann Google den API-Key
sperren.

Was erlaubt ist und praktisch fast dasselbe Ergebnis bringt:
1. **„Topic"-Uploads (Art Tracks) bevorzugen.** YouTube erzeugt für fast jeden Song bei einem
   Label automatisch ein Video auf einem Kanal „Künstlername - Topic". Das Bild ist **nur das
   Albumcover**, der Ton ist die Studioversion. Der Player zeigt also das Cover, ganz ohne Trick.
   - Erkennbar am Kanalnamen (`snippet.channelTitle` endet auf `" - Topic"`) und an der
     Beschreibung („Provided to YouTube by …", „Auto-generated by YouTube.").
   - Einen eigenen Suchfilter „nur Topic" hat die Data API nicht. Vorschlag: mit
     `type=video`, `videoCategoryId=10` (Musik) und `videoEmbeddable=true` suchen und dann im
     Backend Topic-Treffer nach oben sortieren, danach „Official Audio", danach den Rest.
2. **Layout der Player-Seite:** Player sichtbar und unverdeckt (z. B. 480 × 270 px), daneben groß
   das Cover aus `queue_entry`, Titel, Künstler und die Warteschlange. *Neben* dem Player ist
   erlaubt, nur *darüber* nicht.
3. **Steuerelemente ausblenden** (`controls=0`) ist erlaubt, der Player muss aber sichtbar bleiben.
4. **Fallback:** Gibt es keine Topic- oder Audio-Version, läuft das Musikvideo im kleinen Player,
   die Seite sieht trotzdem gleich aus.

Offen, im YouTube-Spike prüfen: wie oft es zu Mainstream-Hits eine einbettbare Topic-Version gibt
und ob die Suche sie zuverlässig findet.

### Apple Music (MusicKit on the Web v3 + Apple Music API)

**So würde es funktionieren:** Das Backend erzeugt einen **Developer Token** (JWT, signiert mit
einem Schlüssel aus dem Apple Developer Program). Damit sind Suche und Katalog ohne Nutzer-Login
möglich. Die Player-Seite lädt **MusicKit JS**, der Host autorisiert sich dort mit seiner Apple-ID
und MusicKit spielt die Songs im Browser ab.

**Ähnlichkeit zu Spotify:** hoch. Das Konzept ist fast gleich (Abo beim Host, SDK im Browser des
Players, Katalog-API), nur die Steuerung läuft wie bei YouTube im Browser statt über das Backend.

**Pro**
- Vollständiger, sauberer Musikkatalog wie bei Spotify
- Suche ohne Host-Login möglich (Developer Token reicht)
- Für die **iOS-App** ideal: natives MusicKit ist dort die beste Lösung

**Contra**
- Apple Developer Program nötig (**99 USD/Jahr**), außer die Schule hat bereits einen Account
- Host braucht ein **Apple-Music-Abo**, sonst nur 30-Sekunden-Vorschauen
- Wiedergabe ist DRM-geschützt: nur über HTTPS, und in Entwicklerforen gibt es wiederholt
  Berichte über Probleme in Chromium-Browsern (Autorisierungsfehler, nur Vorschauen)
- Die Web-Dokumentation ist dünn, Fehlersuche wird aufwändiger als bei Spotify

### SoundCloud (Widget API, ggf. Public API)

**So würde es funktionieren:** Die Player-Seite bettet das **SoundCloud-Widget** ein und steuert es
per Widget API (play, pause, seek, Event `FINISH`). Für die Suche bräuchten wir die Public API mit
einer registrierten App.

**Ähnlichkeit zu Spotify:** niedrig–mittel, ähnlich wie bei YouTube.

**Pro**
- Kein Abo für die Wiedergabe über das Widget nötig
- Viele Remixes, DJ-Sets und Underground-Musik, passt zu Partys

**Contra**
- **App-Registrierung unklar:** Die offizielle Doku beschreibt eine Registrierung (laut Doku mit
  Artist-Pro-Konto), Drittquellen sagen, neue Registrierungen seien seit Jahren gesperrt. Das muss
  vor einer Entscheidung ausprobiert werden.
- Viele Mainstream-Hits fehlen oder sind nur als Vorschau verfügbar
- Ohne API keine richtige Suche, nur einzelne Links per oEmbed

### Audius (offene API)

**So würde es funktionieren:** Suche und Streaming über die öffentliche Audius-API bzw. das
JS-SDK. Die Player-Seite spielt den Stream mit einem normalen `<audio>`-Element ab.

**Ähnlichkeit zu Spotify:** mittel. Suche und Metadaten funktionieren wie bei Spotify, die
Wiedergabe ist sogar einfacher (normales Audio statt SDK).

**Pro**
- Kostenlos: Free-Plan mit 10 Anfragen/s und 500.000 Anfragen/Monat
- Kein Login und kein Abo für Host oder Gäste
- Einfache Wiedergabe ohne DRM, auch auf iOS unkompliziert
- Gut als **kostenloser Fallback** oder für Demos ohne Premium-Konto

**Contra**
- Katalog besteht hauptsächlich aus unabhängigen Künstlerinnen und Künstlern, **kaum
  Mainstream-Hits**, für eine typische Party eher ungeeignet
- Kleinere Plattform, langfristige Stabilität unklar

### TIDAL (TIDAL Developer Platform)

**Was die Plattform bietet** (laut [developer.tidal.com/documentation](https://developer.tidal.com/documentation)
und den dort verlinkten Referenzen):
- **App-Registrierung** selbst im Developer-Portal („Create App", mit Zustimmung zu den Developer
  Terms of Service). Es gibt eine Einreichung für den **Production Mode**, ähnlich wie bei Spotify
  der Wechsel aus dem Development Mode.
- **Web API** unter `openapi.tidal.com/v2` (JSON:API): Katalog, Suche, Playlists,
  Nutzer-Sammlungen, Empfehlungen.
- **Login** über OAuth 2.0: Authorization Code mit PKCE für Host-Login, Client Credentials für
  Katalog/Suche ohne Nutzer.
- **SDKs** für Web (`@tidal-music/player`, `auth`, `api` u. a.), iOS und Android, alle Open Source
  auf GitHub und aktiv gepflegt (letzte Web-SDK-Aktualisierung Oktober 2026).
- Laut TIDAL ist das **Player-Modul der einzige empfohlene Weg** zur Wiedergabe: Das Playback-API
  liefert nur signierte Manifeste, die Audiodaten kommen ausschließlich über den Player.

**So würde es funktionieren:** Der Host meldet sich per OAuth (PKCE) an, ähnlich wie heute bei
Spotify. Die Suche läuft über die Web API im Backend. Die Player-Seite bindet `@tidal-music/player`
ein und steuert die Wiedergabe mit `load`, `play`, `pause`, `seek` und `setNext`.
Über den Event-Bus kommen Zustandsänderungen und Fehler wie
`ContentNotAvailableForSubscriptionError` oder `MonthlyStreamQuotaExceededError`.

**Ähnlichkeit zu Spotify:** in der Theorie **am höchsten** von allen (Abo beim Host, OAuth,
Player-SDK im Browser, vollständiger Katalog). Wie bei Apple und YouTube läuft die Steuerung aber
im Browser, nicht über das Backend.

**Pro**
- Vollständiger Musikkatalog, hohe Audioqualität
- App-Registrierung ist offen, anders als (vermutlich) bei Deezer oder bei Amazon
- Moderne API mit OAuth/PKCE und Client Credentials (Suche ohne Host-Login)
- `setNext` im Player erlaubt vorgeladene, nahtlose Übergänge, passend zu unserem
  `prepare-next` ~3 s vor Songende
- Offizielle SDKs auch für iOS, damit wäre die SwiftUI-App ebenfalls abgedeckt

**Contra**
- **Volle Wiedergabe für fremde Apps ist weiterhin nicht gesichert.** TIDAL hat im Januar 2024
  nur Vorschau-Tracks freigegeben und im August 2024 volle Wiedergabe „später im Jahr" zusammen
  mit dem Production Mode angekündigt. Eine offizielle Freigabe haben wir nicht gefunden. Im
  Januar 2026 berichtet ein Entwickler, dass abwechselnd volle Songs und Vorschauen kommen; im
  Februar 2026 bekommt ein anderer im Web-SDK nur Vorschauen. Auch das Quick-Start-Beispiel spielt
  nur eine Vorschau.
- Der Player meldet `MonthlyStreamQuotaExceededError`. Es scheint also ein **monatliches
  Stream-Kontingent** zu geben, dessen Höhe wir nicht kennen.
- Host braucht ein TIDAL-Abo, und TIDAL wird in unserer Zielgruppe kaum genutzt
- Wenig Community-Beispiele; die Doku-Seite ist eine reine JavaScript-App, die Details stehen
  verstreut in den GitHub-Repos

**Nächster Schritt, falls TIDAL interessant ist:** ein kurzer Spike mit einer eigenen App und einem
TIDAL-Abo. Kommen im Web-Player volle Songs oder nur Vorschauen? Und was verlangt der Production
Mode?

### Deezer – ⚠️ Suche ja, Wiedergabe eher nein

Geprüft am 13.10.2026 auf [developers.deezer.com](https://developers.deezer.com/) (Guidelines,
Terms of use) und mit einem eigenen Test der öffentlichen API.

**Was die Plattform laut Deezer selbst bietet** (Guidelines):

| Werkzeug | Für Websites? | Wiedergabe |
|---|---|---|
| **Öffentliche API** (`api.deezer.com`) | ✅ | **nur 30-s-Ausschnitte**, für alle Nutzer |
| **Plugins/Widget** (`widget.deezer.com`) | ✅ | Einzelne Songs: volle Länge **nur für Premium-Nutzer**, sonst 30 s |
| **JavaScript SDK** (`dz.js`) | ✅ | volle Länge nur für eingeloggte **Premium-Nutzer** |

**Was wir selbst getestet haben**
- Die **öffentliche Such-API funktioniert ohne App und ohne Key**:
  `https://api.deezer.com/search?q=…` liefert Titel, Künstler, Cover, Dauer, ISRC und eine
  30-s-Vorschau-URL.
- Das JavaScript-SDK (`dz.js`) und das Widget sind noch online erreichbar.
- Die API-Doku, die SDK-Doku und „My Apps" sind **nur noch nach Login** sichtbar. Ob man dort
  eine App anlegen kann, konnten wir ohne Deezer-Konto nicht prüfen.

**So würde es funktionieren (theoretisch):** Suche über die öffentliche API im Backend (kein Key
nötig). Die Player-Seite lädt das JavaScript-SDK, der Host meldet sich mit seinem
Deezer-Premium-Konto an, das SDK spielt die Songs in voller Länge ab.

**Ähnlichkeit zu Spotify:** hoch (Premium beim Host, SDK im Browser, Katalog-API), wenn das SDK
funktioniert.

**Pro**
- **Suche und Metadaten sofort nutzbar**, ohne App, Key oder Login, inkl. ISRC
  (eindeutige Song-Kennung, praktisch für Duplikat-Erkennung)
- Vollständiger Mainstream-Katalog
- Für Premium-Nutzer erlaubt Deezer volle Wiedergabe über SDK und Widget

**Contra**
- **Das JavaScript-SDK braucht eine App-ID.** Laut mehreren Berichten nimmt das Portal seit
  längerer Zeit **keine neuen Apps** an, und das SDK wird laut Berichten nicht mehr gepflegt.
- Das **Widget hat keine dokumentierte Steuerungs-API** (play/pause/Songende), damit kann unser
  Backend den Ablauf nicht steuern. Ob es für Premium-Nutzer wirklich volle Songs spielt, ist
  ebenfalls nicht bestätigt; Drittquellen sprechen nur von 30-s-Vorschauen.
- Nur mit der öffentlichen API gibt es **nur 30-s-Ausschnitte**, für eine Party unbrauchbar.
- **Nutzungsbedingungen:** streng **nicht-kommerziell**, und die Wiedergabe ist laut Terms auf
  eine „strictly private use within a family scope" beschränkt. Eine private Party ist eine
  Grauzone, eine öffentliche Veranstaltung wäre nicht erlaubt.
- Deezer kann den Zugang laut Terms jederzeit ohne Vorwarnung einschränken.

#### Bewertung des JavaScript SDK (`dz.js`)

Grundlage: Die aktuelle `dz.js` vom Deezer-CDN wurde am 13.10.2026 heruntergeladen und
durchsucht. Sie ist ca. 2,8 MB groß, weil sie im Grunde Deezers kompletten Web-Player mitbringt.

**Was dafür spricht**
- **Steuerung vorhanden:** `playTracks`, `addToQueue`, Pause, `seek`, `setVolume`
- **Die nötigen Events gibt es:** `track_end` und `finish` für das Songende, dazu eigene Events
  für das Ende von Vorschau und Werbung. Unser Ablauf „Song ist aus → nächster Song" ließe sich
  abbilden.
- **Konzept wie bei Spotify:** Player im Browser der Player-Seite, Premium beim Host, Suche über
  die freie API

**Was dagegen spricht**
1. **Deezer markiert das SDK selbst als veraltet.** `DZ.login()` und `DZ.getLoginStatus()`
   schreiben nur noch in die Konsole: *„You're using the old DZ SDK which is deprecated. API
   explorer token is going to be based on your cookies shared with www.deezer.com"*. Der eigene
   Login über das SDK funktioniert also nicht mehr.
2. **Der Login hängt an Cookies von deezer.com.** Der Host müsste im selben Browser bei
   deezer.com angemeldet sein, und der Browser müsste Cookies fremder Seiten erlauben. Safari
   und Firefox im strengen Modus blockieren das standardmäßig, Chrome schränkt es zunehmend ein.
   Das ist fehleranfällig und kaum testbar.
3. **App-ID nötig:** `DZ.init` verlangt eine `appId`, und neue Apps sind vermutlich gesperrt
   (siehe oben).
4. **Umständliche Einbindung:** Das SDK braucht ein `<div id="dz-root">` und eine `channelUrl`
   (extra Seite auf unserer Domain für die Kommunikation zwischen Fenstern). In Angular machbar,
   aber unschön.
5. **Keine Pflege, keine Doku:** Doku nur nach Login, kein npm-Paket, keine TypeScript-Typen.
   Deezer kann den Zugang laut Terms jederzeit ohne Vorwarnung abschalten.
6. **Rechtlich:** Nur nicht-kommerzielle, „private use within a family scope", für eine
   Schul-Präsentation oder eine öffentliche Party grenzwertig.

**Einschätzung:** Aufwand mittel, **Risiko hoch**. Selbst mit App-ID bauen wir auf einem SDK
auf, das Deezer selbst als veraltet bezeichnet, mit einem Login, der von den Cookie-Einstellungen
des Browsers abhängt. Eine Live-Demo, die plötzlich nur 30-s-Vorschauen spielt oder sich nicht
anmeldet, wäre genau das, was wir nicht wollen. **Für die Wiedergabe nicht empfohlen.** Höchstens
die freie Suche könnte man nutzen, z. B. für ISRC-Kennungen zur Duplikat-Erkennung.

**Fazit:** Für die **Suche** wäre Deezer sofort nutzbar, für die **Wiedergabe** nur, wenn wir
noch eine App-ID bekommen, und selbst dann rät die SDK-Bewertung oben davon ab. **Nächster Schritt:** Mit einem Deezer-Konto im Portal unter
„My Apps" prüfen, ob eine neue App angelegt werden kann. Wenn nein, bleibt Deezer raus.

### Amazon Music – ❌ nicht nutzbar

Die Web API ist laut offizieller Doku weiterhin in **geschlossener Beta** (nur freigegebene
Partner) und bietet nur Metadaten, keine Wiedergabe. Die alte Device API wird abgeschaltet.

### Weitere Plattformen (kurz geprüft)

Diese Dienste wurden nur kurz geprüft. Bis auf Jamendo fallen sie für uns weg
(Zusammenfassung in der Tabelle in Kapitel 2).

#### YouTube Music – ❌

**Ähnlichkeit zu Spotify:** vom Angebot her hoch (Abo-Dienst mit offiziellen Songs), technisch
nicht vergleichbar, weil es keine offizielle Schnittstelle gibt.

**Pro**
- Großer Katalog mit offiziellen Audio-Versionen statt Musikvideos, also „sauberere" Suchergebnisse
  als im normalen YouTube
- Viele Leute haben über YouTube Premium bereits Zugang

**Contra**
- **Keine offizielle API**, weder für Suche noch für Wiedergabe
- Inoffizielle Bibliotheken (z. B. `ytmusicapi`) melden sich mit kopierten Browser-Cookies an und
  greifen auf interne Endpunkte zu. Das kann jederzeit kaputtgehen und kann gegen die
  YouTube-Bedingungen verstoßen.
- Google geht laut den Bibliotheken zunehmend gegen Bots vor; Endpunkte ohne Login liefern teils
  schon Fehler
- Für ein Schulprojekt mit öffentlicher Präsentation nicht vertretbar

#### Qobuz – ❌

**Ähnlichkeit zu Spotify:** in der Theorie hoch (Abo-Dienst, voller Katalog, REST-API), praktisch
kein Zugang.

**Pro**
- Vollständiger Musikkatalog in sehr hoher Audioqualität (Hi-Res)
- Die REST-API selbst wäre funktional ausreichend (Suche, Katalog)

**Contra**
- **API nur für Geschäftspartner**, keine Registrierung für Privatpersonen oder Schulprojekte
- Laut einer zitierten Antwort von Qobuz verbieten die Label-Verträge eine öffentliche API und
  Open-Source-Integrationen
- Inoffizielle Wege nutzen Zugangsdaten aus dem Web-Player und verstoßen gegen die
  Nutzungsbedingungen
- Kleine Nutzerbasis in unserer Zielgruppe

#### Napster – ❌

**Ähnlichkeit zu Spotify:** früher hoch (klassischer Streaming-Dienst), heute unklar.

**Pro**
- Bekannter Name, früher mit vollständigem Musikkatalog

**Contra**
- 2025 an Infinite Reality verkauft (inkl. Schulden aus Lizenzkosten); die Firma heißt inzwischen
  selbst Napster und setzt auf 3D-Räume, virtuelle Konzerte und KI
- **Keine aktuelle Entwickler-API gefunden**
- Zukunft des Streaming-Angebots unsicher, kaum Nutzerinnen und Nutzer in unserer Zielgruppe

#### Jamendo – ✅ (nur als Fallback)

**Ähnlichkeit zu Spotify:** mittel. Suche und Metadaten funktionieren ähnlich, die Wiedergabe ist
wie bei Audius einfacher (normaler Audio-Stream im `<audio>`-Element statt SDK).

**Pro**
- **Offene API**: App registrieren, `client_id` als Parameter mitschicken, fertig
- Kostenlos für nicht-kommerzielle Apps (ca. 35.000 Anfragen pro Monat, sollte für Partys reichen)
- Kein Login und kein Abo für Host oder Gäste
- Musik unter Creative-Commons-Lizenz, also rechtlich klar geregelt
- Kein DRM, funktioniert in jedem Browser und auf iOS

**Contra**
- **Kaum bekannte Hits**, fast nur unabhängige Künstlerinnen und Künstler
- Jeder Song hat eine eigene Lizenz; mindestens eine **Namensnennung** ist Pflicht, wir müssten
  Künstler und Lizenz im Player anzeigen
- Quellen widersprechen sich, ob für manche Funktionen OAuth nötig ist
- 35.000 Anfragen pro Monat gelten für alle Partys zusammen

#### Mixcloud – ⚠️ (passt nicht zum Konzept)

**Ähnlichkeit zu Spotify:** niedrig. Es gibt nur einen einbettbaren Player, keine einzelnen Songs.

**Pro**
- Offizielle **Widget-JavaScript-API** zum Steuern des eingebetteten Players (`load`, `play`, …)
- Legale Plattform für DJ-Mixes, die Lizenzen regelt Mixcloud selbst
- Kein Abo für die Wiedergabe nötig

**Contra**
- **Nur ganze Mixes und Shows**, keine einzelnen Songs, damit funktioniert Song-Voting nicht
- Der Player muss sichtbar sein
- Browser blockieren Autoplay; der Start braucht evtl. einen Klick auf der Player-Seite
- Höchstens interessant als „DJ-Set-Modus" für einen ganz anderen Party-Ablauf

#### Regionale Dienste – nicht geprüft

Regionale Dienste wie **Anghami** (Naher Osten), **JioSaavn** (Indien), **Boomplay** (Afrika),
**Yandex Music** (Russland), **NetEase Cloud Music** und **QQ Music** (China) sind für uns wegen
Region und Sprache nicht relevant. Ihre APIs wurden nicht genauer geprüft.

## 4. Achtung: Spotify-Änderungen 2026 betreffen uns selbst

Bei der Recherche ist aufgefallen, dass Spotify den **Development Mode** im Februar 2026 stark
eingeschränkt hat. Das ist auch für die Diskussion relevant, weil es ein Argument für einen
zweiten Anbieter ist:

- **Max. 5 autorisierte Nutzer pro App:** Nur Spotify-Konten, die wir im Dashboard eintragen,
  können sich als Host anmelden. Fremde Hosts gehen nicht.
- Der **App-Owner** braucht selbst Premium, sonst funktioniert die App nicht mehr.
- Aus dem Development Mode raus (Extended Quota) kommen nur Firmen mit ≥ 250.000 monatlichen
  Nutzerinnen und Nutzern, also nicht wir.
- **Entfernte bzw. geänderte Endpunkte, die unser Code noch nutzt** (`SpotifyMusicProvider`):
  - `GET /v1/artists/{id}/top-tracks` (Auto-Refill Schritt 2) → **entfernt, ohne Ersatz**
  - `POST /v1/users/{id}/playlists` → ersetzt durch `/v1/me/playlists`
  - `/v1/playlists/{id}/tracks` → umbenannt in `/v1/playlists/{id}/items`
  - `/v1/search`: maximal 10 statt 50 Ergebnisse pro Anfrage

Laut Spotify wurde die **Endpunkt-Änderung für bestehende Apps verschoben**. Ob uns das betrifft,
hängt davon ab, wann unsere Client-ID angelegt wurde (vor oder nach dem 11.02.2026). Das sollten
wir prüfen und ggf. als eigenen OpenSpec-Change (Fix) umsetzen, unabhängig vom Anbieter-Wechsel.

## 5. Einschätzung / Vorschlag zur Diskussion

1. **YouTube als zweiter Anbieter.** Die Lücke von Spotify (Premium, Limit von 5 Hosts) ist bei
   YouTube nicht vorhanden. Die Vorbereitung im Code (`ProviderKind.YOUTUBE`) existiert schon.
   Das größte Risiko ist die **Such-Quota**, die wir vorher mit einem Test-Key ausprobieren sollten.
2. **Apple Music**, falls die iOS-App weiter eine Rolle spielt und ein Apple-Developer-Account
   verfügbar ist. Technisch sehr nah an Spotify, und volle Wiedergabe für Abonnenten ist gesichert.
3. **Audius** oder **Jamendo** höchstens als kostenloser Demo-/Fallback-Modus, nicht als Hauptanbieter.
4. **TIDAL** wäre technisch am nächsten an Spotify (OAuth, Player-SDK, auch iOS). Es lohnt sich aber
   nur, wenn ein kurzer Spike zeigt, dass fremde Web-Apps **volle Songs** abspielen dürfen.
   SoundCloud ebenfalls nur nach einem Spike (App-Registrierung testen).
   **Deezer** nur, falls im Portal noch eine App angelegt werden kann (Suche geht schon ohne App).
   Amazon Music fällt weg.

Unabhängig vom Anbieter: Die Steuerung der Wiedergabe muss für alle Nicht-Spotify-Anbieter **in
die Player-Seite** wandern (Kommandos per SSE). Das sollte im Design-Dokument des späteren
OpenSpec-Changes als Erstes geklärt werden.

**Offene Fragen fürs Team**
- Muss jeder Host denselben Anbieter wie die Gäste nutzen, oder wählt der Host pro Party?
- Ist Werbung (YouTube) auf einer Party akzeptabel?
- Gibt es einen Schul-Account fürs Apple Developer Program?
- Soll die iOS-App denselben Anbieter-Wechsel bekommen?

## Quellen

- Spotify: [Update on Developer Access and Platform Security (06.02.2026)](https://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security),
  [February 2026 Migration Guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide),
  [TechCrunch (06.02.2026)](https://techcrunch.com/2026/02/06/spotify-changes-developer-mode-api-to-require-premium-accounts-limits-test-users/embed/)
- YouTube: [Embedded Players and Player Parameters](https://developers.google.com/youtube/player_parameters),
  [YouTube API Services – Developer Policies](https://developers.google.com/youtube/terms/developer-policies),
  [Required Minimum Functionality](https://developers.google.com/youtube/terms/required-minimum-functionality),
  [Quota and Compliance Audits](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits),
  [Cordova-Issue zur Audio/Video-Trennung](https://issues.apache.org/jira/browse/CB-11935),
  [YouTube-Hilfe: Werbung trotz Premium](https://support.google.com/youtube/answer/7437519?hl=en),
  [YouTube-Hilfe: Premium-Vorteile nutzen](https://support.google.com/youtube/answer/6060858?hl=en)
- Apple Music: [WWDC 2018 – MusicKit on the Web](https://nonstrict.eu/wwdcindex/wwdc2018/506/),
  [WWDC 2022 – Apple Music API](https://developer.apple.com/videos/play/wwdc2022/10148/),
  [Forum: Chromium nur Vorschauen](https://developer.apple.com/forums/thread/683958),
  [Forum: Autorisierung ohne Abo](https://developer.apple.com/forums/thread/704063),
  [Forum: AUTHORIZATION_ERROR in v3](https://developer.apple.com/forums/thread/837028)
- SoundCloud: [Developer Docs](https://developers.soundcloud.com/docs/api),
  [App registrieren](https://developers.soundcloud.com/docs/api/register-app)
- Audius: [Audius SDK](https://docs.audius.org/sdk)
- TIDAL: [Developer-Dokumentation](https://developer.tidal.com/documentation),
  [Web-SDK-Doku](https://tidal-music.github.io/tidal-sdk-web/),
  [API-Referenz](https://tidal-music.github.io/tidal-api-reference/),
  [Player-Spezifikation](https://github.com/tidal-music/tidal-sdk/blob/main/Player.md),
  [Discussion #40: Web-SDK und volle Wiedergabe](https://github.com/orgs/tidal-music/discussions/40),
  [Discussion #8: Media Playback](https://github.com/orgs/tidal-music/discussions/8)
- Deezer: [Deezer for Developers](https://developers.deezer.com/),
  [Guidelines](https://developers.deezer.com/guidelines),
  [Terms of use](https://developers.deezer.com/termsofuse),
  [Music Plugins](https://developers.deezer.com/musicplugins),
  [RouteNote: Deezer-Widget](https://routenote.com/blog/play-music-in-your-website-with-deezers-new-widget-player/),
  [Deezer Community: App-Erstellung nicht möglich](https://en.deezercommunity.com/other-devices-49/impossible-de-creer-une-app-migration-spotify-vers-deezer-pour-un-projet-de-decouvert-et-jeux-musicaux-82752),
  [deezer-oauth-cli (PyPI)](https://pypi.org/project/deezer-oauth-cli/),
  [Macamp-Issue #18](https://github.com/holgerkrupp/Macamp/issues/18)
- Amazon Music: [Web API Overview](https://developer.amazon.com/docs/music/API_web_overview.html)
- YouTube Music: [ytmusicapi (GitHub)](https://github.com/sigma67/ytmusicapi)
- Qobuz: [API Evangelist – Qobuz](https://providers.apievangelist.com/providers/qobuz/),
  [QobuzApiSharp](https://github.com/DJDoubleD/QobuzApiSharp),
  [moOde-Forum](https://moodeaudio.org/forum/showthread.php?pid=63752)
- Napster: [MusicTech – Übernahme durch Infinite Reality](https://musictech.com/news/industry/infinite-reality-acquires-napster/),
  [t3n](https://t3n.de/news/?p=1689542)
- Jamendo: [Jamendo API Docs](https://developer.jamendo.com/v3.0/docs),
  [Creative-Commons-Issue](https://github.com/creativecommons/cccatalog/issues/345)
- Mixcloud: [Widget JavaScript API](https://www.mixcloud.com/developers/widget/),
  [Mixcloud Developers](https://www.mixcloud.com/developers/)
