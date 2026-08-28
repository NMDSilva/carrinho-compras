# Esquema da Aplicação

> **Manutenção obrigatória**: sempre que se acrescentar, remover ou alterar uma funcionalidade (nova view, nova rota de API, novo módulo, nova entidade, novo fluxo), este ficheiro tem de ser atualizado no mesmo PR/commit. É a referência única para perceber o que a aplicação faz e como as peças se ligam.

## 1. Visão geral

Aplicação para registar e comparar preços de produtos entre supermercados. Monorepo npm workspaces:

- **`shared`** — schemas Zod + tipos, fonte única de verdade do contrato da API.
- **`backend`** — API Fastify 5 + Prisma 7 (Postgres), autenticação JWT.
- **`frontend`** — SPA Vue 3 (Composition API) + Vue Router + Pinia + Tailwind.

Ver [`../CLAUDE.md`](../CLAUDE.md) para convenções técnicas, comandos e detalhes de deploy/staging/backups.

## 2. Utilizadores e autenticação

- Qualquer pessoa pode registar-se (`POST /api/auth/register`). **O primeiro utilizador a registar-se na base de dados fica automaticamente `ADMIN`**; todos os seguintes ficam `USER`.
- `role` é uma string livre (`"USER"` / `"ADMIN"`), não um enum na base de dados.
- Login (`POST /api/auth/login`) devolve um JWT guardado em `localStorage` (`token`) pelo frontend.
- Rotas de API protegidas usam `requireAuth` (qualquer utilizador autenticado) ou `requireAdmin` (só `ADMIN`) — middleware em `backend/src/shared/middleware/auth.middleware.ts`.
- `/api/auth/login` e `/api/auth/register` têm rate limit de 5 pedidos/minuto por IP.
- No frontend, o router (`frontend/src/router/index.ts`) tem um guard global: rotas com `meta.requiresAuth` redirecionam para `/login` se não autenticado; `meta.requiresAdmin` redireciona para o dashboard se o utilizador não for admin; visitar `/login` já autenticado redireciona para o dashboard.
- Um segundo canal de autenticação, independente do JWT, existe para o endpoint `/api/compras` — ver secção 6.

## 3. Mapa de páginas (frontend)

| Rota                     | View                  | Acesso           | O que faz                                                                 |
| ------------------------ | --------------------- | ----------------- | -------------------------------------------------------------------------- |
| `/login`                 | `LoginView`           | público           | Login e registo de conta                                                   |
| `/`                      | `DashboardView`       | autenticado       | Estatísticas gerais, últimos preços registados, produtos mais baratos      |
| `/produtos`              | `ProductsView`        | autenticado       | Listar, pesquisar, criar, editar e eliminar produtos genéricos e as suas variantes (marca/embalagem); mover uma variante para outro produto |
| `/produtos/:id/editar`   | `ProductsView`        | autenticado       | Mesma view, em modo de edição de um produto específico                    |
| `/produtos/revisao`      | `ReviewProductsView`  | autenticado       | Produtos criados automaticamente pela ingestão de faturas (`needsReview`) — reatribuir a variante para um produto existente ou marcar como revisto |
| `/supermercados`         | `SupermarketsView`    | autenticado       | Listar, criar, editar e eliminar supermercados                             |
| `/precos`                | `PricesView`          | autenticado       | Listar (paginado), registar, editar e eliminar registos de preço          |
| `/precos/:id/editar`     | `PricesView`          | autenticado       | Mesma view, em modo de edição de um preço específico                      |
| `/comparar`               | `CompareView`         | autenticado       | Comparar preços de um produto entre supermercados + histórico             |
| `/perfil`                | `ProfileView`         | autenticado       | Editar nome/email/password da própria conta                               |
| `/admin/utilizadores`    | `UsersView`           | autenticado + ADMIN | Listar, editar e eliminar contas de utilizador                            |

## 4. Modelo de dados

Entidades Prisma (`backend/prisma/schema.prisma`):

- **`User`** — `id, email (único), password (hash bcrypt), name, role`. Dono de registos criados/atualizados (`createdBy`/`updatedBy` em Product, ProductVariant, Supermarket, PriceRecord).
- **`Product`** (produto genérico) — `id, name, category?, needsReview`. Ex: "Açúcar branco". `needsReview` marca produtos criados automaticamente pela ingestão de faturas (n8n) que ainda não foram curados manualmente — ver secção 6.
- **`ProductVariant`** (marca + tamanho de embalagem + unidade de um Product) — `id, productId, brand?, packageSize?, packCount?, unit`. Ex: `brand="Sidul", packageSize=1, unit="kg"` → "Sidul 1Kg". `packCount` distingue um multipack de um pack simples do mesmo tamanho/marca — ex: "3X210G" → `packageSize=210, packCount=3` → "3×210g", separado de um "210g" simples (`packCount=null`). Único por `(productId, brand, packageSize, unit, packCount)`.
- **`Supermarket`** — `id, name (único), location?`.
- **`PriceRecord`** — `id, variantId, supermarketId, price, quantity, date, notes?`. Ligado a `ProductVariant` (que por sua vez liga a `Product`) e a `Supermarket`, ambos com `onDelete: Cascade` — eliminar um produto elimina em cascata as suas variantes e os preços associados; eliminar uma variante elimina só os seus preços. Índices em `variantId`, `supermarketId`, `date`.

```
User ──< Product (createdBy/updatedBy)
User ──< ProductVariant (createdBy/updatedBy)
User ──< PriceRecord (createdBy/updatedBy)
Product ──< ProductVariant ──< PriceRecord >── Supermarket
```

**Nota histórica**: até 2026-08-28 o modelo era uma única tabela `Product` com `name+brand+unit` misturados (impedia comparar preços entre marcas do mesmo produto — ex: "ACUCAR BR SIDUL EMB PAPEL 1KG" e "ACUCAR BRANCO CONTINENTE 1KG" eram dois produtos sem qualquer relação). A migração para produto genérico + variante preservou automaticamente todo o histórico existente (cada `Product` antigo foi dividido 1:1 em Product + 1 variante); produtos duplicados como o exemplo acima continuam por fundir manualmente — usar "Editar" em `/produtos` para mover preços entre variantes de sítio, ou a fila `/produtos/revisao` para os criados via fatura.

## 5. Funcionalidades por área

### Produtos e variantes
- Listar produtos genéricos com pesquisa por nome, filtro por categoria e filtro `needsReview` (`GET /api/products`, público).
- Listar categorias existentes (`GET /api/products/categories`, público).
- Ver detalhe de um produto, com as suas variantes (`GET /api/products/:id`, público).
- Criar / editar / eliminar produto — requer autenticação. Eliminar um produto elimina em cascata todas as suas variantes e preços.
- **Marcar como revisto** (`PATCH /api/products/:id/review`) — limpa `needsReview`; ação dedicada (não faz parte do update genérico) usada pela fila `/produtos/revisao`.
- Listar / criar variantes de um produto (`GET/POST /api/products/:productId/variants`, criar requer autenticação).
- Ver / editar / eliminar uma variante (`GET/PUT/DELETE /api/variants/:id`, editar/eliminar requerem autenticação e ownership).
- **Reatribuir variante** (`PATCH /api/variants/:id/reassign`) — move uma variante para outro produto genérico (ferramenta de arrumação manual); se o produto de origem ficar sem variantes, é eliminado automaticamente. Disponível tanto em `/produtos` (botão "Mover" em cada variante, com pesquisa do produto destino) como em `/produtos/revisao`.

### Supermercados
- Listar e ver detalhe — público.
- Criar / editar / eliminar — requer autenticação.

### Preços
- Listar com paginação e filtros por variante ou por produto genérico (`GET /api/prices`, público).
- Criar / editar / eliminar (por variante) — requer autenticação.
- **Comparar** (`GET /api/prices/compare/:productId`) — ao nível do produto genérico: melhor preço por par (supermercado, variante), ordenado do mais barato ao mais caro, entre todas as marcas do produto.
- **Histórico** (`GET /api/prices/history/:variantId`) — ao nível da variante: evolução do preço dessa marca/embalagem ao longo do tempo, filtrável por supermercados (misturar marcas na mesma série seria enganador).
- **Dashboard** (`GET /api/prices/dashboard`) — contagens totais (produtos, supermercados, registos de preço), últimos 5 preços registados, e top 10 produtos mais baratos por produto genérico (com a marca/unidade da variante vencedora), via query SQL `DISTINCT ON`.

### Perfil
- `GET /api/auth/me` e `PATCH /api/auth/me` — o próprio utilizador vê/atualiza nome, email e password.

### Administração de utilizadores (só ADMIN)
- `GET /api/admin/users`, `GET /api/admin/users/:id`, `PATCH /api/admin/users/:id`, `DELETE /api/admin/users/:id`.

## 6. Importação automática via fatura (n8n)

- `POST /api/compras` — não tem UI própria; é consumido por um workflow externo do **n8n** (`n8n.nmsilva.eu`) que faz OCR/parsing de faturas de supermercado.
- Autenticado por API key (`x-api-key: N8N_API_KEY`), **não** por JWT (middleware `requireApiKey`, não `requireAuth`).
- Recebe: email do cliente, nome do supermercado, número da fatura, data e lista de produtos+valores (`{ produto: string, valor: number }` — texto livre, sem marca/tamanho/unidade separados).
- Lógica (`compras.service.ts`), tudo dentro de uma transação Prisma:
  1. Procura o `User` pelo email da fatura (case-insensitive). Se não existir nenhum, usa/cria um utilizador placeholder `sistema@carrinho-compras.local` (password aleatória, nunca faz login) como dono dos registos — nunca assume um id fixo.
  2. Find-or-create do `Supermarket` pelo nome (case-insensitive).
  3. Para cada produto da fatura: find-or-create de um `Product` por **texto exato (case-insensitive) do nome** — texto repetido em faturas futuras reutiliza o mesmo produto e continua a acumular histórico. Se não encontrar (ou encontrar um produto já curado manualmente com 0 ou 2+ variantes, logo sem variante inequívoca para atribuir o preço), cria sempre um `Product` novo com `needsReview: true` e exatamente 1 `ProductVariant` (unidade `"un"` por omissão, sem marca/tamanho — o texto da fatura não os separa). **Nunca tenta adivinhar/fundir por semelhança de texto.**
  4. Cria o `PriceRecord` ligado a essa variante, com nota a referenciar o número da fatura.
- Os produtos criados desta forma ficam visíveis em `/produtos/revisao` para o utilizador reatribuir a variante para o produto genérico correto (ex: fundir "ACUCAR BR SIDUL EMB PAPEL 1KG" em "Açúcar branco") ou simplesmente marcar como revisto.
- Se `N8N_API_KEY` não estiver definida no ambiente, o endpoint responde 500 em vez de negar acesso (ver `CLAUDE.md`).

## 7. Mapa de endpoints da API

Prefixo base: `/api`. Documentação interativa em `/docs` (Swagger UI), só disponível fora de produção; `/docs/json` (spec OpenAPI crua) está sempre acessível.

| Método | Rota                          | Auth              | Descrição                                  |
| ------ | ------------------------------ | ------------------ | -------------------------------------------- |
| GET    | `/api/health`                  | —                  | Healthcheck (usado pelo deploy)              |
| POST   | `/api/auth/register`           | — (rate-limited)  | Registar conta (1º utilizador = ADMIN)       |
| POST   | `/api/auth/login`              | — (rate-limited)  | Login, devolve JWT                            |
| GET    | `/api/auth/me`                 | JWT                | Perfil do utilizador autenticado             |
| PATCH  | `/api/auth/me`                 | JWT                | Atualizar próprio perfil                      |
| GET    | `/api/admin/users`             | JWT + ADMIN        | Listar utilizadores                           |
| GET    | `/api/admin/users/:id`         | JWT + ADMIN        | Detalhe de utilizador                        |
| PATCH  | `/api/admin/users/:id`         | JWT + ADMIN        | Atualizar utilizador                          |
| DELETE | `/api/admin/users/:id`         | JWT + ADMIN        | Eliminar utilizador                           |
| POST   | `/api/compras`                 | `x-api-key`        | Ingestão de fatura via workflow n8n           |
| GET    | `/api/products`                | —                  | Listar produtos (pesquisa + filtro categoria + `needsReview`) |
| GET    | `/api/products/categories`     | —                  | Listar categorias                             |
| GET    | `/api/products/:id`            | —                  | Detalhe de produto (com variantes)            |
| POST   | `/api/products`                | JWT                | Criar produto                                 |
| PUT    | `/api/products/:id`            | JWT                | Atualizar produto                             |
| DELETE | `/api/products/:id`            | JWT                | Eliminar produto (cascata: variantes + preços)|
| PATCH  | `/api/products/:id/review`     | JWT                | Marcar produto como revisto (limpa `needsReview`) |
| GET    | `/api/products/:productId/variants` | —             | Listar variantes de um produto                |
| POST   | `/api/products/:productId/variants` | JWT           | Criar variante                                |
| GET    | `/api/variants/:id`            | —                  | Detalhe de uma variante                       |
| PUT    | `/api/variants/:id`            | JWT                | Atualizar variante                            |
| DELETE | `/api/variants/:id`            | JWT                | Eliminar variante                             |
| PATCH  | `/api/variants/:id/reassign`   | JWT                | Reatribuir variante para outro produto genérico |
| GET    | `/api/supermarkets`            | —                  | Listar supermercados                          |
| GET    | `/api/supermarkets/:id`        | —                  | Detalhe de supermercado                       |
| POST   | `/api/supermarkets`            | JWT                | Criar supermercado                            |
| PUT    | `/api/supermarkets/:id`        | JWT                | Atualizar supermercado                        |
| DELETE | `/api/supermarkets/:id`        | JWT                | Eliminar supermercado                         |
| GET    | `/api/prices/dashboard`        | —                  | Estatísticas do dashboard                     |
| GET    | `/api/prices/compare/:productId` | —                | Comparar preços entre supermercados/marcas (nível produto) |
| GET    | `/api/prices/history/:variantId` | —                | Histórico de preços de uma variante          |
| GET    | `/api/prices`                  | —                  | Listar preços (paginado, filtrável por variante/produto) |
| GET    | `/api/prices/:id`              | —                  | Detalhe de um preço                           |
| POST   | `/api/prices`                  | JWT                | Registar preço (ligado a uma variante)        |
| PUT    | `/api/prices/:id`              | JWT                | Atualizar preço                               |
| DELETE | `/api/prices/:id`              | JWT                | Eliminar preço                                |

## 8. Fluxos principais

**Registo/login** — `LoginView` → `authStore.login/register` → `POST /api/auth/login|register` → token guardado em `localStorage` → router guard liberta rotas protegidas.

**Registo manual de preço** — `PricesView` → seleciona produto genérico, depois variante (marca), e supermercado → `POST /api/prices` (JWT, `variantId`) → aparece na listagem e nas estatísticas do dashboard.

**Comparação de preços** — `CompareView` → escolhe produto → `GET /api/prices/compare/:productId` (melhor preço por supermercado/marca, nível produto) + escolhe variante → `GET /api/prices/history/:variantId` (evolução temporal dessa marca).

**Importação via fatura** — n8n faz parsing da fatura → `POST /api/compras` (x-api-key) → find-or-create de utilizador/supermercado, produto placeholder + variante única marcados `needsReview: true` → `PriceRecord`s criados → visíveis de imediato em `/precos`, `/comparar`, no dashboard e na fila `/produtos/revisao`.

**Curadoria de produtos importados** — `ReviewProductsView` (`/produtos/revisao`) → lista produtos `needsReview` → reatribui a variante para um produto genérico existente (`PATCH /api/variants/:id/reassign`, apaga o placeholder de origem se ficar vazio) ou marca como revisto (`PATCH /api/products/:id/review`).

**Sessão expirada** — qualquer pedido do frontend que receba 401 (interceptado em `frontend/src/api/index.ts`) limpa o token e redireciona para `/login?redirect=<rota atual>`.
