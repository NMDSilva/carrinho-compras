---
name: verify
description: Corre a verificação completa do monorepo (build do shared, testes de backend + frontend, type-check do frontend) pela ordem correta. Usar antes de considerar terminadas alterações de backend ou frontend, ou quando o utilizador pedir para verificar, confirmar ou validar o projeto.
---

Corre estes passos por ordem, a partir da raiz do repositório, parando e reportando ao primeiro erro:

1. `npm run build -w shared` — o backend e o frontend importam o `dist/` compilado do `@carrinho/shared`; output desatualizado ou em falta causa falhas confusas mais à frente.
2. `npm run db:generate` — gera o Prisma Client. Alguns ficheiros (ex: `auth.service.ts`, que usa `Prisma.TransactionIsolationLevel`/`Prisma.PrismaClientKnownRequestError`) importam `@prisma/client` diretamente, não só via `shared/lib/prisma.ts` — sem gerar primeiro, o import falha mesmo com o Prisma mockado nos testes.
3. `npm run lint` — ESLint em todos os workspaces (`eslint.config.mjs` na raiz).
4. `npm run test -w backend` — vitest, com Prisma mockado via `vitest-mock-extended`.
5. `npm run test -w frontend` — vitest com `NODE_OPTIONS=--no-experimental-webstorage` (já definido pelo script `test` do workspace — não invocar `vitest` diretamente aqui, ou testes dependentes de `localStorage` podem comportar-se de forma diferente).
6. `npm run type-check -w frontend` — `vue-tsc --noEmit`.

Se só um workspace mudou (ex: só `backend/`), o passo 1 e o teste do outro workspace podem ser saltados — mas builda sempre o `shared` primeiro se os seus schemas ou tipos mudaram.

Reporta um resumo curto de sucesso/falha por passo, não o output em bruto dos comandos.
