---
title: Live Window Image Generator
description: Generate a live window SVG with semi-accurate sky color and weather for any location
publishedOn: 2024-03-15
updatedOn: 2024-03-17
coverImage: live-window-image-generator/Screenshot 2025-07-02 at 22.04.40.png
coverImageAlt: A screenshot of a generated live window
category: tool
---

![Screenshot 2025-07-02 at 22.04.40.png](<live-window-image-generator/Screenshot 2025-07-02 at 22.04.40.png>)

| Links | |
| ------ | ------- |
| [Github →](https://github.com/thalida/live-window) | [API Docs →](https://livewindow-api.onrender.com/api/) |


## Usage

Embed the image into your HTML or Markdown Document:

```html
<img src="https://livewindow-api.onrender.com/api/" />
```


### API Options

| Parameter | Description | Options | Default |
|-----------|-------------|---------|---------|
| units     | Temperature units | `imperial` (`°F`), `metric` (`°C`), `standard` (`K`) | `metric` |
| lang     | Description language | `af`, `al`, `ar`, `az`, `bg`, `ca`, `cz`, `da`, `de`, `el`, `en`, `eu`, `fa`, `fi`, `fr`, `gl`, `he`, `hi`, `hr`, `hu`, `id`, `it`, `ja`, `kr`, `la`, `lt`, `mk`, `no`, `nl`, `pl`, `pt`, `pt_br`, `ro`, `ru`, `sv`, `se`, `sk`, `sl`, `sp`, `es`, `sr`, `th`, `tr`, `ua`, `uk`, `vi`, `zh_cn`, `zh_tw`, `zu` | `en` |
| location | Location latitude and longitude coordinates  | Any lat,lng | `40.7128,-74.0060` (New York City) |


## Examples

| Window | API Request |
|--------|-----------------------|
| <img src="https://livewindow-api.onrender.com/api/?location=40.7128,-74.0060&units=imperial" /> | **New York, USA (°F)** <br /> [https://livewindow-api.onrender.com/api/?location=40.7128,-74.0060&units=imperial](https://livewindow-api.onrender.com/api/?location=40.7128,-74.0060&units=imperial) |
| <img src="https://livewindow-api.onrender.com/api/?location=10.6603,-61.5086" /> | **Port of Spain, Trinidad & Tobago (°C)** <br /> [https://live-window.tunl.sh/api/?location=10.6603,-61.5086](https://live-window.tunl.sh/api/?location=10.6603,-61.5086) |
| <img src="https://livewindow-api.onrender.com/api/?units=standard&location=48.8566,2.3522&lang=fr" /> | **Paris, France (K)** <br /> [https://live-window.tunl.sh/api/?units=standard&location=48.8566,2.3522&lang=fr](https://live-window.tunl.sh/api/?units=standard&location=48.8566,2.3522&lang=fr) |


## FAQs

<details>
  <summary><strong>How do I find my lat, long coordinates?</strong></summary>

  You can use this tool to find your coordinates:
  <https://www.latlong.net/convert-address-to-lat-long.html>
</details>

<details>
  <summary>How do you embed the custom font?</summary>

  In order for the custom font to show when the image is downloaded or included in Github Markdown, the font needs to be encoded directly into the styles.
  Note: You can generate the base 64 encoding for any font here: <https://amio.github.io/embedded-google-fonts/>

  ```html
  <svg>
    <!-- Insert SVG Elements -->
    <defs>
      <style>
          @font-face {{
              font-family: 'Bebas Neue';
              font-style: normal;
              font-weight: 400;
              font-display: swap;
              src: url(data:font/woff2;[INSERT BASE64 ENCODING]) format('woff2');
              unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
          }}
      </style>
    </defs>
  </svg>
  ```

</details>


## Ideas, Improvements, and Iterations

- [ ] Support any google font
- [ ] Support hiding location and/or current weather


## How It's Made


### Frameworks, Tools, and Services

- API Framework: Python [Fast API](https://fastapi.tiangolo.com/)

- API Docs: [Stoplight Elements](https://github.com/stoplightio/elements)
- Hosting & Deployment: [Render](https://render.com/)
- Designed In: [Figma](https://www.figma.com/)


### Credits

- [Open Weather Map API](https://openweathermap.org/api): Powers Weather, sunrise, and sunset times

- [3D Weather Icons](https://ui8.net/msakta/products/weather-animated-icons)
- [Gradient Abstract Banners](https://www.figma.com/community/file/1063549775352406477/gradient-abstract-banners?searchSessionId=ltw9aro0-lwjp697d2fs)
