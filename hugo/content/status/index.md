---
title: "Projektstatus: MusicVoting"
layout: "presentation"
---

{{< slide notes="Diese Präsentation wird laufend erneuert. Datum und Inhalte kommen aus hugo/data/status.yaml." >}}
<p class="kicker">Projektstatus</p>
<h1>🎵 MusicVoting</h1>

<div class="stand-badge">Stand: <strong>{{< status-stand >}}</strong></div>
{{< /slide >}}

{{< slide title="Worum geht's?" notes="Technisch: 1) POST /api/party, Spotify-OAuth, optional PUT /default-playlist. 2) /join/<pin>, addToPlaylist und vote → SSE-Events queue-updated / vote-updated an alle. 3) Player registriert sich über das Web Playback SDK (PUT /deviceId); Song endet → /track/next → track-changed; Queue fast leer → /track/prepare-next → Auto-Refill." >}}
<p class="lead">Auf einer Party bestimmen die <strong>Gäste</strong> per Smartphone, welche Musik läuft – der <strong>Gastgeber</strong> richtet nur alles ein.</p>

<div class="journey">
<div class="stop host"><span class="role">Gastgeber</span><div class="dot">🎉</div><p>Party erstellen</p></div>
<div class="stop host"><span class="role">Gastgeber</span><div class="dot">🎧</div><p>Musikanbieter verbinden</p></div>
<div class="stop guest"><span class="role">Gäste</span><div class="dot">📷</div><p>QR-Code scannen</p></div>
<div class="stop guest"><span class="role">Gäste</span><div class="dot">🔍</div><p>Songs wünschen</p></div>
<div class="stop guest"><span class="role">Gäste</span><div class="dot">❤️</div><p>Liken</p></div>
<div class="stop tv"><span class="role">Player (TV)</span><div class="dot">🔊</div><p>Beliebtester Song läuft</p></div>
</div>
<svg class="journey-loop" viewBox="0 0 1200 110" aria-hidden="true">
  <defs><marker id="loop-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#fbbf24"/></marker></defs>
  <path d="M1100,8 C1100,85 700,85 700,14" fill="none" stroke="#fbbf24" stroke-width="3" stroke-dasharray="8 7" marker-end="url(#loop-arrow)"/>
  <text x="900" y="104" text-anchor="middle" font-size="24" fill="#fbbf24">🔁 und wieder von vorn – die ganze Party lang</text>
</svg>

{{< /slide >}}

{{< slide title="Ist-Zustand" notes="Punkte kommen aus data/status.yaml → ist und limits." >}}
{{< status-ist >}}
{{< /slide >}}

{{< slide title="Soll-Zustand" notes="Punkte kommen aus data/status.yaml → soll. Roadmap-Gruppe ist ein Platzhalter." >}}
{{< status-soll >}}
{{< /slide >}}

{{< slide title="Architektur" notes="Die Datenbank ist die Quelle der Wahrheit für Queue und aktuellen Song. Spotify wird nur für Suche und Abspielen genutzt. Live-Updates über SSE." >}}
<svg class="arch-svg" viewBox="0 0 1000 540" role="img" aria-label="Architektur: Clients sprechen per REST und SSE mit dem Quarkus-Backend, das PostgreSQL und die Spotify Web API nutzt; der Player spielt über das Web Playback SDK.">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8"/>
    </marker>
    <marker id="arrow-sse" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#34d399"/>
    </marker>
  </defs>

  <!-- Clients -->
  <rect class="box" x="20" y="20" width="210" height="90" rx="14"/>
  <text x="125" y="58" text-anchor="middle" font-size="22" font-weight="700">📱 Gast</text>
  <text class="muted" x="125" y="86" text-anchor="middle" font-size="15">Angular Webpage</text>

  <rect class="box" x="265" y="20" width="210" height="90" rx="14"/>
  <text x="370" y="58" text-anchor="middle" font-size="22" font-weight="700">👑 Host</text>
  <text class="muted" x="370" y="86" text-anchor="middle" font-size="15">Angular Webpage</text>

  <rect class="box" x="510" y="20" width="210" height="90" rx="14"/>
  <text x="615" y="58" text-anchor="middle" font-size="22" font-weight="700">🍏 iOS-App</text>
  <text class="muted" x="615" y="86" text-anchor="middle" font-size="15">SwiftUI · Gast &amp; Host</text>

  <rect class="box accent" x="755" y="20" width="210" height="90" rx="14"/>
  <text x="860" y="58" text-anchor="middle" font-size="22" font-weight="700">🖥️ Player</text>
  <text class="muted" x="860" y="86" text-anchor="middle" font-size="15">Angular + Playback SDK</text>

  <!-- Clients → Backend (REST) und Backend → Clients (SSE) -->
  <path class="edge" d="M115,110 L205,188" marker-end="url(#arrow)"/>
  <path class="edge sse" d="M225,188 L135,110" marker-end="url(#arrow-sse)"/>
  <path class="edge" d="M360,110 L360,188" marker-end="url(#arrow)"/>
  <path class="edge sse" d="M380,188 L380,110" marker-end="url(#arrow-sse)"/>
  <path class="edge" d="M605,110 L605,188" marker-end="url(#arrow)"/>
  <path class="edge sse" d="M625,188 L625,110" marker-end="url(#arrow-sse)"/>
  <path class="edge" d="M850,110 L775,188" marker-end="url(#arrow)"/>
  <path class="edge sse" d="M795,188 L870,110" marker-end="url(#arrow-sse)"/>

  <!-- Backend -->
  <rect class="box primary" x="150" y="190" width="700" height="160" rx="16"/>
  <text x="500" y="222" text-anchor="middle" font-size="22" font-weight="700">☕ Quarkus-Backend (Java 21) · /api</text>
  <rect class="box" x="175" y="240" width="150" height="90" rx="10"/>
  <text x="250" y="278" text-anchor="middle" font-size="17" font-weight="600">Endpoints</text>
  <text class="muted" x="250" y="302" text-anchor="middle" font-size="13">REST · SSE</text>
  <rect class="box" x="340" y="240" width="150" height="90" rx="10"/>
  <text x="415" y="285" dominant-baseline="central" text-anchor="middle" font-size="17" font-weight="600">Service</text>
  <rect class="box" x="505" y="240" width="150" height="90" rx="10"/>
  <text x="580" y="285" dominant-baseline="central" text-anchor="middle" font-size="17" font-weight="600">Provider</text>
  <rect class="box" x="670" y="240" width="155" height="90" rx="10"/>
  <text x="747" y="278" text-anchor="middle" font-size="17" font-weight="600">Scheduler</text>
  <text class="muted" x="747" y="302" text-anchor="middle" font-size="13">Auto-Ende 2 Tage</text>

  <!-- Backend → Daten -->
  <path class="edge" d="M300,350 L300,418" marker-end="url(#arrow)"/>
  <path class="edge" d="M700,350 L700,418" marker-end="url(#arrow)"/>

  <rect class="box" x="150" y="420" width="300" height="95" rx="14"/>
  <text x="300" y="460" text-anchor="middle" font-size="22" font-weight="700">🐘 PostgreSQL 16</text>
  <text class="muted" x="300" y="488" text-anchor="middle" font-size="15">party · queue_entry · vote</text>

  <rect class="box" x="550" y="420" width="300" height="95" rx="14"/>
  <text x="700" y="460" text-anchor="middle" font-size="22" font-weight="700">🎧 Spotify</text>
  <text class="muted" x="700" y="488" text-anchor="middle" font-size="15">Web API · OAuth</text>

  <!-- Player spielt direkt über Spotify -->
  <path class="edge" d="M965,65 L985,65 L985,467 L852,467" marker-end="url(#arrow)"/>
  <text class="muted" x="962" y="300" text-anchor="middle" font-size="16" transform="rotate(90 962 300)">Audio über Web Playback SDK</text>

  <!-- Legende -->
  <line class="edge" x1="20" y1="170" x2="50" y2="170"/>
  <text class="muted" x="56" y="175" font-size="13">REST</text>
  <line class="edge sse" x1="20" y1="150" x2="50" y2="150"/>
  <text class="muted" x="56" y="155" font-size="13">SSE (live)</text>
</svg>
{{< /slide >}}



{{< slide title="Aktueller Stand" >}}
<p class="lead">Screenshots aller Seiten – Gast, Gastgeber und Player.</p>
<div class="stand-badge">Stand: <strong>{{< status-stand >}}</strong></div>
{{< /slide >}}

{{< status-screens >}}

{{< slide kicker="Weiter geht's" title="Mehr erfahren" >}}
<ul>
<li><strong>Live-App:</strong> <a href="https://it220241.cloud.htl-leonding.ac.at">it220241.cloud.htl-leonding.ac.at</a></li>
<li><strong>Doku:</strong> Bedienungsanleitung, Spezifikation und Technical Docs auf dieser Website</li>
<li><strong>Code:</strong> <a href="https://github.com/2526-4ahitm-itp/2526-4ahitm-music-voting">github.com/2526-4ahitm-itp/2526-4ahitm-music-voting</a></li>
<li><strong>Loslegen:</strong> „How To Develop“ in der Doku</li>
</ul>
<div class="stand-badge">Stand: <strong>{{< status-stand >}}</strong></div>
{{< /slide >}}
