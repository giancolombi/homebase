# Homebase — Family Command Center

A full-stack web app for families to manage calendars, tasks, meals, and finances.

## Tech stack

| Layer    | Tech                                                                                 |
| -------- | ------------------------------------------------------------------------------------ |
| Frontend | React 19, Vite 7, Tailwind CSS 4, shadcn/ui, Zustand, React Router 7, TanStack Query |
| Backend  | Express 5, PostgreSQL 17, Argon2, JWT                                                |
| Tooling  | TypeScript 5.9, pnpm, ESLint, Prettier, Husky, Vitest 4                              |
| Infra    | Docker Compose (3 services)                                                          |

## First-time laptop setup

Follow these steps on a brand-new machine. If you already have a tool
installed, skip that step.

### 1. Install Git

Git is required to clone the repo and commit changes.

**macOS** — install the Xcode command-line tools (includes Git):

```sh
xcode-select --install
```

**Windows** — download from [git-scm.com](https://git-scm.com/download/win)
and run the installer. Use the defaults. After installing, open **Git Bash**
for all commands below.

**Linux (Debian/Ubuntu):**

```sh
sudo apt update && sudo apt install -y git
```

Verify: `git --version` should print `2.x` or newer.

### 2. Install Node.js 24+

**macOS (Homebrew):**

```sh
# Install Homebrew first if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install node@24
```

**macOS / Windows / Linux (installer):** download from
[nodejs.org](https://nodejs.org/) (use the LTS or Current release, 24+).

Verify: `node --version` should print `v24.x` or newer.

### 3. Enable pnpm

Node 24 ships with Corepack. Enable it so pnpm is available:

```sh
corepack enable
```

Verify: `pnpm --version` should print `10.23.0` (the version pinned by
the repo).

### 4. Install Docker Desktop (engineers & full-stack only)

Required for running the database and full-stack Docker setup. **Designers
and PMs doing frontend-only work can skip this.**

Download from
[docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
and follow the installer. Make sure Docker Desktop is **running** before
using any `docker` commands.

Verify: `docker --version` and `docker compose version` should both print
a version number.

### 5. Install PostgreSQL client tools (engineers only)

The `db:migrate` script uses `psql`. **Skip this if you only use Docker
Compose** (the migration runs automatically in the container).

**macOS:** `brew install libpq && brew link --force libpq`
**Ubuntu/Debian:** `sudo apt install -y postgresql-client`
**Windows:** included in the
[PostgreSQL installer](https://www.postgresql.org/download/windows/).

### 6. Clone the repo

```sh
git clone <your-repo-url>
cd family-command-center
```

### 7. Install project dependencies

```sh
pnpm install
```

This also sets up the Husky pre-commit hooks automatically.

### 8. Create your `.env` file

Copy the example and adjust if needed:

```sh
cp .env .env.local
```

The defaults in `.env` work out of the box for local development:

```
DATABASE_URL="postgresql://localhost:5432/homebase"
JWT_SECRET="change-me-to-a-random-secret-in-production"
API_PORT=3001
```

You should not need to change anything for local dev.

---

## Quick start by role

Pick the path that matches your role. All paths assume you completed the
setup steps above.

### Designers — frontend only (no Docker needed)

```sh
pnpm dev
```

Open [http://localhost:8080](http://localhost:8080). Edit any file under
`app/` and the browser updates instantly. See the
[designer section below](#for-designers-frontend-hot-reload-setup) for
details on what to edit.

### PMs — run the full app to test features

The easiest way to see the full app with a working backend:

```sh
docker compose up --build -d
```

Open [http://localhost:8080](http://localhost:8080). To stop:
`docker compose down`. To stop and reset the database:
`docker compose down -v`.

### Engineers — full-stack native development

Native mode gives you Vite hot-reload for the frontend and auto-reloading
for the API server.

```sh
# 1. Start Postgres (via Docker)
docker compose up db -d

# 2. Run the database migration
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/homebase
pnpm db:migrate

# 3. Start the API server (port 3001, auto-reloads on changes)
pnpm server:dev

# 4. In a second terminal — start the frontend (port 8080, proxies /api to 3001)
pnpm dev
```

Open [http://localhost:8080](http://localhost:8080).

Alternatively, run the entire stack in Docker:

```sh
docker compose up --build -d
```

| Service  | URL              | Description                                       |
| -------- | ---------------- | ------------------------------------------------- |
| Frontend | `localhost:8080` | React app (proxies `/api` to backend)             |
| API      | `localhost:3001` | Express API server                                |
| Database | `localhost:5432` | PostgreSQL (`homebase` / `postgres` / `postgres`) |

To stop: `docker compose down`. To stop and wipe the database volume:
`docker compose down -v`.

### Verify everything works

Run the full check suite (same checks that run on every commit):

```sh
pnpm run typecheck && pnpm run lint && pnpm run format:check && pnpm run test
```

## Scripts

| Command             | Description                 |
| ------------------- | --------------------------- |
| `pnpm dev`          | Vite dev server with HMR    |
| `pnpm build`        | Production build            |
| `pnpm preview`      | Preview production build    |
| `pnpm server:dev`   | API server with auto-reload |
| `pnpm server`       | API server (no reload)      |
| `pnpm db:migrate`   | Run SQL migrations          |
| `pnpm seed`         | Generate sample data JSON   |
| `pnpm test`         | Run tests (Vitest)          |
| `pnpm test:watch`   | Run tests in watch mode     |
| `pnpm typecheck`    | TypeScript type checking    |
| `pnpm lint`         | ESLint                      |
| `pnpm format`       | Prettier (write)            |
| `pnpm format:check` | Prettier (check only)       |

## Project structure

```
app/                    Frontend (React SPA)
  components/
    ui/                 shadcn/ui primitives
    calendar/           Calendar feature components
    finance/            Finance feature components
    layout/             App shell (header, nav)
    meals/              Meal planning components
    onboarding/         Onboarding wizard steps
    settings/           Settings dialogs
    tasks/              Task management components
  contexts/             React contexts (auth)
  hooks/                Custom hooks
  lib/                  Utilities, API client
  pages/                Route-level page components
  store/                Zustand state management
  test/                 Test files
  types/                TypeScript type definitions

api/                    Backend (Express API)
  index.ts              API server entry point
  auth.ts               Auth routes (signup, signin, password reset)
  onboarding.ts         Onboarding endpoint
  db.ts                 PostgreSQL connection pool
  migrations/           SQL migration files
  Dockerfile            API Docker image

serve.ts                Production frontend server (static files + API proxy)
Dockerfile              Frontend Docker image (builds app, runs serve.ts)
docker-compose.yml      3-service orchestration (db, api, frontend)
vite.config.ts          Vite configuration
vitest.config.ts        Test configuration
```

## For designers: frontend hot-reload setup

If you're working on UI/styling changes, this is the fastest way to see your
updates live in the browser.

**You do NOT need Docker, a database, or the backend API.** All page data
(family members, events, tasks, meals, finance) is stored in the browser's
localStorage via Zustand. The database is only used for authentication,
which you can skip entirely with the demo mode below.

### Quick start (frontend only)

You only need **Node.js 24+** installed.

```sh
# 1. Enable pnpm (one-time)
corepack enable

# 2. Install dependencies
pnpm install

# 3. Start the dev server with hot-reload
pnpm dev
```

Open [http://localhost:8080](http://localhost:8080).

### Loading sample data

On the login page, click **"Load sample data (skip sign-in)"**. This
populates every page with a demo family (4 members, calendar events, tasks,
recipes, meal plans, shopping list, bank accounts, and transactions) — no
account or backend required.

You can also seed from the terminal:

```sh
pnpm seed | pbcopy    # copies the JSON to your clipboard (macOS)
```

Then open DevTools (F12) and run:

```js
localStorage.setItem("homebase-family-data", "<paste here>");
location.reload();
```

Any change you save to a file under `app/` will instantly update in the
browser — no manual refresh needed.

### What to edit

| What you want to change                       | Where to look                                                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Page layouts / routes                         | `app/pages/` — one file per page                                                                                                                       |
| Feature UI (calendar, tasks, etc.)            | `app/components/<feature>/`                                                                                                                            |
| App shell (header, sidebar, nav)              | `app/components/layout/`                                                                                                                               |
| Colors, spacing, theme tokens                 | `app/index.css` (CSS custom properties)                                                                                                                |
| Tailwind utility classes                      | Inline in any `.tsx` component file                                                                                                                    |
| Shared UI primitives (buttons, dialogs, etc.) | `app/components/ui/` — these are shadcn/ui components; prefer adding new ones via `pnpm dlx shadcn@latest add <component>` rather than editing by hand |

### Tips

- **Tailwind CSS v4** is used for all styling — apply classes directly in JSX
  (`className="flex gap-4 p-6"`). No CSS modules.
- Use the `cn()` helper from `@/lib/utils` to combine conditional classes:
  ```tsx
  <div className={cn("p-4 rounded", isActive && "bg-primary text-white")} />
  ```
- Component imports use the `@/` alias (maps to `app/`), e.g.
  `import { Button } from "@/components/ui/button"`.

## Using coding agents for frontend changes

This repo includes an `AGENTS.md` file (also symlinked as `CLAUDE.md`) that
gives AI coding agents full context about the project's structure, commands,
and conventions. The agents listed below can read that file and make changes
on your behalf.

### Claude Code (CLI)

```sh
# Install (one-time)
npm install -g @anthropic-ai/claude-code

# Start an interactive session in the project directory
claude
```

Once running, describe the change you want in plain language:

> "Change the sidebar background to slate-900 and make the nav links bold"

> "Add a new card to the dashboard showing upcoming birthdays"

Claude Code will read `AGENTS.md`, edit the right files, and can run
`pnpm dev` to verify the result.

### Cursor

Open this project folder in [Cursor](https://cursor.com). The editor
automatically picks up `AGENTS.md` for context. Use **Cmd+K** (inline edit)
or **Cmd+L** (chat) to describe UI changes and Cursor will apply them to the
correct files.

### GitHub Copilot

If you use VS Code with
[GitHub Copilot](https://github.com/features/copilot), open Copilot Chat
and describe the change. Copilot will use `AGENTS.md` for project context
when it is present in the repo root.

### Verifying agent changes

After any agent makes edits, run the pre-commit checks to make sure nothing
is broken:

```sh
pnpm run typecheck && pnpm run lint && pnpm run format:check && pnpm run test
```

Or let the agent run these — they will execute automatically on `git commit`
via the Husky pre-commit hook.

## Environment variables

| Variable       | Default                                | Description                            |
| -------------- | -------------------------------------- | -------------------------------------- |
| `DATABASE_URL` | `postgresql://localhost:5432/homebase` | Postgres connection string             |
| `JWT_SECRET`   | `dev-secret`                           | Secret for signing JWTs                |
| `API_PORT`     | `3001`                                 | Port for the API server                |
| `API_URL`      | `http://api:3001`                      | API URL (used by `serve.ts` in Docker) |
| `PORT`         | `8080`                                 | Port for the frontend server (Docker)  |
