# AGENTS.md

## Project Overview

Family Command Center — a Vite 7 + React 19 SPA with an Express 5 / PostgreSQL API backend.
Despite the repo name, this is **not** a Remix project. It uses React Router DOM v7 for client-side routing.

**Package manager:** pnpm 10.23.0 (enforced via `packageManager` field). Always use `pnpm`, never `npm` or `yarn`.

**Module system:** ESM (`"type": "module"` in package.json).

## Live Development Workflow

A designer is actively using Cursor or Claude Code to make frontend changes while the Vite dev server is running (`pnpm dev` / `make up` on port 8080). Vite HMR picks up saved files instantly — **the designer sees every change in real time**.

### How to apply frontend changes

1. **Just edit and save.** The dev server is already running. Do not stop it, restart it, or run build commands. Vite HMR handles everything automatically.
2. **Do not run `pnpm dev`, `pnpm build`, or `make up`** — the designer already has the server running. Running it again will fail with a port conflict.
3. **Do not ask the user to refresh the browser.** HMR updates the page automatically when a file is saved.
4. **Save files frequently.** Small, incremental saves let the designer see progress in real time rather than one big change at the end.
5. **Run `pnpm run format` after making changes** to keep formatting consistent. Prettier is configured with default settings.
6. **Frontend-only changes do not need the backend.** The app runs in demo mode with all data in localStorage. Do not start the API server or database for UI work.

### What you can safely change for UI/design work

| Change type                      | Where to edit                           |
| -------------------------------- | --------------------------------------- |
| Page layouts and content         | `app/pages/*.tsx`                       |
| Feature components               | `app/components/<feature>/*.tsx`        |
| App shell (header, sidebar, nav) | `app/components/layout/*.tsx`           |
| Colors, spacing, theme tokens    | `app/index.css` (CSS custom properties) |
| Tailwind classes                 | Inline `className` in any `.tsx` file   |
| Shared UI primitives             | `app/components/ui/*.tsx` (shadcn/ui)   |

### Styling rules

- Use **Tailwind CSS v4** classes inline. No CSS modules, no styled-components, no inline `style` props.
- Use `cn()` from `@/lib/utils` for conditional classes: `cn("p-4", isActive && "bg-primary")`.
- Theme colors and spacing tokens are defined as CSS custom properties in `app/index.css`.
- To add a new shadcn/ui component: `pnpm dlx shadcn@latest add <component>`. Do not create UI primitives from scratch.

## Build / Lint / Test Commands

```bash
pnpm run build          # Production build (vite build)
pnpm run build:dev      # Development build (vite build --mode development)
pnpm run dev            # Start Vite dev server on port 8080
pnpm run lint           # ESLint (flat config)
pnpm run format         # Prettier — auto-fix
pnpm run format:check   # Prettier — check only (used in CI/pre-commit)
pnpm run typecheck      # tsc --noEmit
pnpm run test           # Vitest — single run
pnpm run test:watch     # Vitest — watch mode
```

### Running a single test

```bash
pnpm vitest run app/test/example.test.ts          # Run one file
pnpm vitest run -t "should pass"                   # Run by test name pattern
pnpm vitest run app/components/                    # Run all tests under a directory
```

### Backend

```bash
pnpm run server         # Start API server (tsx api/index.ts)
pnpm run server:dev     # Start API server with watch mode
pnpm run db:migrate     # Run SQL migrations against $DATABASE_URL
pnpm seed               # Generate sample data JSON for localStorage
```

### Docker (full stack)

```bash
docker compose up       # Starts db (Postgres 17), api (:3001), frontend (:8080)
```

### E2E Tests (Playwright)

```bash
pnpm run test:e2e              # Run all E2E tests headless (Chromium)
pnpm run test:e2e:headed       # Run with visible browser
pnpm run test:e2e:ui           # Playwright interactive UI mode
```

Run against a different environment:

```bash
E2E_BASE_URL=https://homebase.up.railway.app pnpm test:e2e
```

E2E test files live in `e2e/` and map 1:1 to QA specs in `specs/qa/`.

### Pre-commit Hook (Husky)

The pre-commit hook runs all four checks in sequence — a commit will be rejected if any fail:

1. `pnpm run typecheck`
2. `pnpm run lint`
3. `pnpm run format:check`
4. `pnpm run test`

### Regression testing after changes

**Every time you modify frontend or backend code, you MUST run the relevant tests before considering the work done:**

1. **Unit tests** — always run `pnpm test` after any code change.
2. **E2E tests** — run `pnpm test:e2e` after changes that touch auth, navigation, forms, or API integration. When in doubt, run them.
3. **If any test fails, fix the regression before moving on.** Do not leave broken tests for later.
4. **QA specs** — the `specs/qa/` directory contains manual QA test plans. Reference these when writing or updating E2E tests to ensure coverage stays aligned.

### How to commit changes

Follow this process every time you commit code to the repository:

1. **Format your code first:**

   ```bash
   pnpm run format
   ```

2. **Run all checks manually before committing** (the pre-commit hook runs these too, but catching issues early saves time):

   ```bash
   pnpm run typecheck && pnpm run lint && pnpm run format:check && pnpm run test
   ```

3. **Stage your changes** — be specific, do not use `git add .` or `git add -A`:

   ```bash
   git add app/pages/CalendarPage.tsx app/components/calendar/AddEventDialog.tsx
   ```

4. **Commit with a clear message** — describe what changed and why:

   ```bash
   git commit -m "Fix event overlap detection on weekly calendar view"
   ```

5. **If the pre-commit hook fails:**
   - Read the error output — it tells you which check failed.
   - Fix the issue (type error, lint error, format issue, or failing test).
   - Stage the fix and commit again. **Do not use `--no-verify`.**

6. **Push to deploy:**
   ```bash
   git push
   ```
   Pushes to `main` auto-deploy to Railway. Make sure all checks pass before pushing.

**Do not commit:**

- `.env` files or secrets
- `node_modules/`, `dist/`, or `test-results/`
- Unrelated changes — keep commits focused on one logical change

## Code Style Guidelines

### TypeScript Configuration

- **Frontend (`app/`):** `strict: false`, `noImplicitAny: false`. Types are used but loosely; `any` is permitted.
- **Backend (`api/`):** `strict: true`. Stricter type safety is enforced.
- ESLint rules explicitly disable: `@typescript-eslint/no-unused-vars`, `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-empty-object-type`.

### Path Aliases

Use `@/*` which maps to `./app/*`. Never use long relative paths from within `app/`.

```ts
// Good
import { Button } from "@/components/ui/button";
import { useFamilyStore } from "@/store/familyStore";

// Bad
import { Button } from "../../../components/ui/button";
```

### Import Ordering

Organize imports in this order (separated by blank lines where practical):

1. React and React hooks
2. Third-party libraries (`react-router-dom`, `date-fns`, `zustand`, `lucide-react`, etc.)
3. Internal modules via `@/` alias — stores, components, UI, lib, contexts, hooks, types, data
4. Relative imports (sibling files)
5. Type-only imports use `import type { ... }` syntax

### File Naming

| Category              | Convention                   | Examples                                 |
| --------------------- | ---------------------------- | ---------------------------------------- |
| React components      | PascalCase `.tsx`            | `CalendarPage.tsx`, `AddEventDialog.tsx` |
| Hooks                 | camelCase with `use-` prefix | `use-mobile.tsx`, `use-toast.ts`         |
| Utilities / lib       | camelCase `.ts`              | `utils.ts`, `api.ts`, `memberColors.ts`  |
| Stores                | camelCase `.ts`              | `familyStore.ts`                         |
| Type definition files | camelCase `.ts`              | `family.ts`                              |
| Tests                 | `*.test.ts` or `*.test.tsx`  | `example.test.ts`                        |

### Naming Conventions

| Element                   | Convention                   | Examples                        |
| ------------------------- | ---------------------------- | ------------------------------- |
| Components                | PascalCase                   | `AppLayout`, `CalendarPage`     |
| Functions                 | camelCase                    | `handleSave`, `resetAndClose`   |
| Variables                 | camelCase                    | `selectedDate`, `filterMember`  |
| Constants (lookup tables) | SCREAMING_SNAKE_CASE         | `MEMBER_COLORS`, `JWT_SECRET`   |
| Types / Interfaces        | PascalCase                   | `FamilyMember`, `CalendarEvent` |
| Type aliases (unions)     | PascalCase                   | `MemberRole`, `TaskStatus`      |
| Zustand store hooks       | `use` + PascalCase + `Store` | `useFamilyStore`                |

### Component Patterns

- **Functional components only** — no class components.
- **Default export** for pages and feature components: `export default function CalendarPage() { ... }`
- **Named exports** for utilities, hooks, and UI primitives.
- Use `forwardRef` for components that need to forward refs.
- UI is built with **shadcn/ui** primitives from `@/components/ui/`. Use existing components; add new ones via the shadcn CLI.
- Use the `cn()` utility (`clsx` + `tailwind-merge`) for conditional class names.
- Styling is done exclusively with **Tailwind CSS v4** classes inline. No CSS modules.

### State Management

- **Global state:** Zustand with `persist` middleware (localStorage).
- **Auth:** Custom JWT-based auth via React Context (`AuthProvider` / `useAuth`).
- **Server data:** TanStack React Query is available (`@tanstack/react-query`). The custom API client is at `app/lib/api.ts`.

### Error Handling

- **Frontend:** `try/catch` blocks with toast notifications for user-facing errors. Extract message from `error.message`.
- **Backend:** `try/catch` with `res.status(xxx).json({ error: "message" })`. Use `console.error` for server-side logging. Wrap database errors in generic user-safe messages.
- **HTTP status codes:** 400 for validation errors, 401 for unauthorized, 409 for conflicts, 500 for server errors.

### Type Annotations

- Prefer `interface` for object shapes: `interface FamilyMember { ... }`
- Use `type` for unions and simple aliases: `type MemberRole = "adult" | "child"`
- Props can be defined as `interface Props { ... }` above the component.
- Use `import type { ... }` for type-only imports.

### Testing

- **Unit tests:** Vitest 4 with jsdom environment. `describe`, `it`, `expect` are available globally (`globals: true`).
- **DOM testing:** `@testing-library/jest-dom` matchers are available via `app/test/setup.ts`.
- **Unit test location:** Co-locate with source or place in `app/test/`. Pattern: `app/**/*.{test,spec}.{ts,tsx}`.
- **E2E tests:** Playwright with Chromium. Tests live in `e2e/*.spec.ts`.
- **QA specs:** Manual test plans in `specs/qa/`. Each E2E test file maps to a QA spec and references its test case IDs (e.g. `TC-SU-01`).
- **Regression rule:** Run `pnpm test` and `pnpm test:e2e` after any code change that could affect auth, navigation, or API behavior. Fix failures before committing.

### Formatting (Prettier)

Prettier uses **default settings** (no config file). Key defaults:

- Print width: 80
- Tab width: 2 (spaces)
- Semicolons: yes
- Quotes: double
- Trailing commas: `"all"`

### Project Structure

```
app/                    # Frontend SPA (React 19)
  components/
    ui/                 # shadcn/ui primitives (do not edit manually)
    calendar/           # Calendar feature components
    finance/            # Finance feature components
    foodlab/            # FoodLab integration (recipe browser, dietary editor, ratings)
    layout/             # Layout components (AppLayout, etc.)
    meals/              # Meal planning components
    onboarding/         # Onboarding flow components
    settings/           # Settings components
    tasks/              # Task management components
  contexts/             # React contexts (AuthContext)
  data/                 # Mock data (includes foodlabDemo.ts)
  hooks/                # Custom hooks
  lib/                  # Utilities (api client, cn(), colors, foodlabParser)
  pages/                # Route pages (one file per route)
  store/                # Zustand stores
  test/                 # Test setup and test files
  types/                # TypeScript type definitions (includes foodlab.ts)
api/                    # Backend (Express 5 + PostgreSQL)
  migrations/           # SQL migration files
e2e/                    # Playwright E2E tests
  helpers.ts            # Shared test utilities (signUp, signIn, clearAuth)
  sign-up.spec.ts       # Sign up flow tests
  sign-in.spec.ts       # Sign in flow tests
  forgot-password.spec.ts # Password reset flow tests
  session-persistence.spec.ts # Session persistence tests
  sign-out.spec.ts      # Sign out flow tests
specs/qa/               # Manual QA test plans
  qa-sign-up.md         # Sign up QA checklist
  qa-sign-in.md         # Sign in QA checklist
  qa-forgot-password.md # Forgot password QA checklist
  qa-session-persistence.md # Session persistence QA checklist
  qa-sign-out.md        # Sign out QA checklist
```

## FoodLab Integration

The Meals page includes a **FoodLab** tab that integrates with the [FoodLab recipe repository](https://github.com/giancolombi/foodlab). This provides:

### Features

- **Browse recipes** — search and filter FoodLab recipes by cuisine, ingredients, or name
- **Ingredient matching** — enter what you have at home, get matching recipes ranked by coverage
- **Per-member dietary restrictions** — each family member can have their own restrictions (no soy, no dairy, vegetarian, no gluten, etc.), and the correct recipe version is shown automatically
- **Star ratings** — rate recipes 1-5 stars; ratings influence future meal plan suggestions
- **Import to meal planner** — add any FoodLab recipe to your weekly plan with one click
- **Auto-generated shopping lists** — when you build a weekly plan, ingredients are consolidated across all dishes

### Key Files

| File                                           | Purpose                                                  |
| ---------------------------------------------- | -------------------------------------------------------- |
| `app/types/foodlab.ts`                         | Types: FoodLabRecipe, DietaryRestrictions, FoodLabRating |
| `app/lib/foodlabParser.ts`                     | Parse FoodLab markdown recipes into structured data      |
| `app/data/foodlabDemo.ts`                      | Demo recipe data (loaded when FoodLab repo isn't cloned) |
| `app/components/foodlab/FoodLabPanel.tsx`      | Main FoodLab UI (browse + ingredient matcher tabs)       |
| `app/components/foodlab/FoodLabRecipeCard.tsx` | Recipe card with expand, rate, and import                |
| `app/components/foodlab/StarRating.tsx`        | Interactive 1-5 star rating component                    |
| `app/components/foodlab/DietaryEditor.tsx`     | Per-member dietary restriction editor dialog             |
| `app/components/foodlab/IngredientMatcher.tsx` | "What can I make?" ingredient search                     |

### Dietary Restrictions

Dietary restrictions are per family member (stored in `memberDietary` in the Zustand store). Each member can have:

- Toggles: noMeat, noSoy, noDairy, noGluten, noNuts, noEggs, noFish, noPork
- Custom free-form restrictions

When a member has `noMeat: true`, they see the vegetarian recipe version. Otherwise they see the meat version. The system uses the current user's restrictions to determine which version to display and import.
