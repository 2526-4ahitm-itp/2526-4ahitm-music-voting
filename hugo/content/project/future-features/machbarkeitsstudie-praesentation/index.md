---
title: "Präsentation: Machbarkeitsstudie Musikanbieter"
description: Folien zur Machbarkeitsstudie „Wechselnder Musikanbieter" – für Sprintabgabe und Team-Besprechung
layout: "presentation"
date: 2026-11-03
weight: 30
---

{{< slide class="title-slide" notes="Inhalt basiert vollständig auf der Machbarkeitsstudie (13.10.2026, aktualisiert 03.11.2026). Sprintabgabe: Folien 1–2, 9–15 reichen für die Kurzfassung. Team-Besprechung: alle Folien, am Ende die offenen Fragen entscheiden." >}}
<p class="kicker">MusicVoting · Machbarkeitsstudie</p>
<h1 style="font-size: 2.4em">🎧 Wechselnder Musikanbieter</h1>
<h3>Spotify, YouTube &amp; Co. – pro Party wählbar?</h3>
<p class="lead">Code-Analyse · Lösungsvorschlag · Aufwand · Risiken · Empfehlung</p>
<div class="powered-by"><span>Stand 13.10.2026 · ITP 4AHITM</span><img src="htl-leonding-logo.jpg" alt="HTL Leonding"></div>
{{< /slide >}}

{{< slide kicker="Kapitel 1" title="Ziel und Umfang" notes="Wichtig: Der Wechsel WÄHREND einer Party ist bewusst ausgeschlossen – die Songs in der Warteschlange gehören zum alten Anbieter (Spotify-URI ≠ YouTube-Video-ID)." >}}
<p class="lead">Der Host wählt <strong>beim Erstellen der Party</strong> den Musikanbieter. Für Gäste bleibt alles gleich: suchen, wünschen, voten.</p>
<div class="cards" style="--cols: 2">
<div class="card accent"><div class="icon">✅</div><h4>Im Umfang</h4><p>Anbieter <strong>pro Party</strong> wählbar<br>Mindestens <strong>ein zweiter Anbieter</strong> neben Spotify<br>Web-App (Gast, Host, Player/TV) und iOS-App</p></div>
<div class="card"><div class="icon">🚫</div><h4>Nicht im Umfang</h4><p>Wechsel <strong>während</strong> einer laufenden Party (bräuchte Song-Abgleich, z. B. über ISRC)<br>Mehrere Anbieter gleichzeitig in einer Party</p></div>
</div>
{{< /slide >}}

{{< slide kicker="Kapitel 2 · Ausgangslage" title="Was schon vorbereitet ist" notes="Die wichtigste Voraussetzung: Die Queue liegt in UNSERER Datenbank, nicht beim Anbieter. Deshalb ist ein Anbieterwechsel überhaupt realistisch." >}}
<div class="cards">
<div class="card"><div class="icon">🧩</div><h4>Interface + Factory</h4><p><code>MusicProvider</code> und <code>MusicProviderFactory</code> – <code>TrackResource</code> nutzt schon das Interface.</p></div>
<div class="card"><div class="icon">🏷️</div><h4>ProviderKind</h4><p><code>SPOTIFY</code> und <code>YOUTUBE</code> existieren; YouTube wirft noch <code>UnsupportedOperationException</code>.</p></div>
<div class="card"><div class="icon">🎉</div><h4>Party mit Anbieter</h4><p><code>POST /api/party</code> nimmt <code>provider</code> entgegen, Spalte <code>party.provider_kind</code> wird gespeichert.</p></div>
<div class="card"><div class="icon">💿</div><h4>Eigene Song-Daten</h4><p><code>queue_entry</code> speichert Titel, Künstler, Cover und Dauer selbst; <code>track_uri</code> ist einfacher Text.</p></div>
<div class="card accent"><div class="icon">🐘</div><h4>Queue + Blacklist bei uns</h4><p>Warteschlange und Blacklist liegen in unserer DB; die Blacklist-Regel ist schon anbieterneutral.</p></div>
<div class="card"><div class="icon">📱</div><h4>iOS steuert nur</h4><p>Die App spielt keine Musik selbst – betroffen ist nur der Host-Login.</p></div>
</div>
{{< /slide >}}

{{< slide kicker="Kapitel 2 · Ausgangslage" title="Was fest an Spotify hängt" notes="Der größte Brocken ist die erste Zeile: Queue-, Vote- und Blacklist-Prüflogik stecken im SpotifyMusicProvider (1.840 Zeilen). Ein zweiter Anbieter müsste das sonst komplett kopieren. Außerdem: Das Dropdown 'Amazon Music' in create-party wird ignoriert und ist laut Recherche gar nicht nutzbar." >}}
<table class="plan compact">
<thead><tr><th>Bereich</th><th>Fundstelle</th><th>Problem</th></tr></thead>
<tbody>
<tr><td><strong>Queue- &amp; Vote-Logik</strong></td><td><code>SpotifyMusicProvider</code></td><td>1.840 Zeilen – Queue, Votes, Refill liegen <strong>im Spotify-Provider</strong></td></tr>
<tr><td><strong>Wiedergabe</strong></td><td><code>play/pause/resume</code>, <code>reassertPlay</code></td><td>Backend steuert Spotify per Web API – andere Anbieter nur im Browser steuerbar</td></tr>
<tr><td>Login, Tokens, DB</td><td><code>SpotifyCallbackResource</code>, <code>spotify_refresh_token</code></td><td>Pfade <code>/spotify/…</code>, festes <code>spotifyCredentials</code>, Spalte anbieterspezifisch</td></tr>
<tr><td>Live-Events</td><td><code>/api/spotify/events</code></td><td>SSE-Kanal heißt „spotify", wird aber für alles genutzt</td></tr>
<tr><td><strong>Blacklist</strong></td><td><code>isBlockedTrack</code>, <code>searchArtists</code></td><td>Prüfungen beim Hinzufügen, Refill und Suche <strong>im Spotify-Provider</strong>; Künstler = Spotify-ID</td></tr>
<tr><td>Player-Seite</td><td><code>spotify-player.ts</code>, <code>startpage.ts</code></td><td>Lädt Spotify SDK direkt, Songende-Erkennung auf Spotify zugeschnitten</td></tr>
<tr><td>Gast/Host-Suche</td><td><code>guest.ts</code>, <code>search-host.ts</code></td><td>Nutzen Spotify-Service und Spotify-Event-Pfad</td></tr>
<tr><td>Party erstellen</td><td><code>create-party.ts</code></td><td>Dropdown zeigt „Amazon Music", ruft aber immer <code>createParty('spotify')</code></td></tr>
<tr><td>iOS</td><td><code>SpotifyAuthView.swift</code></td><td>Login-Ansicht nur für Spotify</td></tr>
</tbody>
</table>
{{< /slide >}}

{{< slide kicker="Kapitel 3" title="Was ein Anbieter können muss" notes="Pflicht sind Suche, Metadaten, Abspielen, Pause/Resume und Songende-Erkennung. Steuerung durchs Backend kann nur Spotify – das ist der Grund für die zwei Wiedergabe-Modi auf Folie 7. YouTube-Suche ist durch die API-Quota begrenzt." >}}
<table class="plan compact">
<thead><tr><th>Fähigkeit</th><th class="c">Pflicht?</th><th class="c">Spotify</th><th class="c">YouTube</th><th class="c">Apple Music</th><th class="c">TIDAL</th></tr></thead>
<tbody>
<tr><td>Suche</td><td class="c">✅</td><td class="c">✅</td><td class="c">✅ Quota!</td><td class="c">✅</td><td class="c">✅</td></tr>
<tr><td>Song-Metadaten</td><td class="c">✅</td><td class="c">✅</td><td class="c">✅ Dauer extra</td><td class="c">✅</td><td class="c">✅</td></tr>
<tr><td>Abspielen im Player</td><td class="c">✅</td><td class="c">✅ Web Playback SDK</td><td class="c">✅ IFrame Player</td><td class="c">✅ MusicKit JS</td><td class="c">⚠️ evtl. nur Vorschau</td></tr>
<tr><td>Pause / Resume / Position</td><td class="c">✅</td><td class="c">✅</td><td class="c">✅</td><td class="c">✅</td><td class="c">✅</td></tr>
<tr><td>Songende erkennen</td><td class="c">✅</td><td class="c">⚠️ Workarounds</td><td class="c">✅</td><td class="c">✅</td><td class="c">✅</td></tr>
<tr><td>Steuerung durchs Backend</td><td class="c">–</td><td class="c">✅</td><td class="c">❌</td><td class="c">❌</td><td class="c">❌</td></tr>
<tr><td>Host-Login</td><td class="c">–</td><td class="c">✅ OAuth</td><td class="c">nicht nötig</td><td class="c">✅ MusicKit</td><td class="c">✅ OAuth (PKCE)</td></tr>
<tr><td>Auto-Refill-Quellen</td><td class="c">–</td><td class="c">⚠️ Top-Tracks entfernt</td><td class="c">✅</td><td class="c">✅</td><td class="c">✅</td></tr>
<tr><td><strong>Blacklist:</strong> Künstler pro Song + Künstler-Suche</td><td class="c">✅</td><td class="c">✅</td><td class="c">⚠️ nur Kanäle</td><td class="c">✅</td><td class="c">✅</td></tr>
</tbody>
</table>
{{< /slide >}}

{{< slide kicker="Kapitel 4 · Lösungsvorschlag" title="Zielbild Backend" notes="Kernidee: Party-Logik von Anbieter-Logik trennen. Der neue QueueService übernimmt alles Anbieterunabhängige. Der Anbieter liefert nur noch Musik: Katalog, optional Wiedergabe-Steuerung (nur Spotify), Login. track_uri bekommt ein Präfix (spotify:track:… / youtube:VIDEO_ID). Alte /spotify/-Pfade und /api/spotify/events bleiben als Weiterleitung, bis Web und iOS umgestellt sind. DB: spotify_refresh_token → provider_refresh_token." >}}
<svg class="arch-svg" viewBox="0 0 1000 520" role="img" aria-label="Zielbild: TrackResource ruft den neuen, anbieterunabhängigen QueueService auf, der PostgreSQL nutzt und über drei Schnittstellen mit den Anbietern spricht: MusicCatalog (Spotify, YouTube), PlaybackControl (nur Spotify) und ProviderAuth (Spotify OAuth, YouTube ohne Login).">
  <defs>
    <marker id="mb-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8"/>
    </marker>
  </defs>

  <!-- Obere Ebene: REST, QueueService, DB -->
  <rect class="box" x="20" y="35" width="220" height="90" rx="14"/>
  <text x="130" y="74" text-anchor="middle" font-size="20" font-weight="700">TrackResource</text>
  <text class="muted" x="130" y="100" text-anchor="middle" font-size="14">REST-Endpunkte</text>

  <rect class="box accent" x="330" y="15" width="340" height="130" rx="16"/>
  <text class="muted" x="500" y="42" text-anchor="middle" font-size="12" letter-spacing="2">NEU · ANBIETERUNABHÄNGIG</text>
  <text x="500" y="74" text-anchor="middle" font-size="24" font-weight="700">QueueService</text>
  <text class="muted" x="500" y="102" text-anchor="middle" font-size="14">Queue · Votes · Reihenfolge</text>
  <text class="muted" x="500" y="124" text-anchor="middle" font-size="14">Auto-Refill-Ablauf · aktueller Song</text>

  <rect class="box" x="760" y="35" width="220" height="90" rx="14"/>
  <text x="870" y="74" text-anchor="middle" font-size="20" font-weight="700">🐘 PostgreSQL</text>
  <text class="muted" x="870" y="100" text-anchor="middle" font-size="14">Quelle der Wahrheit</text>

  <line class="edge" x1="240" y1="80" x2="326" y2="80" marker-end="url(#mb-arrow)"/>
  <line class="edge" x1="670" y1="80" x2="756" y2="80" marker-end="url(#mb-arrow)"/>

  <!-- Mittlere Ebene: Schnittstellen zum Anbieter -->
  <text class="muted" x="500" y="200" text-anchor="middle" font-size="13" letter-spacing="2">FRAGT DEN ANBIETER NUR NACH MUSIK</text>
  <path class="edge" d="M500,145 V170 M500,210 V236" marker-end="url(#mb-arrow)"/>
  <path class="edge" d="M440,145 C440,190 170,190 170,236" marker-end="url(#mb-arrow)"/>
  <path class="edge" d="M560,145 C560,190 830,190 830,236" marker-end="url(#mb-arrow)"/>

  <rect class="box primary" x="30" y="240" width="280" height="100" rx="14"/>
  <text x="170" y="278" text-anchor="middle" font-size="20" font-weight="700">MusicCatalog</text>
  <text class="muted" x="170" y="306" text-anchor="middle" font-size="14">search · getTrack</text>
  <text class="muted" x="170" y="326" text-anchor="middle" font-size="14">refillCandidates</text>

  <rect class="box primary" x="360" y="240" width="280" height="100" rx="14"/>
  <text x="500" y="278" text-anchor="middle" font-size="20" font-weight="700">PlaybackControl</text>
  <text class="muted" x="500" y="306" text-anchor="middle" font-size="14">play / pause per Web API</text>
  <text class="muted" x="500" y="326" text-anchor="middle" font-size="14">optional – nur Spotify</text>

  <rect class="box primary" x="690" y="240" width="280" height="100" rx="14"/>
  <text x="830" y="278" text-anchor="middle" font-size="20" font-weight="700">ProviderAuth</text>
  <text class="muted" x="830" y="306" text-anchor="middle" font-size="14">login · callback</text>
  <text class="muted" x="830" y="326" text-anchor="middle" font-size="14">token · status</text>

  <!-- Untere Ebene: Implementierungen -->
  <path class="group" d="M110,340 V400 M240,340 V400 M500,340 V400 M760,340 V400 M900,340 V400"/>

  <rect class="box" x="40" y="400" width="140" height="70" rx="12"/>
  <text x="110" y="442" text-anchor="middle" font-size="17" font-weight="700">Spotify</text>
  <rect class="box accent ext" x="190" y="400" width="110" height="70" rx="12"/>
  <text x="245" y="442" text-anchor="middle" font-size="17" font-weight="700">YouTube</text>

  <rect class="box" x="430" y="400" width="140" height="70" rx="12"/>
  <text x="500" y="442" text-anchor="middle" font-size="17" font-weight="700">Spotify</text>

  <rect class="box" x="695" y="400" width="130" height="70" rx="12"/>
  <text x="760" y="432" text-anchor="middle" font-size="17" font-weight="700">Spotify</text>
  <text class="muted" x="760" y="454" text-anchor="middle" font-size="13">OAuth</text>
  <rect class="box accent ext" x="835" y="400" width="130" height="70" rx="12"/>
  <text x="900" y="432" text-anchor="middle" font-size="17" font-weight="700">YouTube</text>
  <text class="muted" x="900" y="454" text-anchor="middle" font-size="13">nur API-Key</text>

  <text class="muted" x="500" y="505" text-anchor="middle" font-size="13">grün gestrichelt = neu für YouTube</text>
</svg>
{{< /slide >}}

{{< slide kicker="Kapitel 4 · Lösungsvorschlag" title="Wiedergabe: zwei Modi" notes="Spotify kann vom Backend gesteuert werden, alle anderen Anbieter nur im Browser. Lösung: Das Backend schickt bei YouTube & Co. ein SSE-Kommando an die Player-Seite. Songende und Position meldet der Player in beiden Modi gleich wie heute an /track/next. Die DB bleibt Quelle der Wahrheit (currently_playing_entry_id, playback_started_at, paused_position_ms)." >}}
<div class="cards" style="--cols: 2">
<div class="card"><div class="icon">🖥️</div><h4>Server-gesteuert · heute, Spotify</h4><p>Spielt: Spotify-Gerät im Browser<br>„Play": Backend → <strong>Spotify Web API</strong><br>Pause/Resume: Backend → Spotify<br>Songende: Player → <code>/track/next</code></p></div>
<div class="card accent"><div class="icon">📺</div><h4>Client-gesteuert · YouTube, Apple, TIDAL</h4><p>Spielt: Player im Browser<br>„Play": Backend → <strong>SSE-Event <code>play-command</code></strong> → Player<br>Pause/Resume: Backend → SSE → Player<br>Songende: Player → <code>/track/next</code> (gleich)</p></div>
</div>
<p class="lead" style="margin-top: 0.8em">In beiden Modi bleibt <strong>unsere Datenbank</strong> die Quelle der Wahrheit.</p>
{{< /slide >}}

{{< slide kicker="Kapitel 4 · Lösungsvorschlag" title="Frontend & iOS" notes="Frontend: neues Interface MusicPlayerAdapter, der heutige SpotifyWebPlayerService wird zum SpotifyPlayerAdapter. Die Suche läuft schon übers Backend, Gast und Host brauchen nur den neutralen Event-Pfad. iOS ist am wenigsten betroffen." >}}
<div class="cards">
<div class="card accent"><div class="icon">🔌</div><h4>Player-Adapter</h4><p>Interface <code>MusicPlayerAdapter</code>: <code>init</code>, <code>load</code>, <code>pause</code>, <code>resume</code>, <code>onEnded</code>, <code>onPosition</code><br>Spotify- und neuer YouTube-Adapter; <code>startpage</code> wählt nach Party-Anbieter</p></div>
<div class="card"><div class="icon">🔍</div><h4>Gast, Host, Party erstellen</h4><p><code>guest</code> / <code>search-host</code>: nur neutraler Event-Pfad <code>/api/events</code><br><code>create-party</code>: nur echte Anbieter im Dropdown, Auswahl wird übergeben – „Amazon Music" fliegt raus</p></div>
<div class="card"><div class="icon">📱</div><h4>iOS</h4><p>Login-Ansicht je Anbieter: entfällt bei YouTube, Apple Music bräuchte natives MusicKit<br><code>PlaylistPickerView</code> nur bei Anbietern mit Playlists</p></div>
</div>
{{< /slide >}}

{{< slide kicker="Kapitel 4 · Lösungsvorschlag · YouTube" title="Nur das Cover zeigen?" notes="Frage aus dem Team: Kann man das Musikvideo verstecken und nur das Cover zeigen? Verstecken ist laut YouTube-Regeln verboten (Developer Policies III.I.6, III.I.7, III.I.9 und Required Minimum Functionality). Das ist auch praktisch wichtig: Mehr Such-Quota gibt es nur nach einem Compliance-Audit durch Google. Lösung: Topic-Uploads (Art Tracks) – YouTube erzeugt sie automatisch, das Bild ist nur das Albumcover. Erkennbar am Kanalnamen 'Künstler - Topic'. Wie oft es die zu Hits gibt, messen wir im Spike." >}}
<div class="cards" style="--cols: 2">
<div class="card"><div class="icon">🚫</div><h4>Verboten</h4><p>Player verstecken: <code>display: none</code>, <code>opacity: 0</code>, 1×1 px, außerhalb des Bildschirms<br>Cover-Bild <strong>über</strong> den Player legen<br>Nur den Ton abspielen<br>Player kleiner als <strong>200 × 200 px</strong></p></div>
<div class="card accent"><div class="icon">✅</div><h4>Erlaubt – fast gleiches Ergebnis</h4><p><strong>„Topic"-Uploads</strong> bevorzugen: das Bild <em>ist</em> nur das Albumcover<br>Kleiner, sichtbarer Player (z. B. 480 × 270), <strong>daneben</strong> groß Cover, Titel, Warteschlange<br>Steuerelemente ausblenden (<code>controls=0</code>)<br>Fallback: Musikvideo im kleinen Player</p></div>
</div>
<div class="limits"><strong>Warum wir uns daran halten müssen:</strong> Mehr als ~100 Suchen/Tag gibt es nur nach einem <strong>Compliance-Audit</strong> durch Google – ein versteckter Player fällt durch, der API-Key kann gesperrt werden.</div>
{{< /slide >}}

{{< slide kicker="Kapitel 4 · Lösungsvorschlag · Blacklist" title="Blacklist bei jedem Anbieter" notes="Die Party-Blacklist ist Pflicht für jeden Anbieter. Die Regel (BlacklistService.isBlocked) ist schon anbieterneutral, nur die drei Prüfstellen liegen noch im SpotifyMusicProvider und ziehen mit AP1 in den QueueService. Einträge mit Spotify-IDs sind kein Problem, weil die Blacklist pro Party gilt und der Anbieter pro Party fest ist. YouTube kennt keine Künstler, nur Kanäle – deshalb die kombinierte Prüfung. Fehltreffer wie Queen → Dancing Queen nehmen wir bewusst in Kauf. Der Such-Button bei YouTube spart Quota und braucht eine Delta-Spec. Risiko: Nach dem Umbau greift die Blacklist nicht mehr überall – deshalb bestehende Blacklist-Tests vorher grün und danach mit beiden Anbietern laufen lassen." >}}
<div class="cards">
<div class="card"><div class="icon">⚙️</div><h4>Backend für alle</h4><p>Regel im <code>BlacklistService</code> ist schon anbieterneutral<br>Prüfstellen (Hinzufügen, Auto-Refill, Suchtreffer) ziehen in den <code>QueueService</code><br>Jeder Anbieter liefert Titel, Künstler + IDs inkl. Features und eine Künstler-Suche</p></div>
<div class="card accent"><div class="icon">🎤</div><h4>YouTube: Künstler „kombiniert"</h4><p>Gesperrt, wenn <strong>eines</strong> zutrifft:<br>① Kanal-ID gehört zum Künstler (Topic, offiziell)<br>② Name als ganzes Wort in Titel oder Kanalname<br>③ Name in der Künstlerzeile der Topic-Beschreibung</p></div>
<div class="card accent"><div class="icon">🔎</div><h4>YouTube: Such-Button</h4><p>Blacklist-Seite sucht bei YouTube erst auf Knopfdruck – jede Suche kostet 100 Quota-Einheiten<br>Spotify bleibt bei „Suche beim Tippen"<br>Braucht eine <strong>Delta-Spec</strong></p></div>
</div>
<div class="limits"><strong>Bewusst akzeptiert:</strong> seltene Fehltreffer bei YouTube („Queen" sperrt auch „Dancing Queen") – lieber ein Song zu viel gesperrt als ein gesperrter Künstler auf der Party.</div>
{{< /slide >}}

{{< slide kicker="Kapitel 5 · Machbarkeit nach Dimensionen" title="Wie machbar ist es?" notes="Technisch nichts grundlegend Neues, vor allem Refactoring. Kosten: YouTube und TIDAL gratis, Apple braucht das Developer Program (99 USD/Jahr). Rechtlich: Bei YouTube muss der Player sichtbar und unverdeckt sein (siehe vorige Folie). Test: 180 Backend-Tests, viele gegen SpotifyMusicProvider – die müssen auf den QueueService umziehen." >}}
<table class="plan compact" style="font-size: 0.52em">
<thead><tr><th>Dimension</th><th>Bewertung</th><th>Begründung</th></tr></thead>
<tbody>
<tr><td><strong>Technisch</strong></td><td><span class="tag green">machbar</span></td><td>Interface, Factory, DB-Queue und neutrale Blacklist-Regel existieren – Hauptarbeit ist Refactoring. Risiko: fremde Player-SDKs</td></tr>
<tr><td><strong>Wirtschaftlich</strong></td><td><span class="tag green">YouTube gratis</span> <span class="tag yellow">Apple 99 USD/J.</span></td><td>YouTube und TIDAL kosten nichts, Apple braucht das Developer Program</td></tr>
<tr><td><strong>Rechtlich</strong></td><td><span class="tag yellow">lösbar</span></td><td>YouTube: Player sichtbar und unverdeckt, kein reiner Ton; „nur Cover“ über Topic-Uploads. Deezer nur „private use"</td></tr>
<tr><td><strong>Organisatorisch</strong></td><td><span class="tag yellow">knapp</span></td><td>Umbau quer durch Backend und Frontend, 2–3 Sprints parallel zu anderen Features</td></tr>
<tr><td><strong>Test / Qualität</strong></td><td><span class="tag yellow">Aufwand</span></td><td>180 Backend-Tests, viele gegen <code>SpotifyMusicProvider</code>; fremde SDKs nur manuell bzw. gemockt testbar</td></tr>
</tbody>
</table>
<div class="verdict"><strong>Gesamturteil: machbar</strong> – wenn wir <em>zuerst</em> Queue- und Blacklist-Prüflogik aus dem Spotify-Provider herauslösen. Sonst wäre jeder neue Anbieter eine Kopie von ~1.800 Zeilen.</div>
{{< /slide >}}

{{< slide kicker="Kapitel 6" title="Welcher Anbieter zuerst?" notes="Gewichtung: Zugang 25 %, volle Wiedergabe 25 %, Kosten/Konto 15 %, Katalog 15 %, Aufwand/Doku 10 %, rechtliche Klarheit 10 %. Die Punkte sind Einschätzungen aus der Recherche, keine Messwerte. YouTube gleicht die größte Schwäche von Spotify aus: Premium-Pflicht und max. 5 Hosts im Development Mode. Deezer scheitert vor allem am Zugang." >}}
<p class="lead" style="font-size: 0.6em">Gewichtete Bewertung (1 = schlecht, 5 = gut) nach Zugang, Wiedergabe, Kosten, Katalog, Aufwand und Recht</p>
<div class="bars">
<div class="bar win"><span class="label">▶️ YouTube</span><div class="track"><div class="fill" style="--v: 4.6"></div></div><span class="val">4,6</span></div>
<div class="bar"><span class="label">🍎 Apple Music</span><div class="track"><div class="fill" style="--v: 3.8"></div></div><span class="val">3,8</span></div>
<div class="bar"><span class="label">🌊 TIDAL</span><div class="track"><div class="fill" style="--v: 3.2"></div></div><span class="val">3,2</span></div>
<div class="bar"><span class="label">🎶 Deezer</span><div class="track"><div class="fill" style="--v: 2.1"></div></div><span class="val">2,1</span></div>
</div>
<div class="verdict"><strong>YouTube zuerst:</strong> kein Abo nötig, <code>ProviderKind.YOUTUBE</code> existiert schon, kein Premium-Zwang und kein 5-Host-Limit wie bei Spotify. <strong>Apple Music</strong> als dritter Anbieter, falls ein Developer-Account verfügbar ist.</div>
{{< /slide >}}

{{< slide kicker="Kapitel 7" title="Aufwandsschätzung" notes="PT = Personentag (ca. 6 h), Spannweite statt Fixwert. AP0 ist unabhängig und sollte zuerst passieren, weil Spotify-Endpunkte 2026 geändert wurden. AP1 ist die Voraussetzung für AP4–AP6 und AP8; AP3 kann parallel zu AP1/AP2 laufen." >}}
<table class="plan compact">
<thead><tr><th>#</th><th>Arbeitspaket</th><th class="c">Aufwand</th></tr></thead>
<tbody>
<tr><td>AP0</td><td><strong>Vorab:</strong> Spotify-Endpunkte an Änderungen 2026 anpassen</td><td class="c">1–2 PT</td></tr>
<tr><td>AP1</td><td><code>QueueService</code> herauslösen inkl. Blacklist-Prüfungen, Tests umziehen</td><td class="c">5–7 PT</td></tr>
<tr><td>AP2</td><td>Neutrale Auth-/Event-Endpunkte, DB-Migration, <code>Party</code> ohne <code>spotifyCredentials</code></td><td class="c">2–3 PT</td></tr>
<tr><td>AP3</td><td>Frontend: <code>MusicPlayerAdapter</code>, <code>startpage</code> + SSE-Kommandos</td><td class="c">3–4 PT</td></tr>
<tr><td>AP4</td><td>YouTube-Katalog im Backend (Filter, Embedding-Check, Quota-Caching)</td><td class="c">2–3 PT</td></tr>
<tr><td>AP5</td><td><code>YouTubePlayerAdapter</code> (IFrame Player, Songende, Position)</td><td class="c">2–3 PT</td></tr>
<tr><td>AP6</td><td><code>create-party</code>-Auswahl, Anzeige je Anbieter, iOS-Login</td><td class="c">1–2 PT</td></tr>
<tr><td>AP7</td><td>OpenSpec, Hugo-Doku, README, Präsentation</td><td class="c">2–3 PT</td></tr>
<tr><td>AP8</td><td>YouTube-Blacklist: Künstler „kombiniert", Such-Button</td><td class="c">1–2 PT</td></tr>
<tr class="sum"><td></td><td>Summe ≈ <span style="color: #6ee7b7">2–3 Sprints, eher 3</span> bei drei Personen und Schulbetrieb</td><td class="c">19–29 PT</td></tr>
</tbody>
</table>
{{< /slide >}}

{{< slide kicker="Kapitel 8 · Risiken und Gegenmaßnahmen" title="Risiken" notes="Das größte Risiko ist die YouTube-Such-Quota: ca. 100 Suchen pro Tag mit dem Standard-Kontingent. Deshalb früh im Spike mit einem Test-Key messen. Zweitgrößtes Risiko: Das Refactoring in AP1 bricht bestehende Spotify-Funktionen – Tests zuerst grün halten." >}}
<table class="plan compact">
<thead><tr><th>Risiko</th><th class="c">Wahrsch.</th><th class="c">Auswirkung</th><th>Gegenmaßnahme</th></tr></thead>
<tbody>
<tr><td>YouTube-Such-Quota (~100 Suchen/Tag) reicht nicht</td><td class="c"><span class="tag red">hoch</span></td><td class="c"><span class="tag red">hoch</span></td><td>Cachen, Suche nach Tipp-Pause, Quota-Erhöhung beantragen (braucht Compliance-Audit), früh messen</td></tr>
<tr><td>Refactoring (AP1) bricht Spotify-Funktionen</td><td class="c"><span class="tag yellow">mittel</span></td><td class="c"><span class="tag red">hoch</span></td><td>Tests grün halten, schrittweise umziehen, kein paralleles Feature im selben Code</td></tr>
<tr><td>Spotify-Endpunkte fallen weg (2026)</td><td class="c"><span class="tag yellow">mittel</span></td><td class="c"><span class="tag red">hoch</span></td><td>AP0 unabhängig und zuerst erledigen</td></tr>
<tr><td>Musikvideos nicht einbettbar</td><td class="c"><span class="tag yellow">mittel</span></td><td class="c"><span class="tag yellow">mittel</span></td><td><code>videoEmbeddable=true</code> filtern, „Topic"/„Official Audio" bevorzugen</td></tr>
<tr><td>Fremdes Player-SDK verhält sich anders</td><td class="c"><span class="tag yellow">mittel</span></td><td class="c"><span class="tag yellow">mittel</span></td><td>Vor AP5 kleiner Spike (1 PT) mit dem IFrame Player</td></tr>
<tr><td>Umbau dauert länger als ein Sprint</td><td class="c"><span class="tag yellow">mittel</span></td><td class="c"><span class="tag yellow">mittel</span></td><td>Einzelne OpenSpec-Changes, jeder Schritt für sich lauffähig</td></tr>
<tr><td>Werbung bei YouTube auf der Party</td><td class="c"><span class="tag red">hoch</span></td><td class="c"><span class="tag green">niedrig</span></td><td>Hinweis an Host: mit Premium im TV-Browser anmelden</td></tr>
</tbody>
</table>
{{< /slide >}}

{{< slide kicker="Kapitel 9 · Empfehlung und nächste Schritte" title="Empfehlung" notes="Empfehlung: umsetzen, aber in Etappen und mit YouTube als zweitem Anbieter. Jeder Schritt ist ein eigener OpenSpec-Change. extract-queue-service ist reines Refactoring ohne neues Verhalten. Den Namen add-youtube-provider erwartet die MusicProviderFactory schon in ihrer Fehlermeldung." >}}
<p class="lead"><strong>Umsetzen – in Etappen, mit YouTube als zweitem Anbieter.</strong></p>
<div class="steps" style="font-size: 0.5em">
<div class="step"><span class="num">1</span><br><strong>Spike YouTube</strong><br>1–2 PT: Suche + IFrame Player testen, Quota, Werbung und Topic-Trefferquote messen</div>
<div class="arrow">→</div>
<div class="step"><span class="num">2</span><br><code style="font-size: 0.85em">fix-spotify-2026-endpoints</code><br>AP0, unabhängig</div>
<div class="arrow">→</div>
<div class="step"><span class="num">3</span><br><code style="font-size: 0.85em">extract-queue-service</code><br>AP1 + AP2, reines Refactoring inkl. Blacklist</div>
<div class="arrow">→</div>
<div class="step"><span class="num">4</span><br><code style="font-size: 0.85em">add-youtube-provider</code><br>AP3–AP6, AP8 (Blacklist)</div>
<div class="arrow">→</div>
<div class="step"><span class="num">5</span><br><strong>Danach</strong><br>Apple Music oder TIDAL entscheiden</div>
</div>
{{< /slide >}}

{{< slide kicker="Kapitel 10" title="Offene Fragen fürs Team" notes="Diese Fragen sollten wir vor dem Proposal für add-youtube-provider klären. Bei der Sprintabgabe kann die Folie als Ausblick gezeigt werden." >}}
<ul>
<li>Reicht die Anbieter-Wahl <strong>beim Erstellen</strong>, oder soll man auch <strong>während der Party</strong> wechseln können?</li>
<li>Ist <strong>Werbung</strong> bei YouTube okay, oder setzen wir YouTube Premium beim Host voraus?</li>
<li>Wird die <strong>iOS-App</strong> weiter aktiv entwickelt? (wichtig für Apple Music)</li>
<li>YouTube braucht <strong>kein OAuth</strong>, nur einen API-Key – Doku und Specs anpassen?</li>
</ul>
<a class="big-link" href="../machbarkeitsstudie-musikanbieter/">Zur vollständigen Studie →</a>
{{< /slide >}}
