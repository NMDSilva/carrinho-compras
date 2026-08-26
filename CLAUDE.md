# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Monorepo (npm workspaces) for a grocery price-comparison app: `shared` (Zod schemas + types), `backend` (Fastify + Prisma API), `frontend` (Vue 3 SPA). No README exists — this file is the primary source of truth.

## Commands

- `npm run dev` — builds `shared` then runs backend + frontend concurrently.
- `npm run build` — builds `shared` → `backend` → `frontend`, in that order (backend/frontend depend on `shared`'s compiled `dist/`).
- `npm test` — runs backend tests then frontend tests.
- `npm run db:generate` / `db:migrate` / `db:studio` / `db:seed` — Prisma commands, delegated to `backend`.
- Single test: `npx vitest run <path>` or `npx vitest -t "<test name>"`, run inside `backend/` or `frontend/`.
- Frontend type-check: `npm run type-check -w frontend` (`vue-tsc --noEmit`).
- `npm run lint` / `npm run lint:fix` — ESLint (flat config, `eslint.config.mjs` at root, covers all workspaces).
- `npm run format` / `npm run format:check` — Prettier.

If working on `backend` or `frontend` in isolation (not via root `npm run dev`), build `shared` first (`npm run build -w shared`) — its `dist/` must exist.

## Stack

- **backend**: Fastify 5, Prisma 7 (`@prisma/adapter-pg`, Postgres), `fastify-type-provider-zod` (Zod schemas from `shared` drive validation + OpenAPI at `/docs`), JWT auth (`@fastify/jwt`).
- **frontend**: Vue 3 (Composition API) + Vue Router 4 + Pinia + Vite, Tailwind CSS, `ofetch` as HTTP client.
- **shared**: `@carrinho/shared` — Zod schemas and entity types consumed by both backend (validation) and frontend (types). Single source of truth for the API contract.
- Package manager is **npm only** (workspaces) — no pnpm/yarn, no lock files in sub-packages.

## Testing

- Vitest in both `backend` and `frontend`. Backend tests live next to source (`src/modules/<x>/*.test.ts`), not centralized in `tests/`.
- Always write tests for new backend/frontend logic.
- Frontend test scripts require `NODE_OPTIONS=--no-experimental-webstorage` (via `cross-env`) — Node's experimental global `localStorage` otherwise shadows jsdom's, breaking `localStorage`-dependent tests. Don't run `vitest` directly without this env var for frontend tests.
- Backend tests mock Prisma via `vitest-mock-extended`, globally mocked in `tests/setup.ts` with `mockReset` before each test.

## Backend conventions

- **Auth middleware**: use `requireAuth`/`requireAdmin` from `backend/src/shared/middleware/auth.middleware.ts` for new routes. (Note: `app.ts` also registers near-duplicate `authenticate`/`authenticateAdmin` decorators — legacy, not the canonical path for new code.)
- **`role` on `User`** is a plain Prisma `String` (not an enum) — `"USER"`/`"ADMIN"` are a code convention only, unenforced at the DB level.
- **`compras` module** is not a Prisma entity — it's an invoice-ingestion endpoint consumed by an external n8n workflow (`n8n.nmsilva.eu`), authenticated via `x-api-key` (`N8N_API_KEY`) rather than JWT. It find-or-creates `User`/`Supermarket`/`Product` and writes `PriceRecord`s.
- CORS origins are hardcoded in `app.ts` (not env-driven) — changing allowed domains means editing code.

## Environment variables (backend/.env)

`DATABASE_URL`, `POSTGRES_PASSWORD`, `PORT`, `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `N8N_API_KEY`.

- If `JWT_SECRET` is unset, the app silently falls back to `'dev-secret'` — never ship without setting it explicitly.
- If `N8N_API_KEY` is unset, `/api/compras` returns 500 instead of denying access.

## Repo conventions

- Branches: `feature/<description>`.
- Commit messages: Conventional Commits style, written in Portuguese (e.g. `feat(shared): centralizar schemas...`).
- Formatting: Prettier only (no semicolons, single quotes, 2-space indent) — see `.prettierrc`.
- CI (`.github/workflows/deploy.yml`) builds and deploys to GCP on every push to `main` via rsync + pm2 — it does **not** run tests or lint. There's no automated quality gate before deploy.
