---
name: verify
description: Runs the full monorepo verification (build shared, backend + frontend tests, frontend type-check) in the correct order. Use before considering backend or frontend changes done, or when the user asks to verify, check, or validate the project.
---

Run these steps in order, from the repo root, stopping and reporting on the first failure:

1. `npm run build -w shared` — backend and frontend import `@carrinho/shared`'s compiled `dist/`; stale or missing output causes confusing downstream failures.
2. `npm run lint` — ESLint across all workspaces (root `eslint.config.mjs`).
3. `npm run test -w backend` — vitest, Prisma mocked via `vitest-mock-extended`.
4. `npm run test -w frontend` — vitest with `NODE_OPTIONS=--no-experimental-webstorage` (already set by the workspace's `test` script — don't invoke `vitest` directly here, or `localStorage`-dependent tests may behave differently).
5. `npm run type-check -w frontend` — `vue-tsc --noEmit`.

If only one workspace changed (e.g. only `backend/`), steps 1 and the other workspace's test step can be skipped — but still rebuild `shared` first if its schemas or types changed.

Report a short pass/fail summary per step, not raw command output.
