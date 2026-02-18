set unstable
set working-directory := '../api'

app_dir := justfile_directory() / ".." / "app"

# ─── Serve ────────────────────────────────────────────────────────────

[doc("Run the API locally (env: dev or preview)")]
[arg('env', long, help="dev (default) or preview (tunnel for sharing)", pattern="dev|preview")]
[script('bash')]
serve env="dev":
    set -euo pipefail
    if [ "{{env}}" != "preview" ]; then
        exec npm run dev
    fi
    APP_DIR="{{app_dir}}"
    LOG=$(mktemp)
    cleanup() {
        kill $PID 2>/dev/null
        echo ""
        rm -f "$APP_DIR/.env.production"
        echo "Removed app/.env.production"
        rm -f "$LOG"
    }
    trap cleanup EXIT INT TERM
    echo "Starting API tunnel on http://localhost:8787..."
    npx cloudflared tunnel --url http://localhost:8787 > "$LOG" 2>&1 &
    PID=$!
    echo "Waiting for tunnel URL..."
    URL=""
    for i in $(seq 1 30); do
        URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" 2>/dev/null | head -1 || true)
        if [ -n "$URL" ]; then break; fi
        sleep 1
    done
    if [ -z "$URL" ]; then
        echo "ERROR: Could not get tunnel URL after 30s. Check that port 8787 is running."
        exit 1
    fi
    WS_URL="wss://${URL#https://}/ws"
    echo "PUBLIC_CHAT_WS_URL=$WS_URL" > "$APP_DIR/.env.production"
    echo ""
    echo "API tunnel:  $URL"
    echo "WS URL:      $WS_URL"
    echo "Written to app/.env.production — now run 'just app::serve --env preview' in another terminal"
    echo "Press Ctrl+C to stop (removes app/.env.production)"
    echo ""
    wait $PID

# ─── Test ─────────────────────────────────────────────────────────────

[doc("Run API tests")]
test:
    npm test

# ─── Deploy ──────────────────────────────────────────────────────────

[doc("Deploy the API Worker")]
[arg('env', long, help="target environment (prod or preview)", pattern="prod|preview")]
deploy env:
    npx wrangler deploy {{ if env == "prod" { '--env=""' } else { "--env " + env } }}

[doc("Set Worker secrets (ADMIN_SECRET, OPENAI_API_KEY)")]
[arg('env', long, help="target environment (prod or preview)", pattern="prod|preview")]
secrets env:
    npx wrangler secret put ADMIN_SECRET {{ if env == "prod" { '--env=""' } else { "--env " + env } }}
    npx wrangler secret put OPENAI_API_KEY {{ if env == "prod" { '--env=""' } else { "--env " + env } }}
