.PHONY: install start stop dev tunnel tunnel-named

install:
	npm install

# Start app + quick Cloudflare tunnel (no account needed, URL changes each time)
start:
	npx concurrently --names "app,tunnel" --prefix-colors "cyan,yellow" \
		"npm run dev" \
		"cloudflared tunnel --url http://localhost:5173"

# Start app + named Cloudflare tunnel (permanent URL, requires TUNNEL_TOKEN)
# Usage: make start-named TUNNEL_TOKEN=your_token_here
start-named:
	npx concurrently --names "app,tunnel" --prefix-colors "cyan,yellow" \
		"npm run dev" \
		"cloudflared tunnel run --token $(TUNNEL_TOKEN)"

# Run services individually
dev:
	npm run dev

tunnel:
	cloudflared tunnel --url http://localhost:5173

# Stop all running services
stop:
	-lsof -ti tcp:3001 | xargs kill -9 2>/dev/null
	-lsof -ti tcp:5173 | xargs kill -9 2>/dev/null
	-pkill -f cloudflared 2>/dev/null
	@echo "All services stopped."
