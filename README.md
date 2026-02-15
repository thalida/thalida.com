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

## Local Development

### 1. Install dependencies

```bash
# From the repo root
cd app && npm install
cd ../api && npm install
```

### 2. Configure environment variables

**API secrets** (not committed):

```bash
cp api/.dev.vars.example api/.dev.vars
```

Open `api/.dev.vars` and fill in:

| Variable | Required | Description |
|---|---|---|
| `ADMIN_SECRET` | Yes | Any secret string. Used to log in as the site owner. |
| `OPENAI_API_KEY` | No | OpenAI API key for chat moderation. Leave blank to skip moderation locally. Free at [platform.openai.com/api-keys](https://platform.openai.com/api-keys). |

**Frontend env** (already set for local dev in `app/.env`):

| Variable | Default | Description |
|---|---|---|
| `PUBLIC_CHAT_WS_URL` | `ws://localhost:8787/ws` | WebSocket URL for the chat API. Change when using a tunnel or in production. |

### 3. Start the servers

You need two terminals:

```bash
# Terminal 1 — API (runs on http://localhost:8787)
cd api
npm run dev
```

```bash
# Terminal 2 — Frontend (runs on http://localhost:4321)
cd app
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser.

### 4. Log in as the owner

Visit `http://localhost:4321?admin=YOUR_ADMIN_SECRET` (replacing with the value you set in `.dev.vars`). The token is saved to `localStorage`, so you only need to do this once per browser.

## Testing with Someone Else (Tunnels)

To let someone else connect to your local instance, use [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) (free, no account needed):

```bash
# Terminal 3 — Tunnel the API
npx cloudflared tunnel --url http://localhost:8787
# Prints a URL like https://some-words.trycloudflare.com
```

Copy the tunnel URL and update `app/.env`:

```
PUBLIC_CHAT_WS_URL=wss://some-words.trycloudflare.com/ws
```

Restart the frontend (`npm run dev` in `app/`), then tunnel it too:

```bash
# Terminal 4 — Tunnel the frontend
npx cloudflared tunnel --url http://localhost:4321
# Prints another URL — share this with your tester
```

Both of you open the frontend tunnel URL, pick different usernames, and chat. When done, Ctrl+C the tunnels and revert `app/.env` back to the localhost default.

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

Set the environment variable in your Pages project settings or before building:

```bash
cd app
PUBLIC_CHAT_WS_URL=wss://your-api.workers.dev/ws npm run build
```

The `dist/` output can be deployed to Cloudflare Pages (or any static host).
