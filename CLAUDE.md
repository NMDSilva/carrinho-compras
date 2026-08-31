# CLAUDE.md

Este ficheiro fornece orientação ao Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Visão geral

Monorepo (npm workspaces) para uma aplicação de comparação de preços de supermercado: `shared` (schemas Zod + tipos), `backend` (API Fastify + Prisma), `frontend` (SPA Vue 3). Ver [`README.md`](./README.md) para setup local — este ficheiro foca-se em convenções e gotchas para trabalhar no código.

## Objetivo

O principal objetivo da aplicação é o registo de preços dos produtos, para sempre que seja necessário o utilizador saber o melhor preço de um respetivo produto, em que data estava aquele preço e em qual supermercado.
Futuramente, será para existir um endpoint para cada utilizador criar a sua lista de compras. Ao ir registando os produtos necessários na sua lista, deverá ser informado do melhor preço, data e em qual supermercado foi comprado.

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

Corre `npm run db:generate` antes de testar/buildar o backend se ainda não o tiveres feito neste checkout — alguns módulos (ex: `auth.service.ts`) importam `@prisma/client` diretamente (não só via `shared/lib/prisma.ts`), e esse import falha em runtime sem o client gerado, mesmo com o Prisma mockado nos testes.

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
- **Módulo `compras`** não é uma entidade Prisma — é um endpoint de ingestão de faturas consumido por um workflow externo do n8n (`n8n.nmsilva.eu`), autenticado via `x-api-key` (`N8N_API_KEY`) em vez de JWT. Faz find-or-create de `User`/`Supermarket`/`Product` e escreve `PriceRecord`s. Se o email da fatura não corresponder a nenhum utilizador registado, os registos ficam a pertencer a um utilizador placeholder `sistema@carrinho-compras.local` (find-or-create em `compras.service.ts`), nunca a um id fixo assumido.
- Os origins de CORS estão fixos no código em `app.ts` (não vêm de env var) — mudar domínios permitidos implica editar código.
- **`/docs` (Swagger UI)** só fica registado fora de `NODE_ENV=production` — em produção devolve 404 de propósito (menos superfície de ataque). `/docs/json` (a spec OpenAPI crua) continua acessível em qualquer ambiente.
- **Rate limiting**: `@fastify/rate-limit` está registado com `global: false` — só se aplica onde uma rota define `config: { rateLimit: {...} }`. `/api/auth/login` e `/api/auth/register` têm 5 pedidos/minuto por IP. Decisão deliberada: o registo continua a responder 409 "Email já registado" (permite enumeração de email), mitigado só pelo rate limit — não escondemos essa mensagem, porque a UX de dizer "já tens conta, inicia sessão" foi considerada mais valiosa que fechar esse vetor de baixa severidade numa app pessoal.
- **Verificação de email / reposição de password** (`backend/src/modules/auth/`, `backend/src/shared/lib/email.ts`): conta nova fica `emailVerified: false` e o `login` responde 403 com `code: "EMAIL_NOT_VERIFIED"` até se clicar no link do email (`POST /api/auth/verify-email`). Tokens de verificação (24h) e de reposição de password (1h) guardam-se como hash SHA-256 em `User`, nunca em texto simples. Envio de email via Resend (`RESEND_API_KEY`) — sem essa variável definida, o email fica só registado na consola (`console.log`), pensado para desenvolvimento local sem precisar de conta Resend nem de um serviço tipo Mailhog. `/api/auth/forgot-password` e `/api/auth/resend-verification` respondem sempre a mesma mensagem genérica de sucesso, exista ou não a conta (evita enumeração de email por esses dois endpoints). **Contas criadas antes desta funcionalidade existir ficaram `emailVerified: true` por backfill na migration** — só contas novas precisam de confirmar.

## Convenções do frontend — cores e tema

A app tem tema claro/escuro por utilizador (campo `User.theme`, `"light"`/`"dark"`, escolhido em `/perfil` via `PATCH /api/auth/me`; `App.vue` aplica a classe `.dark` ao `<html>` a partir de `auth.user.theme`). Todo o UI é retemizado automaticamente, sem nenhum par `dark:` escrito no markup, porque **nenhuma view usa cores Tailwind fixas** — só tokens semânticos definidos em `frontend/src/style.css` (`:root` para claro, `.dark` para escuro, expostos como classes pelo bloco `@theme inline`).

**Regra**: nunca escrever `text-gray-*`, `bg-gray-*`, `bg-white`, `text-white`, `border-gray-*`, `text-red-*`, `bg-yellow-*`, etc. no markup — essas classes não respondem à classe `.dark` e ficam ilegíveis num dos temas. Usar sempre:

| Intenção | Token |
| --- | --- |
| Fundo da página | `bg-background` |
| Superfície elevada (cartão, barra lateral, cabeçalho mobile) | `bg-card` |
| Secção destacada (cabeçalho de tabela, rodapé de dialog) | `bg-muted` / `bg-muted/50` |
| Texto principal | `text-foreground` |
| Texto secundário | `text-muted-foreground` |
| Bordas / separadores | só `border`/`border-t`/`divide-y` (o `@layer base { * { @apply border-border } }` já dá a cor) |
| Cor da marca (sólido) | `bg-primary` + `text-primary-foreground` |
| Cor da marca (texto, ícone, item ativo) | `text-primary` |
| Cor da marca (tinta de fundo) | `bg-primary/10`, `border-primary/20` |
| Erro / ação destrutiva | `text-destructive`, `bg-destructive/10` |
| Estados semânticos | `text-success` / `text-warning` / `text-info` (+ `bg-…/10`, `border-…/30`) |
| Séries categóricas (uma cor por supermercado no histórico) | `text-chart-1..5` / `bg-chart-1..5` |

Notas:

- `--success`/`--warning`/`--info` são uma extensão nossa ao conjunto do shadcn (que só traz `--destructive`), precisamente para os badges "mais barato", "Por rever" e de unidade não precisarem de par `dark:` em cada sítio. Tons ~700 no tema claro, ~400 no escuro.
- `--chart-1..5` deixaram de ser a escala de cinzentos que o shadcn-vue gera por omissão e passaram a ser uma paleta categórica real (violet/azul/teal/laranja/vermelho), com tons próprios por tema.
- No tema claro `--background` é ligeiramente mais escuro que `--card` (fundo cinzento, cartões brancos), a mesma relação que o bloco `.dark` já tinha — é isso que permite usar `bg-background`/`bg-card` sem condicionais. `--muted` é um degrau abaixo de `--background` para o separador ativo dos `Tabs` (`bg-background` sobre `bg-muted`) continuar a destacar-se.
- A paleta `brand-*` **foi removida** do `@theme`: a cor da marca vive só em `--primary`. `bg-brand-600` já não compila — é de propósito, falha no build em vez de passar despercebido.

## Variáveis de ambiente (backend/.env)

`DATABASE_URL`, `POSTGRES_PASSWORD`, `PORT`, `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `N8N_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL`.

- Se `JWT_SECRET` não estiver definido, a app cai silenciosamente para `'dev-secret'` — nunca publicar sem o definir explicitamente.
- Se `N8N_API_KEY` não estiver definido, `/api/compras` responde 500 em vez de negar acesso.
- Se `RESEND_API_KEY` não estiver definida, os emails de verificação/reposição ficam só registados na consola (`console.log`) em vez de enviados a sério — comportamento pensado para desenvolvimento, não usar em produção sem a definir.
- `EMAIL_FROM` por omissão é `Carrinho de Compras <onboarding@resend.dev>` (domínio de teste do Resend, só entrega ao email da conta Resend) — em produção convém trocar para um endereço do domínio próprio (`noreply@carrinhodecompras.pt`), depois de verificar o domínio no Resend com os registos DNS que eles pedem.
- `FRONTEND_URL` por omissão é `http://localhost:5173` — usado para montar os links de verificação/reposição enviados por email (`{FRONTEND_URL}/verificar-email?token=...`); em produção tem de ser `https://carrinhodecompras.pt`.

## Backups

`backend/scripts/backup-db.sh` faz `pg_dump` diário e guarda o dump comprimido em `~/backups/carrinho-compras` na própria VM (fora do volume Docker), mantendo só os últimos 14. É instalado como cron job (03:15) pelo próprio workflow de deploy, via `crontab`.

**Decisão deliberada**: backup só local, sem serviço externo (GCS, Drive, etc.) — evita custos adicionais. Protege contra apagar o volume Docker por acidente, migração mal feita ou corrupção, mas **não protege contra perda do disco/VM** (o backup está no mesmo disco que os dados). Se isso vier a ser um problema, mover para um destino fora da VM é a evolução natural.

**Setup manual necessário na VM (ainda não feito por CI):**
1. Instalar o pacote `cron` na VM se não estiver presente (`sudo apt install -y cron` em Debian/Ubuntu) — sem isto o passo de agendamento no deploy.yml só avisa e não falha o deploy, mas o backup não fica agendado.

## Staging

Push para o branch `staging` dispara `.github/workflows/deploy-staging.yml` — mesmo gate (lint+test) e mesma VM da produção, mas isolado: pasta `~/carrinho-compras-staging`, processo pm2 `carrinho-compras-staging`, porta própria (definida no `.env` de staging). Reutiliza o **mesmo container Postgres** da produção (poupa recursos), mas numa base de dados à parte (`carrinho_compras_staging`, criada automaticamente pelo workflow se não existir) — nunca mexe nos dados de produção.

**Setup manual necessário (ainda não feito por CI):**
1. Criar o branch `staging` (`git checkout -b staging && git push -u origin staging`).
2. Adicionar o secret `ENV_FILE_STAGING` no GitHub — mesmas variáveis que `ENV_FILE`, mas com `PORT` diferente (ex: `3001`) e `DATABASE_URL` a apontar para `carrinho_compras_staging` em vez de `carrinho_compras` (mesmo host/porta do Postgres, só muda o nome da BD).
3. Para aceder à app de staging: por omissão só fica acessível na VM (`curl localhost:3001/api/health`) ou via túnel SSH (`ssh -L 3001:localhost:3001 <user>@<host>`) — não há vhost nginx automático. Se quiseres um URL público, cria um `server` block extra no nginx da VM a apontar para a porta de staging e para `~/carrinho-compras-staging/frontend/dist` (o `nginx.conf` no repo é só referência, não é aplicado automaticamente em nenhum dos dois ambientes).

## Tarefas em aberto / dívida técnica conhecida

- **Staging**: confirmado em 2026-08-30 que o branch `staging` ainda não existe e o secret `ENV_FILE_STAGING` ainda não está criado no GitHub — ver secção "Staging" acima para os passos.
- **Achados de auditorias de segurança/qualidade**: registados em [`AUDITORIA.md`](./AUDITORIA.md), com checkbox por achado (por resolver / corrigido). Consultar esse ficheiro antes de propor trabalho novo em áreas já auditadas, e marcar os achados como corrigidos ali (não aqui) quando resolvidos.

## Convenções do repositório

- Branches: `feature/<descrição>`. `staging` é um branch especial de longa duração — ver secção "Staging".
- Mensagens de commit: estilo Conventional Commits, escritas em português.
- Formatação: só Prettier (sem ponto-e-vírgula, aspas simples, indentação de 2 espaços) — ver `.prettierrc`.
- O CI (`.github/workflows/deploy.yml`) builda e faz deploy para GCP em cada push para `main`, correndo primeiro `lint` e `test` como gate antes do build. Depois do `pm2 restart`, faz healthcheck a `/api/health` (10 tentativas, 3s) — se a app não responder, o job falha e mostra os últimos logs do `pm2` (não há rollback automático de código/migrations, só falha visível em vez de silenciosa). Tem `concurrency: group: deploy-production` (`cancel-in-progress: false`) — pushes seguidos para `main` ficam em fila em vez de correr o script de SSH em paralelo (dois deploys a mexer ao mesmo tempo em `npm ci`/`pm2 restart`/migrations na mesma VM seria um risco real). `deploy-staging.yml` tem o mesmo mecanismo, grupo à parte.
- Toda a documentação, especificações, comentários no código e mensagens de commit devem ser escritos em **português de Portugal (pt-PT)**.
