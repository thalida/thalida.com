---
title: unpack.link
description: Twitter and Web Crawler
publishedOn: 2020-07-14
updatedOn: 2020-10-06
tags:
  - python
  - rabbitmq
  - scrapper
  - twitter
  - vue
  - web crawler
coverImage: unpack-link/url-input-bar.png
coverImageAlt: unpack.link URL input bar with bright blue background showing
  "http://" placeholder text and a submit arrow button
---

![unpack.link URL input bar with blue background and http:// placeholder](unpack-link/url-input-bar.png)

| Links                                              |     |
| -------------------------------------------------- | --- |
| [Github →](https://github.com/thalida/unpack.link) |     |


## Idea

Unroll a twitter thread to its original source. Get to the top of a twitter thread, and if that
points to another thread go to the top of that one, and if that points to an article find all the
sources in the article, and... and.. and...

![Animated demo showing a nested Twitter thread being unrolled to reveal the original conversation](unpack-link/nested-tweet-thread.gif)


## ToDo

- [ ] Improve site performance
- [ ] Make it obey bot rules


## WIP Demo

|     |     |
| --- | --- |
| ![Demo crawl animation showing link unpacking in progress, example 1](unpack-link/demo-crawl-1.gif) | ![Demo crawl animation showing link unpacking in progress, example 2](unpack-link/demo-crawl-2.gif) |
| ![Demo crawl animation showing link unpacking in progress, example 3](unpack-link/demo-crawl-3.gif) | ![Demo crawl animation showing link unpacking in progress, example 4](unpack-link/demo-crawl-4.gif) |


## Design


### Inspiration

[unpack.link by Thalida Noel](https://dribbble.com/thalida/collections/1735010-unpack-link)


### Mockups

|     |     |
| --- | --- |
| ![unpack.link home mockup with abstract neon 3D shape on dark background and URL input field](unpack-link/mockup-home-dark.png) | ![unpack.link results page showing 64 links across 54 sites for thalida.me, organized by degrees of separation](unpack-link/mockup-results.png) |
