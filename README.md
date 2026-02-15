# thalida.com

Portfolio site with a live chat, project tree, and content viewer.

## Project Structure

```
app/    Astro frontend (Cloudflare Pages)
api/    Cloudflare Worker + Durable Object (chat backend)
docs/   Design docs and plans
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- npm (comes with Node)
- make (pre-installed on macOS/Linux)

## Quick Start

```bash
make setup
```

This single command:
1. Installs dependencies for both `app/` and `api/`
2. Adds a shell alias so `make` works from any subfolder in the repo
3. Copies env templates (`api/.dev.vars`, `app/.env`) if they don't already exist

After setup, edit `api/.dev.vars` to add your secrets (see below), then start developing:

```bash
make api-dev    # Terminal 1 — API on http://localhost:8787
make app-dev    # Terminal 2 — App on http://localhost:4321
```

Run `make` or `make help` to see all available commands.

## Environment Variables

### API secrets (`api/.dev.vars`)

| Variable | Required | Description |
|---|---|---|
| `ADMIN_SECRET` | Yes | Any secret string. Used to log in as the site owner. |
| `OPENAI_API_KEY` | No | OpenAI API key for chat moderation. Leave blank to skip moderation locally. Free at [platform.openai.com/api-keys](https://platform.openai.com/api-keys). |

### Frontend (`app/.env`)

| Variable | Default | Description |
|---|---|---|
| `PUBLIC_CHAT_WS_URL` | `ws://localhost:8787/ws` | WebSocket URL for the chat API. Auto-updated by `make api-preview`. |

## Log In as the Owner

Visit `http://localhost:4321?admin=YOUR_ADMIN_SECRET` (the value from `api/.dev.vars`). The token is saved to `localStorage`, so you only need to do this once per browser.

## Testing with Someone Else (Tunnels)

Share your local dev environment using [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) (free, no account needed). You need three terminals:

```bash
make api-dev       # Terminal 1 — start the API server
make api-preview   # Terminal 2 — tunnel the API, auto-updates app/.env
make app-preview   # Terminal 3 — builds frontend, previews on port 4322, tunnels it
```

`make api-preview` automatically updates `app/.env` with the tunnel WebSocket URL and restores it to localhost when you Ctrl+C. Share the frontend tunnel URL printed by `make app-preview` with your tester.

The preview server runs on port 4322 to avoid conflicting with the dev server on 4321.

## Configuration

All Astro configuration lives in `app/astro.config.mjs`. Allowed hosts for dev and preview (`*.thalida.com` and `*.trycloudflare.com`) are set via the `--allowed-hosts` flag in `app/package.json` scripts.

## Production Deployment

### API (Cloudflare Worker)

```bash
cd api

# Set secrets (one-time)
npx wrangler secret put ADMIN_SECRET
npx wrangler secret put OPENAI_API_KEY

# Deploy
npm run deploy
```

### Frontend (Cloudflare Pages)

```bash
cd app
PUBLIC_CHAT_WS_URL=wss://your-api.workers.dev/ws npm run build
```

The `dist/` output can be deployed to Cloudflare Pages (or any static host).

## All Commands

| Command | Description |
|---|---|
| `make setup` | Full local setup: install deps, add shell alias, copy env templates |
| `make install` | Install dependencies for both app and api |
| `make alias` | Add shell alias so `make` works from any subfolder |
| `make api-dev` | Start the API worker on http://localhost:8787 |
| `make app-dev` | Start the Astro frontend on http://localhost:4321 |
| `make app-build` | Build the frontend |
| `make api-preview` | Tunnel the API, auto-update `app/.env` with the WS URL |
| `make app-preview` | Build, preview on port 4322, and tunnel the frontend |
| `make clean` | Remove build artifacts |
