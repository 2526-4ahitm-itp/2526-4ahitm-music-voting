---
title: "Präsentation: MusicVoting"
layout: "presentation"
---

{{< slide title="🎵 MusicVoting" >}}
<h3>Keine langweiligen Partys mehr</h3>
<p>Die Gäste bestimmen die Musik – live, anonym, per Smartphone.</p>
{{< /slide >}}

{{< slide title="❌ Problem" >}}
<ul>
  <li>Der Gastgeber hat keine Zeit, sich um die Musik zu kümmern</li>
  <li>Oder: Er hat nicht den gleichen Musikgeschmack wie die Gäste</li>
  <li>Ergebnis: schlechte Stimmung auf der Party</li>
</ul>
{{< /slide >}}

{{< slide title="✅ Lösung" >}}
<ul>
  <li>Gäste schlagen eigene Songs vor</li>
  <li>Per Likes wird abgestimmt, was als Nächstes läuft</li>
  <li>Die Musik läuft über den <strong>Spotify-Premium-Account</strong> des Gastgebers</li>
</ul>
{{< /slide >}}

{{< slide title="👥 Rollen" >}}
<ul>
  <li><strong>Gast</strong> (Smartphone): tritt anonym bei, sucht, fügt hinzu, liked</li>
  <li><strong>Gastgeber</strong> (Host): erstellt die Party, steuert die Wiedergabe</li>
  <li><strong>Monitor/TV</strong>: spielt die Musik ab und zeigt alles live an</li>
</ul>
{{< /slide >}}

{{< slide title="📱 Beitreten" >}}
<ul>
  <li><strong>QR-Code</strong> am Monitor scannen – oder</li>
  <li><strong>5-stelligen PIN</strong> eingeben</li>
  <li>Kein Account, kein Name → Gäste bleiben anonym</li>
</ul>
{{< /slide >}}

{{< slide title="🗳️ Voting & Warteschlange" >}}
<ul>
  <li>Sortierung: <strong>mehr Likes zuerst</strong>, bei Gleichstand der ältere Wunsch</li>
  <li>Ein Like pro Gast und Song (umschaltbar)</li>
  <li>Updates erscheinen <strong>live auf allen Geräten</strong></li>
</ul>
{{< /slide >}}

{{< slide title="🛡️ Regeln" >}}
<ul>
  <li>Songs nur über die Suche – keine Duplikate</li>
  <li>Limit: max. 10 Songs pro Gast und Minute</li>
  <li><strong>Blacklist</strong>: der Host kann unerwünschte Wörter sperren</li>
</ul>
{{< /slide >}}

{{< slide title="🖥️ Dashboard (Monitor/TV)" >}}
<ul>
  <li>QR-Code zum Beitreten</li>
  <li>Aktueller Song mit animiertem Fortschrittsbalken</li>
  <li>Die sortierte Warteschlange</li>
  <li>Keine Host-Bedienelemente, keine Anzeige wer was gewünscht hat</li>
</ul>
{{< /slide >}}

{{< slide title="⚙️ Technischer Stack" >}}
<ul>
  <li><strong>Backend</strong>: Quarkus (Java 21), REST + SSE</li>
  <li><strong>Frontend</strong>: Angular (Gast, Host, Dashboard)</li>
  <li><strong>Datenbank</strong>: PostgreSQL 16</li>
  <li><strong>Mobile</strong> (optional): SwiftUI iOS-App</li>
</ul>
{{< /slide >}}

{{< slide title="🎧 Spotify-Anbindung" >}}
<ul>
  <li>Wiedergabe über das <strong>Spotify Web Playback SDK</strong> (läuft am Monitor)</li>
  <li>OAuth-Login pro Party (Premium-Account erforderlich)</li>
  <li>Access Token läuft nach 1 h ab → wird <strong>automatisch erneuert</strong></li>
</ul>
{{< /slide >}}

{{< slide title="🔄 Live-Updates (SSE)" >}}
<ul>
  <li>Server-Sent Events statt Polling</li>
  <li>Queue, Likes, aktueller Track und Fortschritt aktualisieren sich sofort</li>
  <li>Clients reconnecten nach Verbindungsabbruch automatisch</li>
</ul>
{{< /slide >}}

{{< slide title="🚀 Deployment" >}}
<ul>
  <li>Live im HTL-Cluster: <a href="https://it220241.cloud.htl-leonding.ac.at">it220241.cloud.htl-leonding.ac.at</a></li>
  <li>CI/CD über GitHub Actions → Images in GHCR</li>
  <li>Betrieb auf <strong>Kubernetes</strong> (Backend, Frontend, PostgreSQL)</li>
</ul>
{{< /slide >}}

{{< slide title="🎯 Ergebnis" >}}
<p><strong>Eine einfache, voll funktionsfähige Party-Musik-App</strong></p>
<ul>
  <li>Intuitiv bedienbar, anonym für Gäste</li>
  <li>Spotify-kompatibel, live und deployed</li>
</ul>
{{< /slide >}}

{{< slide title="🙌 Team" >}}
<ul>
  <li>Miriam Gnadlinger – Project Lead</li>
  <li>Simone Sperrer</li>
  <li>Marlies Winklbauer</li>
</ul>
{{< /slide >}}
