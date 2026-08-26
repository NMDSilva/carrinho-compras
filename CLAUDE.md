# CLAUDE.md

Este ficheiro fornece orientação ao Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Visão geral

Monorepo (npm workspaces) para uma aplicação de comparação de preços de supermercado: `shared` (schemas Zod + tipos), `backend` (API Fastify + Prisma), `frontend` (SPA Vue 3). Não existe README — este ficheiro é a fonte de verdade principal.

## Comandos

- `npm run dev` — builda o `shared` e depois corre backend + frontend em simultâneo.
- `npm run build` — builda `shared` → `backend` → `frontend`, por esta ordem (backend/frontend dependem do `dist/` compilado do `shared`).
- `npm test` — corre os testes do backend e depois os do frontend.
- `npm run db:generate` / `db:migrate` / `db:studio` / `db:seed` — comandos Prisma, delegados para `backend`.
- Correr um único teste: `npx vitest run <caminho>` ou `npx vitest -t "<nome do teste>"`, dentro de `backend/` ou `frontend/`.
- Type-check do frontend: `npm run type-check -w frontend` (`vue-tsc --noEmit`).
- `npm run lint` / `npm run lint:fix` — ESLint (flat config, `eslint.config.mjs` na raiz, cobre todos os workspaces).
- `npm run format` / `npm run format:check` — Prettier.

Se trabalhares em `backend` ou `frontend` isoladamente (sem passar por `npm run dev` na raiz), builda o `shared` primeiro (`npm run build -w shared`) — o seu `dist/` tem de existir.

## Stack

- **backend**: Fastify 5, Prisma 7 (`@prisma/adapter-pg`, Postgres), `fastify-type-provider-zod` (os schemas Zod do `shared` fazem a validação + geram o OpenAPI em `/docs`), autenticação JWT (`@fastify/jwt`).
- **frontend**: Vue 3 (Composition API) + Vue Router 4 + Pinia + Vite, Tailwind CSS, `ofetch` como cliente HTTP.
- **shared**: `@carrinho/shared` — schemas Zod e tipos de entidades usados tanto pelo backend (validação) como pelo frontend (tipos). Fonte única de verdade para o contrato da API.
- O gestor de pacotes é **apenas npm** (workspaces) — sem pnpm/yarn, sem lock files nos subpacotes.

## Testes

- Vitest em `backend` e `frontend`. Os testes do backend ficam junto ao código-fonte (`src/modules/<x>/*.test.ts`), não centralizados em `tests/`.
- Escreve sempre testes para lógica nova de backend/frontend.
- Os scripts de teste do frontend exigem `NODE_OPTIONS=--no-experimental-webstorage` (via `cross-env`) — o `localStorage` global experimental do Node sobrepõe-se ao do jsdom, quebrando testes que dependem de `localStorage`. Não corras `vitest` diretamente sem esta env var no frontend.
- Os testes do backend mockam o Prisma via `vitest-mock-extended`, mockado globalmente em `tests/setup.ts` com `mockReset` antes de cada teste.

## Convenções do backend

- **Middleware de autenticação**: usa `requireAuth`/`requireAdmin` de `backend/src/shared/middleware/auth.middleware.ts` para rotas novas. (Nota: `app.ts` também regista decorators quase duplicados `authenticate`/`authenticateAdmin` — código legado, não é o caminho canónico para código novo.)
- **`role` em `User`** é uma `String` simples do Prisma (não um enum) — `"USER"`/`"ADMIN"` são apenas uma convenção de código, não reforçada ao nível da base de dados.
- **Módulo `compras`** não é uma entidade Prisma — é um endpoint de ingestão de faturas consumido por um workflow externo do n8n (`n8n.nmsilva.eu`), autenticado via `x-api-key` (`N8N_API_KEY`) em vez de JWT. Faz find-or-create de `User`/`Supermarket`/`Product` e escreve `PriceRecord`s.
- Os origins de CORS estão fixos no código em `app.ts` (não vêm de env var) — mudar domínios permitidos implica editar código.

## Variáveis de ambiente (backend/.env)

`DATABASE_URL`, `POSTGRES_PASSWORD`, `PORT`, `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `N8N_API_KEY`.

- Se `JWT_SECRET` não estiver definido, a app cai silenciosamente para `'dev-secret'` — nunca publicar sem o definir explicitamente.
- Se `N8N_API_KEY` não estiver definido, `/api/compras` responde 500 em vez de negar acesso.

## Convenções do repositório

- Branches: `feature/<descrição>`.
- Mensagens de commit: estilo Conventional Commits, escritas em português.
- Formatação: só Prettier (sem ponto-e-vírgula, aspas simples, indentação de 2 espaços) — ver `.prettierrc`.
- O CI (`.github/workflows/deploy.yml`) builda e faz deploy para GCP em cada push para `main`, correndo primeiro `lint` e `test` como gate antes do build.
- Toda a documentação, especificações, comentários no código e mensagens de commit devem ser escritos em **português de Portugal (pt-PT)**.
