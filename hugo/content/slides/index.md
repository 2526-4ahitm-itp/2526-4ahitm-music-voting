---
title: "Präsentation: MusicVoting"
layout: "presentation"
---

{{< slide title="🎵 MusicVoting" >}}
<h3>No more lame parties because of bad music</h3>
{{< /slide >}}

{{< slide title="❌ Problem" >}}
<ul>
  <li>Der Gastgeber hat keine Zeit, sich um Musik zu kümmern</li>
  <li>Oder: Er hat einfach nicht den passenden Musikgeschmack</li>
</ul>
{{< /slide >}}

{{< slide title="✅ Lösung" >}}
<ul>
  <li>Gäste bringen ihre eigene Musik mit in die Playlist</li>
  <li>Mit Votes werden Songs in der Reihenfolge hochgestuft</li>
</ul>
{{< /slide >}}

{{< slide title="💡 Unsere Idee" >}}
<p>
  Das aktuelle System spielt Musik über YouTube.<br>
  Wir möchten es stattdessen mit einem <strong>Spotify Premium Account</strong> verbinden.
</p>
{{< /slide >}}

{{< slide title="⚙️ Technische Umsetzung" >}}
<ul>
  <li>Spotify Web Playback SDK ermöglicht:
    <ul>
      <li>Abspielen, Pausieren, Überspringen</li>
      <li>Zugriff auf Songs, Alben, Genres etc.</li>
    </ul>
  </li>
  <li>Access Token läuft nach 1 Stunde ab → muss erneuert werden</li>
</ul>
{{< /slide >}}

{{< slide title="📂 Projektstand" >}}
<p>
  GitHub Repo: <a href="https://github.com/MusicVoting/MusicVotingV3">MusicVotingV3</a><br>
  (von Anna Hartl & Sheila Hautzmayer)
</p>
<p>
  → nicht vollständig, daher verwenden wir das Projekt von <strong>Eldin B.</strong><br>
  (vom Tag der offenen Tür 2024)
</p>
<p>
  Ziel: Einarbeiten, analysieren, nächste Schritte planen
</p>
{{< /slide >}}

{{< slide title="🎯 Ziel" >}}
<p><strong>Eine einfachere, verbesserte Version von MusicVoting</strong></p>
<ul>
  <li>Stabil</li>
  <li>Intuitiv bedienbar</li>
  <li>Vollständig Spotify-kompatibel</li>
</ul>
{{< /slide >}}
