# AGENTS.md

## Project Overview

Family Command Center — a Vite 7 + React 19 SPA with an Express 5 / PostgreSQL API backend.
Despite the repo name, this is **not** a Remix project. It uses React Router DOM v7 for client-side routing.

**Package manager:** pnpm 10.23.0 (enforced via `packageManager` field). Always use `pnpm`, never `npm` or `yarn`.

**Module system:** ESM (`"type": "module"` in package.json).

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
```

### Docker (full stack)

```bash
docker compose up       # Starts db (Postgres 16), api (:3001), frontend (:8080)
```

### Pre-commit Hook (Husky)

The pre-commit hook runs all four checks in sequence — a commit will be rejected if any fail:

1. `pnpm run typecheck`
2. `pnpm run lint`
3. `pnpm run format:check`
4. `pnpm run test`

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

- **Framework:** Vitest 4 with jsdom environment.
- **Globals:** `describe`, `it`, `expect` are available globally (vitest `globals: true`), but explicit imports from `vitest` are also acceptable.
- **DOM testing:** `@testing-library/jest-dom` matchers are available via `app/test/setup.ts`.
- **Test file location:** Co-locate with source or place in `app/test/`. Pattern: `app/**/*.{test,spec}.{ts,tsx}`.

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
    layout/             # Layout components (AppLayout, etc.)
    meals/              # Meal planning components
    onboarding/         # Onboarding flow components
    settings/           # Settings components
    tasks/              # Task management components
  contexts/             # React contexts (AuthContext)
  data/                 # Mock data
  hooks/                # Custom hooks
  lib/                  # Utilities (api client, cn(), colors)
  pages/                # Route pages (one file per route)
  store/                # Zustand stores
  test/                 # Test setup and test files
  types/                # TypeScript type definitions
api/                    # Backend (Express 5 + PostgreSQL)
  migrations/           # SQL migration files
```
