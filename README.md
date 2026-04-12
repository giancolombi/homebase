# Homebase — Family Command Center

A full-stack web app for families to manage calendars, tasks, meals, and finances.

## Tech stack

| Layer    | Tech                                                                                 |
| -------- | ------------------------------------------------------------------------------------ |
| Frontend | React 19, Vite 7, Tailwind CSS 4, shadcn/ui, Zustand, React Router 7, TanStack Query |
| Backend  | Express 5, PostgreSQL 17, Argon2, JWT                                                |
| Testing  | Vitest 4 (unit), Playwright (E2E)                                                    |
| Tooling  | TypeScript 5.9, pnpm, ESLint, Prettier, Husky                                        |
| Infra    | Docker Compose (3 services)                                                          |

---

## Designer quick start (Mac)

### One-time prerequisite

Open **Terminal** (Spotlight → type "Terminal" → press Enter) and paste:

```sh
xcode-select --install
```

A popup appears — click **Install** and wait for it to finish (5–10 min).
You only do this once ever.

### First time — clone and setup

Paste these one at a time:

```sh
git clone https://github.com/giancolombi/homebase.git ~/homebase
```

```sh
cd ~/homebase
```

```sh
make setup
```

This installs Homebrew, Node.js, pnpm, and project dependencies. Takes
about 5 minutes the first time.

### Start the app

```sh
cd ~/homebase
```

```sh
make up
```

Open [http://localhost:8080](http://localhost:8080) and click **"Try Demo"**.

Every file change shows up in the browser instantly. To stop: **Ctrl+C**.

### Making changes with Cursor

Download [Cursor](https://cursor.com) and open the `homebase` folder
(**File → Open Folder**). Use **Cmd+L** (chat) or **Cmd+K** (inline edit)
to describe changes in plain English:

> "Make the sidebar darker"

> "Add a welcome banner to the dashboard"

Cursor saves the file, the browser updates automatically.

### What to edit

| What you want to change             | Where to look               |
| ----------------------------------- | --------------------------- |
| Page layouts                        | `app/pages/`                |
| Feature UI (calendar, tasks, etc.)  | `app/components/<feature>/` |
| App shell (header, sidebar, nav)    | `app/components/layout/`    |
| Colors, spacing, theme              | `app/index.css`             |
| Buttons, dialogs, shared components | `app/components/ui/`        |

---

## Engineer setup

### Prerequisites

- **Node.js 24+** — `brew install node@24` or [nodejs.org](https://nodejs.org/)
- **pnpm** — `corepack enable`
- **Docker Desktop** — [docker.com](https://www.docker.com/products/docker-desktop/) (for database)

### Clone and install

```sh
git clone https://github.com/giancolombi/homebase.git
```

```sh
cd homebase
```

```sh
pnpm install
```

### Frontend only (demo mode)

```sh
make up
```

Open [http://localhost:8080](http://localhost:8080) and click **"Try Demo"**.
All data lives in localStorage — no database needed.

### Full stack

```sh
docker compose up
```

Or run each service natively:

```sh
docker compose up db -d
```

```sh
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/homebase
```

```sh
pnpm db:migrate
```

```sh
pnpm server:dev
```

In a second terminal:

```sh
pnpm dev
```

| Service  | URL              | Description                           |
| -------- | ---------------- | ------------------------------------- |
| Frontend | `localhost:8080` | React app (proxies `/api` to backend) |
| API      | `localhost:3001` | Express API server                    |
| Database | `localhost:5432` | PostgreSQL                            |

---

## Make commands

| Command      | What it does                                    |
| ------------ | ----------------------------------------------- |
| `make setup` | Install Node, pnpm, and project dependencies    |
| `make up`    | Start the app with hot-reload on localhost:8080 |

## Scripts

| Command                | Description                 |
| ---------------------- | --------------------------- |
| `pnpm dev`             | Vite dev server with HMR    |
| `pnpm build`           | Production build            |
| `pnpm preview`         | Preview production build    |
| `pnpm server:dev`      | API server with auto-reload |
| `pnpm server`          | API server (no reload)      |
| `pnpm db:migrate`      | Run SQL migrations          |
| `pnpm seed`            | Generate sample data JSON   |
| `pnpm test`            | Run unit tests (Vitest)     |
| `pnpm test:watch`      | Unit tests in watch mode    |
| `pnpm test:e2e`        | Run E2E tests (Playwright)  |
| `pnpm test:e2e:headed` | E2E with visible browser    |
| `pnpm test:e2e:ui`     | Playwright interactive UI   |
| `pnpm typecheck`       | TypeScript type checking    |
| `pnpm lint`            | ESLint                      |
| `pnpm format`          | Prettier (write)            |
| `pnpm format:check`    | Prettier (check only)       |

## Committing changes

### Step by step

```sh
# 1. Format your code
pnpm format

# 2. Run all checks (catches issues before the hook does)
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test

# 3. Stage specific files (never use git add . or git add -A)
git add app/pages/CalendarPage.tsx app/components/calendar/AddEventDialog.tsx

# 4. Commit with a clear message
git commit -m "Fix event overlap detection on weekly calendar view"

# 5. Push to deploy (auto-deploys to Railway)
git push
```

### Pre-commit hook

Every `git commit` automatically runs these checks — the commit is rejected if any fail:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm format:check`
4. `pnpm test`

If the hook fails, read the error, fix the issue, stage the fix, and commit again.
**Do not use `--no-verify`.**

### What not to commit

- `.env` files or secrets
- `node_modules/`, `dist/`, or `test-results/`
- Unrelated changes — keep commits focused on one logical change

## Testing

### Unit tests

```sh
pnpm test              # Single run
pnpm test:watch        # Watch mode
```

Unit tests use Vitest with jsdom. Test files live in `app/test/` or co-located with source files.

### E2E tests

```sh
pnpm test:e2e          # Headless (Chromium)
pnpm test:e2e:headed   # Visible browser
pnpm test:e2e:ui       # Interactive Playwright UI
```

E2E tests use Playwright and run against `localhost:8080` by default. To run against production:

```sh
E2E_BASE_URL=https://homebase.up.railway.app pnpm test:e2e
```

### QA test plans

Manual QA checklists are in `specs/qa/`. Each E2E test maps to a QA spec with matching test case IDs:

| QA Spec                              | E2E Test                          | Test Cases                |
| ------------------------------------ | --------------------------------- | ------------------------- |
| `specs/qa/qa-sign-up.md`             | `e2e/sign-up.spec.ts`             | TC-SU-01 through TC-SU-08 |
| `specs/qa/qa-sign-in.md`             | `e2e/sign-in.spec.ts`             | TC-SI-01 through TC-SI-09 |
| `specs/qa/qa-forgot-password.md`     | `e2e/forgot-password.spec.ts`     | TC-FP-01 through TC-FP-10 |
| `specs/qa/qa-session-persistence.md` | `e2e/session-persistence.spec.ts` | TC-SP-01 through TC-SP-08 |
| `specs/qa/qa-sign-out.md`            | `e2e/sign-out.spec.ts`            | TC-SO-01 through TC-SO-05 |

### Regression testing

After making any code changes, run both test suites to catch regressions:

```sh
pnpm test && pnpm test:e2e
```

## Hosting

The app is deployed on **Railway** with 3 services:

| Service    | URL                              | Type    |
| ---------- | -------------------------------- | ------- |
| Frontend   | `homebase.up.railway.app`        | Public  |
| API        | `homebase.railway.internal:3001` | Private |
| PostgreSQL | `postgres.railway.internal`      | Private |

Pushes to `main` auto-deploy to Railway.

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
  index.ts              Server entry point
  auth.ts               Auth routes
  onboarding.ts         Onboarding endpoint
  db.ts                 PostgreSQL connection pool
  migrations/           SQL migration files

e2e/                    Playwright E2E tests
specs/qa/               Manual QA test plans

Makefile                make setup / make up
docker-compose.yml      Full stack (db, api, frontend)
```

## Using AI coding agents

This repo includes `CLAUDE.md` which gives AI agents full context about
the project. Works with:

- **Cursor** — open the project, use Cmd+K or Cmd+L
- **Claude Code** — run `claude` in the project directory
- **GitHub Copilot** — works automatically in VS Code

## Environment variables

| Variable       | Default                                | Description                |
| -------------- | -------------------------------------- | -------------------------- |
| `DATABASE_URL` | `postgresql://localhost:5432/homebase` | Postgres connection string |
| `JWT_SECRET`   | `dev-secret`                           | Secret for signing JWTs    |
| `API_PORT`     | `3001`                                 | API server port            |
