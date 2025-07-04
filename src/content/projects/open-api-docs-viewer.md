---
title: "VSCode Extension: OpenAPI Docs Viewer"
description: Display interactive OpenAPI schema documentation in VSCode.
publishedOn: 2024-04-19
updatedOn: 2024-04-21
coverImage: open-api-docs-viewer/theme-elements-dark-large.png
coverImageAlt: "Screenshot of OpenAPI Docs Viewer in VSCode with Elements renderer in dark theme."
category: tool
---

![Overview](https://raw.githubusercontent.com/thalida/openapi-docs-viewer/refs/heads/main/media/screenshots/overview.gif)

| Links | |
| ------ | ------- |
| [Github →](https://github.com/thalida/openapi-docs-viewer) | [Marketplace →](https://marketplace.visualstudio.com/items?itemName=thalida.openapi-docs-viewer) |


## Features

Enter any OpenAPI schema URL and view the documentation in a VSCode tab. You can customize the schema renderer and theme.


### Supported Renderers

<details>
  <summary><strong>Elements (Default)</strong></summary>

  Build beautiful, interactive API Docs with embeddable React or Web Components, powered by OpenAPI and Markdown.
  <https://github.com/stoplightio/elements>

  **Preview**
  <table>
    <tr>
      <td><strong>Theme</strong></td>
      <td><strong>Layout: Mobile</strong></td>
      <td><strong>Layout: Desktop</strong></td>
    </tr>
    <tr>
      <td>Dark</td>
      <td><img src="https://raw.githubusercontent.com/thalida/openapi-docs-viewer/refs/heads/main/media/screenshots/theme-elements-dark-small.png" alt="Elements Dark Theme: Small" width="300"/></td>
      <td><img src="https://raw.githubusercontent.com/thalida/openapi-docs-viewer/refs/heads/main/media/screenshots/theme-elements-dark-large.png" alt="Elements Dark Theme: Large" width="600"/></td>
    </tr>
    <tr>
      <td>Light</td>
      <td><img src="https://raw.githubusercontent.com/thalida/openapi-docs-viewer/refs/heads/main/media/screenshots/theme-elements-light-small.png" alt="Elements Light Theme: Small" width="300"/></td>
      <td><img src="https://raw.githubusercontent.com/thalida/openapi-docs-viewer/refs/heads/main/media/screenshots/theme-elements-light-large.png" alt="Elements Light Theme: Large" width="600"/></td>
    </tr>
  </table>
</details>
<details>
  <summary><strong>RapiDoc</strong></summary>

  Custom Element for Open-API spec viewing
  <https://github.com/rapi-doc/RapiDoc>

  **Preview**
  <table>
    <tr>
      <td><strong>Theme</strong></td>
      <td><strong>Layout: Mobile</strong></td>
      <td><strong>Layout: Desktop</strong></td>
    </tr>
    <tr>
      <td>Dark</td>
      <td><img src="https://raw.githubusercontent.com/thalida/openapi-docs-viewer/refs/heads/main/media/screenshots/theme-rapidoc-dark-small.png" alt="RapiDoc Dark Theme: Small" width="300"/></td>
      <td><img src="https://raw.githubusercontent.com/thalida/openapi-docs-viewer/refs/heads/main/media/screenshots/theme-rapidoc-dark-large.png" alt="RapiDoc Dark Theme: Large" width="600"/></td>
    </tr>
    <tr>
      <td>Light</td>
      <td><img src="https://raw.githubusercontent.com/thalida/openapi-docs-viewer/refs/heads/main/media/screenshots/theme-rapidoc-light-small.png" alt="RapiDoc Light Theme: Small" width="300"/></td>
      <td><img src="https://raw.githubusercontent.com/thalida/openapi-docs-viewer/refs/heads/main/media/screenshots/theme-rapidoc-light-large.png" alt="RapiDoc Light Theme: Large" width="600"/></td>
    </tr>
  </table>
</details>
<details>
  <summary><strong>ReDoc</strong></summary>

  OpenAPI/Swagger-generated API Reference Documentation
  <https://github.com/Redocly/redoc>

  **Preview**
  <table>
    <tr>
      <td><strong>Theme</strong></td>
      <td><strong>Layout: Mobile</strong></td>
      <td><strong>Layout: Desktop</strong></td>
    </tr>
    <tr>
      <td>Dark</td>
      <td><img src="https://raw.githubusercontent.com/thalida/openapi-docs-viewer/refs/heads/main/media/screenshots/theme-redoc-dark-small.png" alt="Redoc Dark Theme: Small" width="300"/></td>
      <td><img src="https://raw.githubusercontent.com/thalida/openapi-docs-viewer/refs/heads/main/media/screenshots/theme-redoc-dark-large.png" alt="Redoc Dark Theme: Large" width="600"/></td>
    </tr>
    <tr>
      <td>Light</td>
      <td><img src="https://raw.githubusercontent.com/thalida/openapi-docs-viewer/refs/heads/main/media/screenshots/theme-redoc-light-small.png" alt="Redoc Light Theme: Small" width="300"/></td>
      <td><img src="https://raw.githubusercontent.com/thalida/openapi-docs-viewer/refs/heads/main/media/screenshots/theme-redoc-light-large.png" alt="Redoc Light Theme: Large" width="600"/></td>
    </tr>
  </table>
</details>
<details>
  <summary><strong>Swagger</strong></summary>

  Swagger UI is a collection of HTML, JavaScript, and CSS assets that dynamically generate beautiful documentation from a Swagger-compliant API.
  <https://github.com/swagger-api/swagger-ui>

  **Preview**
  <table>
    <tr>
      <td><strong>Theme</strong></td>
      <td><strong>Layout: Mobile</strong></td>
      <td><strong>Layout: Desktop</strong></td>
    </tr>
    <tr>
      <td>Dark</td>
      <td><img src="https://raw.githubusercontent.com/thalida/openapi-docs-viewer/refs/heads/main/media/screenshots/theme-swagger-dark-small.png" alt="Swagger Dark Theme: Small" width="300"/></td>
      <td><img src="https://raw.githubusercontent.com/thalida/openapi-docs-viewer/refs/heads/main/media/screenshots/theme-swagger-dark-large.png" alt="Swagger Dark Theme: Large" width="600"/></td>
    </tr>
    <tr>
      <td>Light</td>
      <td><img src="https://raw.githubusercontent.com/thalida/openapi-docs-viewer/refs/heads/main/media/screenshots/theme-swagger-light-small.png" alt="Swagger Light Theme: Small" width="300"/></td>
      <td><img src="https://raw.githubusercontent.com/thalida/openapi-docs-viewer/refs/heads/main/media/screenshots/theme-swagger-light-large.png" alt="Swagger Light Theme: Large" width="600"/></td>
    </tr>
  </table>
</details>


### Themes

**Supported Themes**: `system`, `light`, `dark`
**Default Theme**: `system`

By default, the extension will use the system theme. System theme adopts the color scheme of the current VSCode theme. If you want to override the system theme, you can set the `openapi-docs-viewer.defaultTheme` setting to `dark` or `light`.


### Layout

**Supported Layouts**: `responsive`, `mobile`, `desktop`
**Default Layout**: `responsive`

By default, the extension will use the responsive layout. If you want to override the layout, you can set the `openapi-docs-viewer.defaultLayout` setting to `mobile` or `desktop`.


## Extension Settings

This extension contributes the following settings:

* `openapi-docs-viewer.defaultRenderer`: Set the default theme for the OpenAPI viewer, default is `elements`.
* `openapi-docs-viewer.defaultTheme`: Set the default color scheme, default is `system`.
* `openapi-docs-viewer.defaultLayout`: Set the default layout, default is `responsive`.
