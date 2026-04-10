# Homebase — common commands
# Run "make setup" once on a new machine, then "make up" every time.

.PHONY: setup up down

# First-time setup: install everything needed
setup:
	@echo ""
	@echo "  Setting up Homebase..."
	@echo ""
	@command -v brew >/dev/null || (echo "  Installing Homebrew..." && /bin/bash -c "$$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)")
	@command -v node >/dev/null || (echo "  Installing Node.js..." && brew install node@24)
	@command -v pnpm >/dev/null || (echo "  Enabling pnpm..." && corepack enable)
	@pnpm install
	@echo ""
	@echo "  Done! Now run: make up"
	@echo ""

# Start the app (hot-reload enabled)
up:
	@echo ""
	@echo "  Starting Homebase..."
	@echo "  Open http://localhost:8080"
	@echo "  Click 'Try Demo' on the login page"
	@echo "  Press Ctrl+C to stop"
	@echo ""
	@pnpm dev

# Stop (just a reminder — Ctrl+C does it)
down:
	@echo "  Press Ctrl+C in the terminal running 'make up'"
