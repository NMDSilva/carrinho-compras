---
name: new-backend-module
description: Cria um novo módulo de backend seguindo o padrão existente deste repositório (controller/routes/schema/service/test). Usar ao adicionar um novo recurso/domínio ao backend, ex: "adicionar um módulo de categorias".
---

Os módulos existentes vivem em `backend/src/modules/<nome>/` (ver `auth`, `products`, `supermarkets`, `prices`, `users` como referência — `compras` é um caso especial, não é um módulo CRUD típico). Cada módulo tem:

- `<nome>.schema.ts` — schemas Zod de request/response. **Adiciona-os a `shared/src/index.ts`** (em `shared/src/schemas/`) em vez de os manteres locais ao backend — tanto o frontend como a documentação OpenAPI dependem do pacote shared ser a fonte única de verdade. Reconstrói o shared (`npm run build -w shared`) depois de adicionar.
- `<nome>.service.ts` — lógica de negócio, fala com o Prisma via `backend/src/shared/lib/prisma.ts`.
- `<nome>.controller.ts` — handlers finos que chamam o service, usando os schemas Zod via `fastify-type-provider-zod`.
- `<nome>.routes.ts` — regista as rotas num plugin Fastify. Usa `requireAuth`/`requireAdmin` de `backend/src/shared/middleware/auth.middleware.ts` para rotas protegidas (não os decorators de `app.ts` — ver CLAUDE.md).
- `<nome>.test.ts` — colocado junto ao módulo, não em `backend/tests/`. Mocka o Prisma seguindo o padrão de `backend/tests/setup.ts` / testes de outros módulos.

Depois do scaffold:
1. Regista o novo prefixo de rota em `backend/src/app.ts` (ver como `/api/products`, `/api/supermarkets`, etc. são montados).
2. Adiciona o modelo Prisma correspondente a `backend/prisma/schema.prisma` e corre `npm run db:migrate` se o módulo precisar de persistência nova.
3. Escreve testes para a lógica nova do service/controller — a convenção deste repositório é testar sempre lógica de backend nova.
4. Se o frontend precisar de consumir o novo endpoint, adiciona-o ao cliente `ofetch` de `frontend/src/api/index.ts`, seguindo o padrão de `productsApi`/`supermarketsApi`.
