---
title: "Präsentation: MusicVoting"
layout: "presentation"
---

{{< slide class="title-slide" notes="Kurz vorstellen: wer wir sind, dass es um Partymusik geht. Live-App am Ende zeigen." >}}
<p class="kicker">ITP-Projekt · HTL Leonding · 4AHITM</p>
<h1>🎵 MusicVoting</h1>
<h3>Keine langweiligen Partys mehr</h3>
<p class="lead">Die Gäste bestimmen die Musik – live, anonym, per Smartphone.</p>
<div class="powered-by"><span>powered by</span><img src="htl-leonding-logo.jpg" alt="HTL Leonding"></div>
{{< /slide >}}

{{< slide title="Das Problem" >}}
<ul>
<li>Der Gastgeber hat <strong>keine Zeit</strong>, sich um die Musik zu kümmern</li>
<li>… oder nicht den <strong>gleichen Geschmack</strong> wie die Gäste</li>
<li>Ergebnis: schlechte Stimmung auf der Party 😴</li>
</ul>
{{< /slide >}}

{{< slide title="Die Lösung" >}}
<div class="cards">
<div class="card"><div class="icon">➕</div><h4>Wünschen</h4><p>Gäste suchen Songs und fügen sie zur Warteschlange hinzu.</p></div>
<div class="card"><div class="icon">❤️</div><h4>Voten</h4><p>Likes entscheiden, was als Nächstes läuft.</p></div>
<div class="card accent"><div class="icon">🔊</div><h4>Abspielen</h4><p>Die Musik läuft über den Spotify-Premium-Account des Gastgebers.</p></div>
</div>
{{< /slide >}}

{{< slide title="Drei Rollen" >}}
<div class="cards">
<div class="card"><div class="icon">📱</div><h4>Gast</h4><p>Tritt anonym bei, sucht, wünscht und liked – ohne Account.</p></div>
<div class="card"><div class="icon">👑</div><h4>Gastgeber</h4><p>Erstellt die Party, wählt eine Standard-Playlist und steuert die Wiedergabe.</p></div>
<div class="card accent"><div class="icon">🖥️</div><h4>Player (TV)</h4><p>Spielt die Musik ab und zeigt QR-Code, aktuellen Song und Warteschlange.</p></div>
</div>
{{< /slide >}}


{{< slide title="Voting & Warteschlange" >}}
<ul>
<li>Sortierung: <strong>mehr Likes zuerst</strong>, bei Gleichstand der ältere Wunsch</li>
<li>Keine Duplikate – nur der gerade laufende Song darf nochmal gewünscht werden</li>
<li>Jede Änderung erscheint <strong>sofort auf allen Geräten</strong></li>
</ul>
{{< /slide >}}

{{< slide title="Die Musik geht nie aus" notes="Früher offene Frage: was bei leerer Queue passiert. Jetzt entschieden: automatisch nachfüllen. Gast-Wünsche haben immer Vorrang." >}}
<p class="lead">Wünscht gerade niemand etwas, füllt MusicVoting kurz vor Songende <strong>einen</strong> Song nach:</p>
<div class="steps">
<div class="step"><span class="num">1</span><br>Standard-Playlist des Hosts</div>
<div class="arrow">→</div>
<div class="step"><span class="num">2</span><br>Ähnliche Songs der Party-Künstler</div>
<div class="arrow">→</div>
<div class="step"><span class="num">3</span><br>Top-Charts</div>
<div class="arrow">→</div>
<div class="step"><span class="num">4</span><br>Spotify-Suche</div>
</div>
<p class="lead">Wünsche der Gäste spielen <strong>immer zuerst</strong>.</p>
{{< /slide >}}


{{< slide title="Technischer Stack" >}}
<div class="cards" style="--cols: 4">
<div class="card"><div class="icon">☕</div><h4>Backend</h4><p>Quarkus (Java 21), REST + Server-Sent Events</p></div>
<div class="card"><div class="icon">🅰️</div><h4>Frontend</h4><p>Angular – Gast, Host und Player</p></div>
<div class="card"><div class="icon">🐘</div><h4>Datenbank</h4><p>PostgreSQL 16 – Quelle der Wahrheit für Warteschlange</p></div>
<div class="card accent"><div class="icon">📱</div><h4>iOS-App</h4><p>SwiftUI – Gast- und Host-Ansicht</p></div>
</div>
{{< /slide >}}


{{< slide kicker="Die Programmiererinnen dahinter!" title="Team" >}}
<div class="team">
<div class="member"><strong>Miriam Gnadlinger</strong><span class="role">Project Lead</span></div>
<div class="member"><strong>Simone Sperrer</strong><span class="role">Team</span></div>
<div class="member"><strong>Marlies Winklbauer</strong><span class="role">Team</span></div>
</div>
<div class="powered-by"><span>powered by</span><img src="htl-leonding-logo.jpg" alt="HTL Leonding"></div>
{{< /slide >}}

{{< slide title="Live-Demo" notes="Party mit eigenem Premium-Account erstellen, Player am Beamer öffnen, Publikum per QR beitreten lassen." >}}
<p class="lead">Die App läuft – einfach im Browser öffnen:</p>
<a class="big-link" href="https://it220241.cloud.htl-leonding.ac.at">it220241.cloud.htl-leonding.ac.at</a>
{{< /slide >}}
