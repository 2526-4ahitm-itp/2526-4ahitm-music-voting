---
title: Hugo
description: Die Doku-Website lokal entwickeln und bauen
tags: [guide, hugo]
authors:
  - simone
date: 2025-03-03
lastmod: 2026-06-23
_build:
  list: never
---

Diese Website (die du gerade liest) ist mit **Hugo** und dem **Blowfish**-Theme gebaut.
Der Inhalt liegt unter `hugo/content/`.

## Voraussetzungen

- **Hugo Extended** (die CI nutzt Version `0.145.0`) – das Theme braucht die Extended-Variante wegen Dart Sass.
- Alternativ **Docker**, falls Hugo nicht lokal installiert ist.

## Lokal entwickeln

```shell
cd hugo
hugo server
```

Mit Docker (ohne lokale Hugo-Installation):

```shell
cd hugo
docker run --rm -it -v "$(pwd):/src" -p 1313:1313 hugomods/hugo:exts hugo server --bind 0.0.0.0
```

> [!NOTE]
> Hugo läuft auf **http://localhost:1313**.
> `hugo server` lädt die Seite beim Speichern automatisch neu.

## Statisch bauen

```shell
cd hugo
hugo --minify
```

Das Ergebnis liegt in `hugo/public/`.

## Deployment

Die Website wird über GitHub Pages bereitgestellt. Bei jedem Push auf `main`, der
`hugo/**` ändert, baut der Workflow `.github/workflows/hugo.yaml` die Seite
(Hugo Extended `0.145.0` + Dart Sass) und veröffentlicht sie.
