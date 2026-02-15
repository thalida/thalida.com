.PHONY: install dev-api dev-app dev build preview tunnel-api tunnel-app tunnel-stop clean

# ─── Setup ────────────────────────────────────────────────────────────

install: ## Install dependencies for both app and api
	cd app && npm install
	cd api && npm install

# ─── Local Development ────────────────────────────────────────────────

dev-api: ## Start the API worker (http://localhost:8787)
	cd api && npm run dev

dev-app: ## Start the Astro frontend (http://localhost:4321)
	cd app && npm run dev

dev: ## Reminder to start both servers
	@echo "Run these in separate terminals:"
	@echo "  make dev-api    → API on http://localhost:8787"
	@echo "  make dev-app    → App on http://localhost:4321"

# ─── Build & Preview ─────────────────────────────────────────────────

build: ## Build the frontend
	cd app && npm run build

preview: build ## Build and preview the frontend (http://localhost:4321)
	cd app && npm run preview

# ─── Tunneling (share local dev with others) ──────────────────────────
# Requires: npx cloudflared (auto-downloaded on first use)
#
# Usage (4 terminals):
#   Terminal 1: make dev-api
#   Terminal 2: make tunnel-api     (tunnels API, updates app/.env)
#   Terminal 3: make tunnel-app     (builds with tunnel URL, previews, tunnels frontend)
#   Terminal 4: share the frontend tunnel URL
#
# When done: Ctrl+C each tunnel. tunnel-api auto-restores app/.env to localhost.

tunnel-api: ## Tunnel the API and auto-update app/.env with the tunnel WS URL
	@LOG=$$(mktemp) ; \
	cleanup() { \
		kill $$PID 2>/dev/null ; \
		echo "" ; \
		echo "PUBLIC_CHAT_WS_URL=ws://localhost:8787/ws" > app/.env.tmp ; \
		grep -v '^PUBLIC_CHAT_WS_URL=' app/.env >> app/.env.tmp 2>/dev/null ; \
		printf 'PUBLIC_CHAT_WS_URL=ws://localhost:8787/ws\n' > app/.env.tmp ; \
		mv app/.env.tmp app/.env ; \
		echo "Restored app/.env to localhost" ; \
		rm -f $$LOG ; \
	} ; \
	trap cleanup EXIT INT TERM ; \
	echo "Starting API tunnel on http://localhost:8787..." ; \
	npx cloudflared tunnel --url http://localhost:8787 > $$LOG 2>&1 & \
	PID=$$! ; \
	echo "Waiting for tunnel URL..." ; \
	URL="" ; \
	for i in $$(seq 1 30); do \
		URL=$$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' $$LOG 2>/dev/null | head -1) ; \
		if [ -n "$$URL" ]; then break; fi ; \
		sleep 1 ; \
	done ; \
	if [ -z "$$URL" ]; then \
		echo "ERROR: Could not get tunnel URL after 30s. Check that port 8787 is running." ; \
		exit 1 ; \
	fi ; \
	WS_URL="wss://$${URL#https://}/ws" ; \
	echo "PUBLIC_CHAT_WS_URL=$$WS_URL" > app/.env ; \
	echo "" ; \
	echo "API tunnel:  $$URL" ; \
	echo "WS URL:      $$WS_URL" ; \
	echo "Updated app/.env — now run 'make tunnel-app' in another terminal" ; \
	echo "Press Ctrl+C to stop (restores app/.env to localhost)" ; \
	echo "" ; \
	wait $$PID

tunnel-app: build ## Build frontend with current .env, preview it, and tunnel
	@LOG=$$(mktemp) ; \
	cleanup() { \
		kill $$TUNNEL_PID 2>/dev/null ; \
		kill $$PREVIEW_PID 2>/dev/null ; \
		rm -f $$LOG ; \
	} ; \
	trap cleanup EXIT INT TERM ; \
	echo "Starting preview server on port 4322..." ; \
	cd app && npm run preview > /dev/null 2>&1 & \
	PREVIEW_PID=$$! ; \
	cd .. ; \
	sleep 2 ; \
	echo "Starting frontend tunnel on http://localhost:4322..." ; \
	npx cloudflared tunnel --url http://localhost:4322 > $$LOG 2>&1 & \
	TUNNEL_PID=$$! ; \
	URL="" ; \
	for i in $$(seq 1 30); do \
		URL=$$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' $$LOG 2>/dev/null | head -1) ; \
		if [ -n "$$URL" ]; then break; fi ; \
		sleep 1 ; \
	done ; \
	if [ -z "$$URL" ]; then \
		echo "ERROR: Could not get tunnel URL after 30s." ; \
		exit 1 ; \
	fi ; \
	echo "" ; \
	echo "Share this URL: $$URL" ; \
	echo "Press Ctrl+C to stop" ; \
	echo "" ; \
	wait $$TUNNEL_PID

# ─── Utilities ────────────────────────────────────────────────────────

clean: ## Remove build artifacts
	rm -rf app/dist app/.astro app/.generated

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
