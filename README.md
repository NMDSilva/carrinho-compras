# Carrinho de Compras

Aplicação para registar e comparar preços de produtos entre supermercados. Backend em Fastify + Prisma, frontend em Vue 3, schemas partilhados entre os dois.

## Stack

- **Backend**: Fastify 5, Prisma 7 (Postgres), Zod, JWT
- **Frontend**: Vue 3 (Composition API), Vue Router, Pinia, Vite, Tailwind CSS
- **Shared**: pacote `@carrinho/shared` com os schemas Zod e tipos usados por ambos
- Monorepo com **npm workspaces** — sem pnpm/yarn

## Pré-requisitos

- Node.js 24+
- Docker (para a base de dados Postgres)

## Setup local

1. Clonar o repositório e instalar as dependências:

   ```bash
   npm install
   ```

2. Arrancar a base de dados Postgres:

   ```bash
   cd backend
   docker compose up -d
   ```

3. Criar `backend/.env` a partir do exemplo e preencher os valores:

   ```bash
   cp backend/.env.example backend/.env
   ```

   Variáveis necessárias: `DATABASE_URL`, `POSTGRES_PASSWORD`, `PORT`, `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `N8N_API_KEY`.

4. Gerar o Prisma Client e aplicar as migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. Arrancar tudo (builda o `shared` e corre backend + frontend em simultâneo):

   ```bash
   npm run dev
   ```

   Backend em `http://localhost:3000` (docs da API em `/docs`, só fora de produção), frontend em `http://localhost:5173`.

O primeiro utilizador a registar-se (`POST /api/auth/register` ou pela UI) fica automaticamente `ADMIN`.

## Comandos principais

| Comando                                                        | Descrição                                                |
| -------------------------------------------------------------- | -------------------------------------------------------- |
| `npm run dev`                                                  | Corre backend + frontend em modo de desenvolvimento      |
| `npm run build`                                                | Builda `shared` → `backend` → `frontend`, por esta ordem |
| `npm test`                                                     | Corre os testes de backend e frontend                    |
| `npm run lint` / `lint:fix`                                    | ESLint em todos os workspaces                            |
| `npm run format` / `format:check`                              | Prettier                                                 |
| `npm run db:generate` / `db:migrate` / `db:studio` / `db:seed` | Comandos Prisma                                          |

Mais detalhes (convenções, gotchas, arquitetura) em [`CLAUDE.md`](./CLAUDE.md).

## Testes

```bash
npm test
```

Vitest em ambos os workspaces. Para correr um único teste: `npx vitest run <caminho>`, dentro de `backend/` ou `frontend/`.

## Deploy

Deploy automático para uma VM na GCP a cada push para `main`, via GitHub Actions (`.github/workflows/deploy.yml`) — lint + testes como gate, depois build, rsync e restart via `pm2`, com healthcheck pós-deploy. Backups diários da base de dados ficam guardados localmente na VM (ver `CLAUDE.md`, secção "Backups").
