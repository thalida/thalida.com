---
title: "2025: Astro Animated"
description: thalida.com built with Astro, featuring an animated window effect.
publishedOn: 2025-07-02
category: "2025"
tags: [astro, animated-window, thalida.com]
coverImage: 2025-astro-animated/screenshot-analog-clock-day.png
coverImageAlt: "Screenshot of the Astro Animated portfolio in light mode showing profile card, animated analog clock, and Scene Controls panel"
---

![Screenshot of the Astro Animated portfolio in dark mode with Scene Controls panel showing custom time field](2025-astro-animated/screenshot-analog-clock-dark.png)

| Year | GitHub | Link |
| ---- | ------ | ---- |
| Jul 2025 - Feb 2026 | [Github](https://github.com/thalida/thalida.com/tree/v-2025) | [Live](https://2025.v.thalida.com) |


## Goals

After having used Super / Notion for a while, I wanted to move to a more flexible and
customizable solution. Super was great for quick setups, but I missed the ability to fully
control the design and functionality of my site.


## Blog Implementation

The site is built using [Astro](https://astro.build/), a modern static site generator
that allows for a high degree of customization and performance optimization.

The site is deployed on [Vercel](https://vercel.com/), which provides excellent performance
and scalability.


## Live Weather & Time


### Implementation

![Screenshot of the Astro Animated portfolio in dark mode with Scene Controls panel showing custom time field](2025-astro-animated/screenshot-analog-clock-dark.png)

![Screenshot of the Astro Animated portfolio in light mode with digital clock style showing glowing LED-style clock](2025-astro-animated/screenshot-digital-clock-day.png)

The live weather and time functionality is implemented using the
[Open Weather API](https://openweathermap.org/api). I get the users current location using
their IP via [https://ipregistry.co/](https://ipregistry.co/).

The window itself is made by using a custom Web Component which enables me to place the
window anywhere on any page easily. The web component loads and renders a scene created
with [Matter JS](https://brm.io/matter-js/).


### Customization

<img
src="/content/versions/2025-astro-animated/weather-digital.gif"
alt="Animated GIF of the Astro Animated live weather scene with glowing segmented digital clock and rain particles" />

<img
src="/content/versions/2025-astro-animated/weather-analog.gif"
alt="Animated GIF of the Astro Animated analog clock with weather effects including snow, fog, and wind" />

The window effect is customizable, users can switch between analog and digital clocks,
change the time, and choose between different weather effects


## Design Inspiration


### Colors, Vibe, Layout

![Inspiration screenshot of minimal white website hero section with bold headline and 3D rendered green textured blob](2025-astro-animated/inspo/inspo-minimal-hero-3d.png)

![Inspiration screenshot of bold editorial blog layout with large headline text, fitness photography, and article grid](2025-astro-animated/inspo/inspo-editorial-blog-layout.png)

![Inspiration screenshot of creative studio website hero with 3D rendered desk scene](2025-astro-animated/inspo/inspo-3d-studio-hero.png)

![Inspiration screenshot of dark-themed split-screen login page with green gradient promotional panel](2025-astro-animated/inspo/inspo-dark-split-login.png)

- <https://piqo.studio/>
- <https://dribbble.com/shots/21289412-Blog-Page-for-Fitness-Website>
- <https://dribbble.com/shots/25771286-Modern-Website>
- <https://dribbble.com/shots/26107156-Smart-Streaming-Interface>
- <https://dribbble.com/shots/26121703-Credly-Fintech-Landing-Page-Hero>
- <https://dribbble.com/shots/25721588-Case-Study-Blanket-Brand-Visual-Identity-and-Packaging>
- <https://dribbble.com/shots/25445552-Loyalty-Cards-Wallet-App-Animation>


### Cards

![Inspiration screenshot showing stacked job listing cards from companies on lavender background](2025-astro-animated/inspo/inspo-job-listing-cards.png)

![Inspiration screenshot showing pastel-colored service category cards for Web Design, Graphic Design, Developers, and Copywriting](2025-astro-animated/inspo/inspo-service-category-cards.png)

- <https://dribbble.com/shots/26039541-City-flight-ticket-booking-cards>
- <https://dribbble.com/shots/24317197--talently-brand-identity-cards>
- <https://dribbble.com/shots/26043592-Talent-Hire-Platform-Website-UI-Design-Cards>


## Meta

<details>
  <summary>Styleguide & Components</summary>


### Admonitions


#### Note

> [!NOTE]
> Optional information that can help users understand the context or provide additional insights.

```md
> [!NOTE]
> Optional information that can help users understand the context or provide additional insights.
```


#### Tip

> [!TIP]
> Optional information to help a user be more successful.

```md
> [!TIP]
> Optional information to help a user be more successful.
```


#### Important

> [!IMPORTANT]
> Crucial information necessary for users to succeed.

```md
> [!IMPORTANT]
> Crucial information necessary for users to succeed.
```


#### Warning

> [!WARNING]
> Critical content demanding immediate user attention due to potential risks.

```md
> [!WARNING]
> Critical content demanding immediate user attention due to potential risks.
```


#### Caution

> [!CAUTION]
> Negative potential consequences of an action.

```md
> [!CAUTION]
> Negative potential consequences of an action.
```

</details>
