---
name: new-backend-module
description: Scaffolds a new backend module following this repo's existing pattern (controller/routes/schema/service/test). Use when adding a new resource/domain to the backend, e.g. "add a categories module".
---

Existing modules live in `backend/src/modules/<name>/` (see `auth`, `products`, `supermarkets`, `prices`, `users` for reference — `compras` is a special case, not a typical CRUD module). Each module has:

- `<name>.schema.ts` — Zod request/response schemas. **Add these to `shared/src/index.ts`'s exports** (in `shared/src/schemas/`) rather than keeping them backend-local — the frontend and OpenAPI docs both depend on the shared package being the single source of truth. Rebuild shared (`npm run build -w shared`) after adding.
- `<name>.service.ts` — business logic, talks to Prisma via `backend/src/shared/lib/prisma.ts`.
- `<name>.controller.ts` — thin handlers calling the service, using the Zod schemas via `fastify-type-provider-zod`.
- `<name>.routes.ts` — registers routes on a Fastify plugin. Use `requireAuth`/`requireAdmin` from `backend/src/shared/middleware/auth.middleware.ts` for protected routes (not the `app.ts` decorators — see CLAUDE.md).
- `<name>.test.ts` — colocated with the module, not under `backend/tests/`. Mock Prisma per the pattern in `backend/tests/setup.ts` / other modules' tests.

After scaffolding:
1. Register the new route prefix in `backend/src/app.ts` (see how `/api/products`, `/api/supermarkets`, etc. are mounted).
2. Add a corresponding Prisma model to `backend/prisma/schema.prisma` and run `npm run db:migrate` if the module needs new persistence.
3. Write tests for the new service/controller logic — this repo's convention is to always test new backend logic.
4. If the frontend needs to consume the new endpoint, add it to `frontend/src/api/index.ts`'s `ofetch`-based client, following the pattern of `productsApi`/`supermarketsApi`.
