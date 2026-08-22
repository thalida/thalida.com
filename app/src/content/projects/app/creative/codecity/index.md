---
title: codecity
description: Turn any git repo into a 3D city
publishedOn: 2021-11-06
updatedOn: 2026-08-21
coverImage: /content/projects/app/creative/codecity/cover.png
coverImageAlt: Side-on view of the codecity skyline — a floating island of
  colorful buildings along dark streets, under a forest of commit trees
tags:
  - threejs
  - typescript
  - preact
  - python
  - fastapi
  - docker
  - git
---

![Side-on view of the codecity skyline — a floating island of colorful buildings along dark streets, under a forest of commit trees](/content/projects/app/creative/codecity/cover.png)

| Links | |
| --- | --- |
| [codecity.io →](https://codecity.io) | [Github →](https://github.com/thalida/codecity) |
| [Docker image →](https://ghcr.io/thalida/codecity) | [Legacy repo →](https://github.com/thalida/codecity-legacy) |

> [!NOTE]
> This post and codecity were created collaboratively with Claude.
> Thalida designed the vision, the world, and the rules that turn a
> repo into a city; Claude helped with implementation, architecture,
> and writing this post.


## What It Is

codecity turns any git repo into a 3D city. It walks the file tree and
the git history and builds a world out of them:

| In the repo | In the city |
| --- | --- |
| A directory | A street, widened by what it holds |
| A file | A building, floors stacked by line count |
| A file's type | The facade — CSS, TS, an image, a waveform |
| A file's age | How faded and weathered the building looks |
| A commit | A tree |
| An author | A firefly, orbiting their commit tree |

Open any public repo at [codecity.io](https://codecity.io), or see the
[local dev setup](https://github.com/thalida/codecity#run-it-yourself)
to run it against your own private and local repos.


## The Timeline

I came up with this idea many many years ago, and finally, via the power
of AI, was able to properly bring it to reality.

> [!NOTE]
> Every milestone below links to **that exact commit rendered in
> codecity**.


### Act One: The Early Years

The early versions live in
[codecity-legacy](https://github.com/thalida/codecity-legacy).

| When | Milestone |
| --- | --- |
| **Nov 2021** | **It's a real city**<br>Eight days from a commit called _"well fuck it works?"_ to a rendered city with a first-person camera, skybox and fog. A Python API read the repo with gitpython; the browser drew what came back.<br>[See this commit as a city →](https://codecity.io/city?src=https://github.com/thalida/codecity-legacy&branch=main&mode=timeline&commit=679ec74269575dd8a3968f60773f30772dff43b1)<br><br><img src="/content/projects/app/creative/codecity/sketch-isometric-city-island.png" alt="Hand-drawn sketch of an isometric city on an island with buildings, trees, streets, and a thalida.com sign, with handwritten notes about street placement rules" /> |
| **Jun 2022** | **Rewritten in A-Frame**<br>Rendering moves to A-Frame, the build to Vite, and the roads get a new layout algorithm. Four commits, then two years of silence.<br>[See this commit as a city →](https://codecity.io/city?src=https://github.com/thalida/codecity-legacy&branch=main&mode=timeline&commit=7535a38e184999d5a01d52a191c048036d6a3597) |
| **Jan 2024** | **Streaming, and a framework carousel**<br>FastAPI and pydantic, streaming responses over websockets and workers. The frontend went Remix, then React out, then Svelte — in three days. Tile-based rendering, real revision stats. Then it stopped.<br>[See this commit as a city →](https://codecity.io/city?src=https://github.com/thalida/codecity-legacy&branch=main&mode=timeline&commit=98cd47127741b74a5ebdbfa9a42b07bbb4870e23) |
| **Jan 2026** | **"re-re-start"**<br>A reset, a Django rewrite, a devcontainer, RabbitMQ and an architecture doc. Abandoned two days later.<br>[See this commit as a city →](https://codecity.io/city?src=https://github.com/thalida/codecity-legacy&branch=main&mode=timeline&commit=d8264c559eb79166f69078ba5f8bf8302077ea15) |


### Act Two: The Rebuild

A fresh repo, [thalida/codecity](https://github.com/thalida/codecity),
started 18 April 2026.

| When | Milestone |
| --- | --- |
| **18 Apr 2026** | **The first city**<br>A filesystem scanner, an isometric renderer and a street-tier layout — all on day one.<br>[See this commit as a city →](https://codecity.io/city?src=https://github.com/thalida/codecity&branch=main&mode=timeline&commit=37b9a4a5102a417827910acb5cb039b3d4d6abd5)<br><br><img src="/content/projects/app/creative/codecity/2026-04-19-first-city.png" alt="Flat isometric city of five pastel buildings on dark diamond plots, labelled tests, sample-repo, docs and src" /> |
| **19 Apr 2026** | **One file, one skyscraper**<br>The renderer moves to Three.js and buildings become stacks of fixed-size floor units — so a single long file towers over the whole city. The scanner is rewritten in Python the same day: 82s → 6s.<br>[See this commit as a city →](https://codecity.io/city?src=https://github.com/thalida/codecity&branch=main&mode=timeline&commit=df4f88de13a0fef9ba0dfe0ca0ac2972f271e70e)<br><br><img src="/content/projects/app/creative/codecity/2026-04-20-runaway-skyscraper.png" alt="3D city where one pale tower is many times taller than every other building, dwarfing the street below" /> |
| **12 May 2026** | **Three packers before one worked**<br>Streets collided and subtrees overlapped each other. A v3 mirror-variant packer, then a V4 global-occupancy packer with bounded phantom spacing.<br>[See this commit as a city →](https://codecity.io/city?src=https://github.com/thalida/codecity&branch=main&mode=timeline&commit=99723e181d6796107f7af22d80ee37d1ca4c466f)<br><br><img src="/content/projects/app/creative/codecity/2026-05-09-layout-collapse.png" alt="City layout collapsed into a flat tangle of thin overlapping lines instead of separated streets" /> |
| **14 May 2026** | **Buildings that say what they are**<br>A procedural facade shader writes each file's type onto its face, one mesh per directory. Then the lighting lands: directional sun, HDR bloom, age-driven decay, ground haze.<br>[See this commit as a city →](https://codecity.io/city?src=https://github.com/thalida/codecity&branch=main&mode=timeline&commit=5ae3a636096a57afefb167677b00e09b34a47126)<br><br><img src="/content/projects/app/creative/codecity/2026-05-13-css-facade.png" alt="Close-up of a small blue building with a neon rim light and the letters CSS printed on its roof" /> |
| **19 May 2026** | **Built for Linux-scale**<br>Blobless clones, an NDJSON streaming manifest and cell-based rendering — so a 90,000-file repo draws instead of dying.<br>[See this commit as a city →](https://codecity.io/city?src=https://github.com/thalida/codecity&branch=main&mode=timeline&commit=e769bcd9200a1f6ddf571507878e5f9dea068793)<br><br><img src="/content/projects/app/creative/codecity/2026-06-20-scanning-linux.png" alt="Loading panel over a dark city reading torvalds/linux, Scanning files, with resolving source and cloning already ticked" /> |
| **23 May 2026** | **The city gets an island**<br>A floating island world plane, with sky, ground and foliage. And commit-driven trees: every commit in the history plants one.<br>[See this commit as a city →](https://codecity.io/city?src=https://github.com/thalida/codecity&branch=main&mode=timeline&commit=21f950405d459bf35efc8a8d036f5ca53b814338)<br><br><img src="/content/projects/app/creative/codecity/2026-05-23-the-island.png" alt="Colorful city districts sitting on a dark green floating island with a rocky underside, against a black sky" /> |
| **28 May 2026** | **Every author becomes a firefly**<br>One orb per author on each commit, co-authors included, orbiting their commit tree. Hover a tree to read the commit that grew it.<br>[See this commit as a city →](https://codecity.io/city?src=https://github.com/thalida/codecity&branch=main&mode=timeline&commit=2ad4b080daf2f477c17e7a9031b342ef5d9eb52a)<br><br><img src="/content/projects/app/creative/codecity/2026-05-29-trees-and-fireflies.png" alt="Top-down view of a dense multicolored city with labelled streets, surrounded by a forest of low-poly trees" /> |
| **19 Jun 2026** | **Rebuilt underneath**<br>Preact and signals on the front, FastAPI on the back, and a layout worker about ten times faster. A month of work with nothing to show for it.<br>[See this commit as a city →](https://codecity.io/city?src=https://github.com/thalida/codecity&branch=main&mode=timeline&commit=cfe425be44970c8bd579fdcedeb8057f0893f6bc) |
| **24 Jul 2026** | **Scrub the history, watch it grow**<br>Drag through the commit log and the city rebuilds at each commit — each commit's own content, with deleted files marked by a cross on the roof.<br>[See this commit as a city →](https://codecity.io/city?src=https://github.com/thalida/codecity&branch=main&mode=timeline&commit=31d76e62ebfd21f08e087bb74deea049fd8e4841)<br><br><img src="/content/projects/app/creative/codecity/2026-07-22-time-travel.png" alt="codecity showing a floating island city with a timeline scrubber along the bottom, resting on a commit from March 2024" /> |
| **8 Aug 2026** | **codecity.io**<br>Shipped from a tagged release. Cold load cut from about three minutes to twenty-five seconds, with a Discover list and a live city rendering behind the landing page.<br>[See this commit as a city →](https://codecity.io/city?src=https://github.com/thalida/codecity&branch=main&mode=timeline&commit=32986088020aa5b2f3531518c0417aca421f635b)<br><br><img src="/content/projects/app/creative/codecity/2026-08-demo.webp" alt="Animated demo of codecity orbiting its own repository, streets of buildings under a forest of commit trees" /> |


## Design


### Inspiration

[Code City by Thalida Noel](https://dribbble.com/thalida/collections/2030629-Code-City)


### Paper Sketches

The rules I drew in 2021 are, more or less, the rules that shipped:
streets are folders, street width follows what's nested inside, and a
building ages with the file it stands for.

| --- | --- |
| --- | --- |
| ![Sketch of an isometric city on an island with buildings, trees, and handwritten notes about street edge gaps, alternating sides, and fit-to-grid rules](/content/projects/app/creative/codecity/sketch-isometric-city-with-notes.png) | ![Sketch exploring building types and people figures for the city, with notes about 3D buildings representing file types and people representing viewers](/content/projects/app/creative/codecity/sketch-building-types-and-people.png) |
| ![Sketch of a directory-as-grid layout with nested rectangles representing folders, blue squares as files, and notes about directory thickness mapping to road width](/content/projects/app/creative/codecity/sketch-directory-grid-layout.png) | |


## How It's Made


### Frameworks, Tools, and Services

- **Rendering**: [Three.js](https://threejs.org/) with a procedural
  facade shader
- **Frontend**: [Preact](https://preactjs.com/) + signals, TypeScript,
  [Vite](https://vite.dev/)
- **Backend**: Python, [FastAPI](https://fastapi.tiangolo.com/),
  pydantic, SSE
- **Packaging**: A single [Docker](https://www.docker.com/) image on
  GHCR — `docker run ghcr.io/thalida/codecity`
- **Hosting**: [codecity.io](https://codecity.io)


### AI Collaborators

Every commit was written in collaboration with
[Claude](https://claude.com/claude-code).

| Model | Commits | Span |
| --- | --- | --- |
| Claude Opus 4.6 (1M context) | 12 | 18 Apr 2026 |
| Claude Sonnet 4.6 | 31 | Apr – Jun 2026 |
| Claude Opus 4.7 (1M context) | 126 | Apr – Jun 2026 |
| Claude Opus 4.8 (1M context) | 52 | Jun – Jul 2026 |
| Claude Fable 5 | 10 | Jun – Aug 2026 |
| Claude Sonnet 5 (1M context) | 1 | 20 Jul 2026 |
| Claude Opus 5 (1M context) | 39 | Jul – Aug 2026 |

The one AI-assisted commit in the legacy repo — January 2026, right
before the rebuild — was co-authored with Claude Opus 4.5.
