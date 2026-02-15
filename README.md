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
make install                            # install deps for app + api
cp api/.dev.vars.example api/.dev.vars  # configure secrets (see below)
```

Then in two terminals:

```bash
make dev-api    # Terminal 1 — API on http://localhost:8787
make dev-app    # Terminal 2 — App on http://localhost:4321
```

Run `make` or `make help` to see all available commands.

## Environment Variables

### API secrets (`api/.dev.vars`)

```bash
cp api/.dev.vars.example api/.dev.vars
```

| Variable | Required | Description |
|---|---|---|
| `ADMIN_SECRET` | Yes | Any secret string. Used to log in as the site owner. |
| `OPENAI_API_KEY` | No | OpenAI API key for chat moderation. Leave blank to skip moderation locally. Free at [platform.openai.com/api-keys](https://platform.openai.com/api-keys). |

### Frontend (`app/.env`)

| Variable | Default | Description |
|---|---|---|
| `PUBLIC_CHAT_WS_URL` | `ws://localhost:8787/ws` | WebSocket URL for the chat API. Auto-updated by `make tunnel-api`. |

## Log In as the Owner

Visit `http://localhost:4321?admin=YOUR_ADMIN_SECRET` (the value from `api/.dev.vars`). The token is saved to `localStorage`, so you only need to do this once per browser.

## Testing with Someone Else (Tunnels)

Share your local dev environment using [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) (free, no account needed). You need three terminals:

```bash
make dev-api      # Terminal 1 — start the API server
make tunnel-api   # Terminal 2 — tunnel the API, auto-updates app/.env
make tunnel-app   # Terminal 3 — builds frontend, starts preview on port 4322, tunnels it
```

`make tunnel-api` automatically updates `app/.env` with the tunnel WebSocket URL and restores it to localhost when you Ctrl+C. Share the frontend tunnel URL printed by `make tunnel-app` with your tester.

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
| `make install` | Install dependencies for both app and api |
| `make dev-api` | Start the API worker on http://localhost:8787 |
| `make dev-app` | Start the Astro frontend on http://localhost:4321 |
| `make build` | Build the frontend |
| `make preview` | Build and preview the frontend on http://localhost:4322 |
| `make tunnel-api` | Tunnel the API, auto-update `app/.env` with the WS URL |
| `make tunnel-app` | Build, preview, and tunnel the frontend |
| `make clean` | Remove build artifacts |
