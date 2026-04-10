#!/bin/bash
#
# One-command setup for Homebase on macOS.
# Installs Xcode CLI tools, Homebrew, Node.js, pnpm, clones the repo,
# installs dependencies, and starts the dev server.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/giancolombi/homebase/main/setup.sh | bash
#
# Or if you already have the repo cloned:
#   bash setup.sh
#

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

step() { echo -e "\n${GREEN}==>${NC} $1\n"; }
warn() { echo -e "${YELLOW}    $1${NC}"; }

# ── Xcode command-line tools ────────────────────────────────────────────────
if ! xcode-select -p &>/dev/null; then
  step "Installing Xcode command-line tools (this may take a few minutes)..."
  xcode-select --install
  echo "    A popup should have appeared. Click Install and wait for it to finish."
  echo "    When it's done, re-run this script:"
  echo ""
  echo "      bash setup.sh"
  echo ""
  exit 0
else
  step "Xcode command-line tools: already installed"
fi

# ── Homebrew ────────────────────────────────────────────────────────────────
if ! command -v brew &>/dev/null; then
  step "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Add brew to current shell session
  if [[ -f /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
else
  step "Homebrew: already installed"
fi

# ── Node.js ─────────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  step "Installing Node.js..."
  brew install node@24
else
  step "Node.js: already installed ($(node --version))"
fi

# ── pnpm via Corepack ──────────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  step "Enabling pnpm..."
  corepack enable
else
  step "pnpm: already installed ($(pnpm --version))"
fi

# ── Clone the repo (if not already inside it) ──────────────────────────────
if [[ -f "package.json" ]] && grep -q '"vite_react_shadcn_ts"' package.json 2>/dev/null; then
  step "Already inside the homebase repo"
  PROJECT_DIR="$(pwd)"
else
  PROJECT_DIR="$HOME/homebase"
  if [[ -d "$PROJECT_DIR" ]]; then
    step "Repo already cloned at $PROJECT_DIR"
  else
    step "Cloning homebase..."
    git clone https://github.com/giancolombi/homebase.git "$PROJECT_DIR"
  fi
  cd "$PROJECT_DIR"
fi

# ── Install dependencies ───────────────────────────────────────────────────
step "Installing project dependencies..."
pnpm install

# ── Start ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  The dev server is about to start."
echo "  Open http://localhost:8080 in your browser."
echo "  Click 'Try Demo' on the login page."
echo ""
echo "  To stop: press Ctrl+C"
echo "  To restart later:"
echo "    cd $PROJECT_DIR && make up"
echo ""

pnpm dev
