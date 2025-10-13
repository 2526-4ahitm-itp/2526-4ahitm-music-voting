---
title: Hugo
description: How do run and develop with hugo
tags: [guide, hugo]
authors:
  - jakob
date: 2025-03-03
lastmod: 2025-03-03
---

## Prerequisites

- hugo or docker

## developing

```shell
cd hugo
hugo server
```

Or if hugo isn't installed:


```shell
./hugo-docker.sh server
```


> [!INFO] Hugo runs on localhost:1313
> hugo server will automatically reload the page when you save a file.\
> Hugo server with docker will not refresh automatically

