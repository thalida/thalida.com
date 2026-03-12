set unstable
set working-directory := '../api'

# ─── Serve ────────────────────────────────────────────────────────────

[doc("Run the API locally")]
serve:
    pnpm dev

# ─── Test ─────────────────────────────────────────────────────────────

[doc("Run API tests")]
test:
    pnpm test

[doc("Type-check the API")]
typecheck:
    pnpm typecheck

# ─── Data ────────────────────────────────────────────────────────────

[doc("Clear local Durable Object storage (messages, users, etc.)")]
reset-local:
    rm -rf .wrangler/state/

# ─── Deploy ──────────────────────────────────────────────────────────

[doc("Deploy the API Worker")]
[arg('env', long, help="target environment (prod or preview)", pattern="prod|preview")]
deploy env:
    pnpm exec wrangler deploy {{ if env == "prod" { '--env=""' } else { "--env " + env } }}

[doc("Set Worker secrets (ADMIN_SECRET, OPENAI_API_KEY)")]
[arg('env', long, help="target environment (prod or preview)", pattern="prod|preview")]
secrets env:
    pnpm exec wrangler secret put ADMIN_SECRET {{ if env == "prod" { '--env=""' } else { "--env " + env } }}
    pnpm exec wrangler secret put OPENAI_API_KEY {{ if env == "prod" { '--env=""' } else { "--env " + env } }}
