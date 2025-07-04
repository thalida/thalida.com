---
title: Napkin Notes
description: An encrypted, lightweight, note-taking app for quick math, short-term tasks, and temporary notes.
publishedOn: 2024-03-23
updatedOn: 2024-04-01
coverImage: napkinnotes/316388682-7c94cbc2-1702-42b5-a7e1-b8e5fbdedb75.gif
coverImageAlt: A screenshot of the Napkin Notes app showing a note with headings, lists, and math calculations.
category: app
---

![napkin-notes](https://github.com/thalida/napkinnotes/assets/3401715/7c94cbc2-1702-42b5-a7e1-b8e5fbdedb75)

| Links | | |
| ------ | ------- | ------- |
| [Github →](https://github.com/thalida/napkinnotes) | [API Docs →](https://api.napkinnotes.app) | [Website →](https://napkinnotes.app/) |


## Backstory

Napkin Notes was built over the course of a weekend as part of a solo-mission hack-a-thon.
As a result, I paried down the feature set to only things I'd need when I need to quickly paste content or perform quick math during my day-to-day.


## Quick Start

**Napkin Notes is available at [https://napkinnotes.app/](https://napkinnotes.app/)**
You can try it out anonymously, but to sync your notes across devices you'll need to create a free account!

✨ Napkin Notes is a Progressive Web App, so on supported browsers and devices you'll be able to install the app to your desktop. ✨


## Supported Features & Widgets

| Feature                | Trigger Action              |
| ---------------------- | --------------------------- |
| Headings (H1-H4)       | Markdown headings syntax (#) |
| Bold                   | Highlight text and `CTRL+B` |
| Italics                | Highlight text and `CTRL+I` |
| Underline              | Highlight text and `CTRL+Y` |
| Link                   | Highlight text and `CTRL+K` |
| Unordered List         | Type `*` (`*` + `SPACE`)    |
| Ordered List           | Type `1.` (`1.` + `SPACE`)  |
| Interactive Checkboxes | Type `- []` or `- [x]`      |
| Interactive Math ✨    | Type `$` (`$` + `SPACE`)    |
| Code Blocks with Syntax Highlighting | Fence code in <code>```</code> |


## Caveats & Known Issues

Napkin Notes is built using `contenteditable` which is prone to issues across browsers. Napkin Notes was built and tested on Chrome.


---


# Dev Log


## Development Stack

Catalog of the tools, resources, and services used in the creation of this project.


### App

| Tool or Service | Link | Description |
|-----------------|------|-------------|
| Vue (Vue3) | <https://vuejs.org/> | Frontend framework |
| Vite PWA | <https://vite-pwa-org.netlify.app/> | Adds PWA Support to Vue |
| Vue useWebsockets | <https://vueuse.org/core/useWebSocket/> | Vue Websockets Support |
| Tailwind | <https://tailwindcss.com/> | Design system and CSS Components |
| Tailwind Components | <https://tailwindui.com/> | Pre-built components from Tailwind; Uses [Headless UI](https://headlessui.com/) and [Heroicons](https://heroicons.com/) |
| Vue Google Login | <https://github.com/devbaji/vue3-google-login> | Powers "Login with Google" functionality |
| Hero Icons | <https://heroicons.com/> | |
| Bootstrap Icons Vue | <https://github.com/tommyip/bootstrap-icons-vue> | Vue components for [Bootstrap Icons](https://icons.getbootstrap.com/) |
| Highlight JS | <https://highlightjs.org/> | Code Syntax Highlighting |


### Api

| Tool or Service | Link | Description |
|-----------------|------|-------------|
| Django | <https://www.djangoproject.com/> | Backend framework |
| Django Channels | <https://channels.readthedocs.io/en/latest/index.html> | Django websocket support |
| Django Rest Framework | <https://www.django-rest-framework.org/> | RESTFul Django APIs |
| DRF Social Oauth | <https://github.com/wagnerdelima/drf-social-oauth2> | Provides support for social login; Uses [Python Social Auth](https://python-social-auth.readthedocs.io/en/latest/) and [Django OAuth2 Toolkit](https://django-oauth-toolkit.readthedocs.io/en/latest/); |
| Python Cryptography | <https://github.com/pyca/cryptography> | Encryption library used for storing note content |
| DRF Spectactular | <https://drf-spectacular.readthedocs.io/en/latest/> | Open API Schema Generator & Viewer |
| Stoplight Elements | <https://github.com/stoplightio/elements> | Beautiful Open API Schema Docs |
| Django Unfold Admin | <https://github.com/unfoldadmin/django-unfold> | A better Django Admin Experience |


### Dev Ops

| Tool or Service       | Link                                                          | Description                                     |
| --------------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| Render                | <https://render.com/>                                         | Deployment and hosting for both the app and api |
| VSCode Dev Containers | <https://code.visualstudio.com/docs/devcontainers/containers> | Development environment                         |
| Pre-Commit Hooks | <https://github.com/pre-commit/pre-commit-hooks> | Auto-runs lint and format checks on commit |


## Diary of Challenges


### How we got to Vue: The Challenges of React and Svelte

React's control of the dom was interferring with contenteditable components, especially once I added support for checkboxes. There was most likely an issue with my implementation, but I didn't want to spend too much time debugging.

Once React became a no-go, I tried using Svelte instead. I confirmed in the Svelte online editor that contenteditable would work with checkboxes, but I quickly got confused on how to use Svelte Kit for creating a simple application.

Since this project was a quick hack, I didn't want to spend too much time getting setup, so made the ultimate and final switch to Vue as the app's framework.


### Contenteditable

From everything I saw online (Stackoverflow), `contenteditable` is a headache and difficult to work with. While that was the case when figuring out how to handle custom compoents; I found it equally as challenging to find a simple text editor framework that was well supported, not behind a paywall, and allowed for easy customization.

At the end of this weekend, I'd say that I wouldn't recommend `contenteditable` if working on a production-grade high-traffic platform, but for a quick editor it's **highly recommended!!**


### Django Channels and Token Auth

Django Channels doesn't seem to support token authentication by default, so I add to create my own auth token middleware for use of Django Channels to authenticate websocket requests.
<https://github.com/thalida/napkinnotes/blob/ee942bd460c80500b40851985d145863a2ce32dc/api/api/middleware.py>

The middleware takes in the `token` and `token_type` query paramaters from the websocket request, and directly calls `oauth2_provider.contrib.rest_framework.OAuth2Authentication` to perform the authtentication.
