set unstable
set working-directory := '../api'

# ─── Serve ────────────────────────────────────────────────────────────

[doc("Run the API locally")]
serve:
    npm run dev

# ─── Test ─────────────────────────────────────────────────────────────

[doc("Run API tests")]
test:
    npm test

[doc("Type-check the API")]
typecheck:
    npm run typecheck

# ─── Data ────────────────────────────────────────────────────────────

[doc("Clear local Durable Object storage (messages, users, etc.)")]
reset-local:
    rm -rf .wrangler/state/

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
