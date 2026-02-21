---
title: "2017: Lowpoly Space"
description: "Split-screen v2: Re-using the lowpoly space scene an earlier version"
publishedOn: 2017-03-01
category: "2017"
tags: [vue]
coverImage: 2017-1-lowpoly-space/Untitled.png
coverImageAlt: A lowpoly space scene, showing a split-screen with the sun, moon, and earth.
---

![Untitled](2017-1-lowpoly-space/Untitled.png)

| Year | GitHub | Link |
| ---- | ------ | ---- |
| Mar 2017 - Dec 2017 | [Github](https://github.com/thalida/thalida.com/tree/v-2017-1) | [Live](https://2017-1.v.thalida.com) |


## Story

After creating the first split screen version
([Color Split](Color%20Split%20845cf31e264142cbb1c6977f9aa83a1d.md)), I wanted to push myself
and actually implement the lowpoly space scene with weather that I'd previously abandoned in
[Fullscreen Lowpoly](Full%C2%ADscreen%20Low%C2%ADpoly%204f9eddf446cb4d46bbbe5bf85cad60ab.md).


## Design

![Lowpoly space mockup](2017-1-lowpoly-space/mock.2.png)

This is one of those times where the final results almost perfectly match the mockup.


## How it Works


### Live Sun & Moon

The sun and moon rotate around the earth based on the current time, yes this is a very Geocentric
model of how the solar system works. The color of space also changes throughout the day.


### Weather

I fetch the weather data using [DarkSky](https://darksky.net/poweredby/), and it's displayed
animated floating above the earth.


### Illustrations

I created all of the images used in the scene with [Maxon3D](https://www.maxon.net/en-us/),
they were previously created for an older version of the site that I abandoned
([Fullscreen Lowpoly](Full%C2%ADscreen%20Low%C2%ADpoly%204f9eddf446cb4d46bbbe5bf85cad60ab.md))
