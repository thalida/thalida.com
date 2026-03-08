---
title: "2022: Super Window"
description: A Notion-backed site
publishedOn: 2022-01-01
category: "2022"
tags: [notion, super, svelte, vercel]
coverImage: 2022-super-window/screenshot-live-dark.png
coverImageAlt: "Live screenshot of the Super Window portfolio in dark mode showing illustrated window with venetian blinds and digital clock"
---

![Live screenshot of the Super Window portfolio in dark mode showing illustrated window with venetian blinds and digital clock](2022-super-window/screenshot-live-dark.png)

| Year | GitHub | Link |
| ---- | ------ | ---- |
| Jan 2022 - Jul 2025 | [Github](https://github.com/thalida/thalida.com/tree/v-2022) | [Live](https://2022.v.thalida.com) |


## 💡Idea

For the next version of my domain, I wanted a site where I could easily add and edit content,
a low-barrier way for me to provide updates on my work. After digging around, I came across
[Super](https://super.so) and realized it was exactly what I needed.


## 👩🏾‍💻 Development


### Overview

The site is hosted on Super, pulling content from a notion site. The day/night-mode theme
switcher, and the "live" window on the homepage use Svelte. This was my first time developing
with Svelte, and I found it perfect for injecting a small javascript component onto the page.
My custom theme styles and javascript are deployed and hosted on Vercel (Super supports
custom code).


### Live Window

For this iteration of the Live Window, I switched to using the
[Open Weather API](https://openweathermap.org/api), in order to get the users location I'm
basing it off of their ip address, which I fetch using [IP Registry](https://ipregistry.co/).

```jsx
export async function fetchWeather($store) {
  // Partial version of this function, I've removed my caching logic
  await fetchLocation($store);

  const { lat, lng } = $store.location;
  const url = `https://api.openweathermap.org/data/2.5/weather?units=metric&lat=${lat}&lon=${lng}&appid=${OPEN_WEATHER_KEY}`;
  const { data } = await axios.get(url);
  $store.weather.current = {
    ...data.weather[0],
    temp: data.main.temp,
  };
  $store.weather.sunrise = data.sys.sunrise * 1000; // convert to milliseconds
  $store.weather.sunset = data.sys.sunset * 1000; // ^^
  $store.weather.lastFetched = Date.now();
  store.set($store);
  isDataFetched.set(true);
}
```


### `Deprecated` Theme Switcher (Day/Night Mode)

> [!NOTE]
> ⛔ **29 April 2023**
> An update of Super added support for a built-in theme switcher that I've started using instead.

For the first time, I've added a day/night mode switcher to my site. Finally in the future!
It's not finalized yet (I still don't account for user preferences) but otherwise it's fully
functional.

![Animated GIF showing the Super Window site dark/light theme toggle transition](2022-super-window/theme-toggle.gif)

You can checkout the code and fork this theme switcher on codpen!
[https://codepen.io/thalida/pen/XWEVVaj](https://codepen.io/thalida/pen/XWEVVaj)

_This theme switcher is a fork of
[https://codepen.io/sandeshsapkota/pen/xxVmMpe](https://codepen.io/sandeshsapkota/pen/xxVmMpe)._


## 🎨 Design


### Inspiration

[tsh by Thalida Noel](https://dribbble.com/thalida/collections/2416474-tsh)

[thalida 2020 v2 by Thalida Noel](https://dribbble.com/thalida/collections/2130994-thalida-2020-v2)

[thalida 2020 by Thalida Noel](https://dribbble.com/thalida/collections/1686189-thalida-2020)


### Paper Sketches

![Hand-drawn sketch showing early thalida.me site structure concepts including list-based layout and fullpage HTML concept](2022-super-window/sketch-site-structure.png)

![Hand-drawn sketch showing window layout variations in blue ink, feature notes, and window frame experiments](2022-super-window/sketch-window-and-layout-concepts.png)

![Hand-drawn sketch with wireframes for Home and About pages, post layouts, and gallery grid](2022-super-window/sketch-page-wireframes.png)

![Hand-drawn sketch showing five window design variations side by side including illustrated, minimal, and venetian blind styles](2022-super-window/sketch-window-style-explorations.png)

![Hand-drawn sketch with notes about art, code snippets, weather, and interactive art features](2022-super-window/sketch-app-and-content-concepts.png)

![Hand-drawn sketch exploring portfolio grid layout with year/story aggregator and timeline from 2010 to 2021](2022-super-window/sketch-portfolio-grid-and-timeline.png)

![Hand-drawn sketch showing journal and gallery page layout concepts with chronological content grid](2022-super-window/sketch-journal-and-gallery-layouts.png)
