---
title: "Internes Dokument - Merge Conflicts"
_hideContent: true
showReadingTime: false
showToc: false
draft: false
_build:
  list: never
---

# Merge Conflicts Cheatsheet

Merge Conflicts treten auf, wenn Git nicht automatisch entscheiden kann, 
wie Änderungen von verschiedenen Branches zusammengeführt werden sollen. 
Hier ist eine kurze Anleitung, wie man mit Merge Conflicts umgeht.

Wenn Merge Conflicts auftreten, weil der Branch von dem unserer ausgeht (main), 
in der zwischenzeit änderungen bekommen hat, 
treten merge conflicts auf, wenn wir versuchen, unseren Branch mit main zu mergen.

## Schritte zur Behebung von Merge Conflicts
### 1. Den Branch den man mergen möchte in der IDE öffnen

````
git swichth <branch-name>
````
![01](../intern-img/01_merge_conflict.png)
### 2. Main fetchen

````
git fetch --all
````
### 3. Rebase

````
git rebase origin/main
````
### 4. Erneut pushen

````
git push --force-with-lease
````
### 5. Nun kann man im Web den Branch mergen.
![02](../intern-img/02_merge_conflict.png)
![03](../intern-img/03_merge_conflict.png)

### 6. Wenn der Branch gemerged ist, kann man den Branch löschen.
![04](../intern-img/04_merge_conflict.png)

### 7. anschließend den Branch in der IDE löschen.
#### Lokales Git-Repository aktualisieren

````
git fetch --prune
````
#### Branch lokal löschen

````
git branch -d <branch-name>
````

