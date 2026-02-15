.PHONY: install api-dev app-dev dev app-build app-preview api-preview clean help

# ─── Setup ────────────────────────────────────────────────────────────

install: ## Install dependencies for both app and api
	cd app && npm install
	cd api && npm install

# ─── Local Development ────────────────────────────────────────────────

api-dev: ## Start the API worker (http://localhost:8787)
	cd api && npm run dev

app-dev: ## Start the Astro frontend (http://localhost:4321)
	cd app && npm run dev

dev: ## Reminder to start both servers
	@echo "Run these in separate terminals:"
	@echo "  make api-dev    → API on http://localhost:8787"
	@echo "  make app-dev    → App on http://localhost:4321"

# ─── Build ────────────────────────────────────────────────────────────

app-build: ## Build the frontend
	cd app && npm run build

# ─── Preview (tunneled for sharing) ──────────────────────────────────
# Requires: npx cloudflared (auto-downloaded on first use)
#
# Usage (3 terminals):
#   Terminal 1: make api-dev
#   Terminal 2: make api-preview    (tunnels API, updates app/.env)
#   Terminal 3: make app-preview    (builds frontend, previews, tunnels it)
#
# When done: Ctrl+C each. api-preview auto-restores app/.env to localhost.

api-preview: ## Tunnel the API and auto-update app/.env with the tunnel WS URL
	@LOG=$$(mktemp) ; \
	cleanup() { \
		kill $$PID 2>/dev/null ; \
		echo "" ; \
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
	echo "Updated app/.env — now run 'make app-preview' in another terminal" ; \
	echo "Press Ctrl+C to stop (restores app/.env to localhost)" ; \
	echo "" ; \
	wait $$PID

app-preview: app-build ## Build frontend, preview on port 4322, and tunnel
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
