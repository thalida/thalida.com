set unstable
set working-directory := '../app'

# ─── Serve ────────────────────────────────────────────────────────────

[doc("Run the frontend locally (env: dev or preview)")]
[arg('env', long, help="dev (default) or preview (tunnel for sharing)", pattern="dev|preview")]
[script('bash')]
serve env="dev":
    set -euo pipefail
    if [ "{{env}}" != "preview" ]; then
        exec npm run dev
    fi
    npm run build
    LOG=$(mktemp)
    cleanup() {
        kill $TUNNEL_PID 2>/dev/null
        kill $PREVIEW_PID 2>/dev/null
        rm -f "$LOG"
    }
    trap cleanup EXIT INT TERM
    echo "Starting preview server on port 4322..."
    npm run preview > /dev/null 2>&1 &
    PREVIEW_PID=$!
    sleep 2
    echo "Starting frontend tunnel on http://localhost:4322..."
    npx cloudflared tunnel --url http://localhost:4322 > "$LOG" 2>&1 &
    TUNNEL_PID=$!
    URL=""
    for i in $(seq 1 30); do
        URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" 2>/dev/null | head -1 || true)
        if [ -n "$URL" ]; then break; fi
        sleep 1
    done
    if [ -z "$URL" ]; then
        echo "ERROR: Could not get tunnel URL after 30s."
        exit 1
    fi
    echo ""
    echo "Share this URL: $URL"
    echo "Press Ctrl+C to stop"
    echo ""
    wait $TUNNEL_PID

# ─── Test ─────────────────────────────────────────────────────────────

[doc("Run app tests")]
test:
    npm test

[doc("Type-check the app")]
typecheck:
    npm run typecheck

# ─── Build ────────────────────────────────────────────────────────────

[doc("Build the frontend")]
build:
    npm run build

[doc("Build frontend for Cloudflare Pages (strips large media from output)")]
build-pages:
    npm run build:pages

# ─── Deploy ──────────────────────────────────────────────────────────

[doc("Deploy to Cloudflare Pages")]
[arg('branch', long, help="git branch for the deployment")]
[arg('project', long, help="Cloudflare Pages project name")]
deploy branch project:
    npx wrangler pages deploy dist --project-name="{{project}}" --branch="{{branch}}"
