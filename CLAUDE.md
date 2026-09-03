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
- **Toda a API exige autenticação — leituras incluídas.** Até 31/08/2026 os `GET` de `products`/`variants`/`supermarkets`/`prices` eram públicos e expunham o dataset todo, os nomes reais em `createdBy` e os números das faturas em `notes` (ver `AUDITORIA.md`). Uma rota nova de leitura leva `onRequest: [requireAuth]` como qualquer outra. As duas exceções, ambas deliberadas: `GET /api/health` (público, é o healthcheck do deploy e da monitorização) e `POST /api/compras` (autenticado por `x-api-key` em vez de JWT).
- **`GET /api/health` toca na base de dados** (`SELECT 1`) e responde 503 se ela não responder. Antes devolvia um objeto estático, e por isso uma app de pé mas sem ligação à BD (ex: password errada no `.env`) passava o healthcheck do deploy e ficava inútil em silêncio.
- **`role` em `User`** é uma `String` simples do Prisma (não um enum) — `"USER"`/`"ADMIN"` são apenas uma convenção de código, não reforçada ao nível da base de dados.
- **Módulo `compras`** não é uma entidade Prisma — é um endpoint de ingestão de faturas consumido por um workflow externo do n8n (`n8n.nmsilva.eu`), autenticado via `x-api-key` (`N8N_API_KEY`) em vez de JWT. Faz find-or-create de `User`/`Supermarket`/`Product` e escreve `PriceRecord`s. Se o email da fatura não corresponder a nenhum utilizador registado, os registos ficam a pertencer a um utilizador placeholder `sistema@carrinho-compras.local` (find-or-create em `compras.service.ts`), nunca a um id fixo assumido. **A ingestão é idempotente**: cada `PriceRecord` importado guarda `invoiceRef` (número da fatura) e `invoiceLine` (posição na fatura), e um pedido repetido para a mesma fatura/supermercado devolve os registos da importação original com `alreadyImported: true` e contadores a 0, sem criar nada. O `@@unique([invoiceRef, supermarketId, invoiceLine])` é a rede de segurança para dois pedidos em paralelo (o segundo dá 409). Ambas as colunas ficam `NULL` nos preços criados à mão na app, e o Postgres não aplica índices únicos a linhas com `NULL` — por isso o registo manual não é afetado.
- Os origins de CORS estão fixos no código em `app.ts` (não vêm de env var) — mudar domínios permitidos implica editar código.
- **`/docs` (Swagger UI)** só fica registado fora de `NODE_ENV=production` — em produção o Fastify devolve 404 de propósito (menos superfície de ataque). `/docs/json` (a spec OpenAPI crua) continua registada em qualquer ambiente **ao nível do Fastify**, mas em produção não está exposta: o nginx só encaminha `/api/*`, por isso `/docs` e `/docs/json` devolvem o `index.html` da SPA (confirmado em 31/08/2026).
- **Rate limiting**: `@fastify/rate-limit` está registado com `global: false` — só se aplica onde uma rota define `config: { rateLimit: {...} }`. Todas as rotas de `/api/auth` o definem: `login` e `register` 5/minuto, `reset-password` 5/minuto, `verify-email` 10/minuto, e os dois que enviam email a pedido de qualquer pessoa (`forgot-password`, `resend-verification`) 3 por 5 minutos. O resto da API não tem limite. Decisão deliberada: o registo continua a responder 409 "Email já registado" (permite enumeração de email), mitigado só pelo rate limit — não escondemos essa mensagem, porque a UX de dizer "já tens conta, inicia sessão" foi considerada mais valiosa que fechar esse vetor de baixa severidade numa app pessoal.
- **Verificação de email / reposição de password** (`backend/src/modules/auth/`, `backend/src/shared/lib/email.ts`): conta nova fica `emailVerified: false` e o `login` responde 403 com `code: "EMAIL_NOT_VERIFIED"` até se clicar no link do email (`POST /api/auth/verify-email`). Tokens de verificação (24h) e de reposição de password (1h) guardam-se como hash SHA-256 em `User`, nunca em texto simples. Envio de email via Resend (`RESEND_API_KEY`) — sem essa variável definida, o email fica só registado na consola (`console.log`), pensado para desenvolvimento local sem precisar de conta Resend nem de um serviço tipo Mailhog. `/api/auth/forgot-password` e `/api/auth/resend-verification` respondem sempre a mesma mensagem genérica de sucesso, exista ou não a conta (evita enumeração de email por esses dois endpoints). **Contas criadas antes desta funcionalidade existir ficaram `emailVerified: true` por backfill na migration** — só contas novas precisam de confirmar.
- **Revogação de sessões (`User.tokenVersion`)**: o JWT é stateless e válido 7 dias, por isso o payload leva `tv` (a `tokenVersion` do utilizador no momento do login) e `requireAuth`/`requireAdmin` comparam-no com o valor em BD a cada pedido. **Qualquer alteração de password incrementa a coluna** e invalida de imediato todos os tokens anteriores — nos três caminhos: `PATCH /api/auth/me`, `POST /api/auth/reset-password` e `PATCH /api/admin/users/:id`. Quem muda a própria password recebe um `token` novo na resposta do PATCH (o cliente guarda-o), para não se expulsar a si próprio; as outras sessões dessa conta caem. Tokens sem `tv` (emitidos antes desta funcionalidade) são aceites de propósito, senão o deploy expulsava toda a gente. A leitura da versão vive em `shared/lib/session.ts`, e não no middleware, para os testes terem um ponto de mock que não compete com os `mockResolvedValueOnce` de `user.findUnique` dos controllers (é mockada globalmente em `tests/setup.ts`).
- **Mudar um email repõe sempre `emailVerified: false` e reenvia a verificação**, nos dois caminhos que o permitem: `PATCH /api/auth/me` (o próprio) e `PATCH /api/admin/users/:id` (um ADMIN a mexer noutra conta). Não é cosmético: `compras.service.ts` associa as faturas do n8n por email, mas só a contas com `emailVerified: true` — um email trocado que ficasse marcado como confirmado sequestrava as faturas desse endereço. O caminho self-service exige ainda a `currentPassword` para mudar o email (senão um JWT roubado bastava para trocar o email e tomar a conta via `/forgot-password`), e valida-a **antes** de responder 409 "Email já em uso", para não revelar contas a quem não sabe a password.

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

## Convenções do frontend — componentes `ui/`

`frontend/src/components/ui/` é código gerado pelo shadcn-vue (`npx shadcn-vue add ...`), não escrito à mão. A regra `vue/require-default-prop` está desligada só para essa pasta no `eslint.config.mjs`: ali as props opcionais sem valor por omissão são intencionais (o `class` vai para o `cn()`, que trata o `undefined`, e o `variant`/`size` ficam por definir para o `cva` aplicar os seus próprios defaults). Nos nossos componentes a regra continua ativa.

## Variáveis de ambiente (backend/.env)

`DATABASE_URL`, `POSTGRES_PASSWORD`, `PORT`, `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `N8N_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL`.

- **`DATABASE_URL` e `JWT_SECRET` são obrigatórias: sem elas a app falha a arrancar**, com mensagem explícita. Ambas tiveram fallbacks embutidos no código (`'dev-secret'` e uma connection string com password real), removidos a 03/09/2026 quando o repositório passou a público — ver `AUDITORIA.md`. Não voltar a pôr credenciais ou segredos em código, nem como valor por omissão: ficam no histórico do git para sempre, e o repositório é público.
- Se `N8N_API_KEY` não estiver definido, `/api/compras` responde 500 em vez de negar acesso.
- Se `RESEND_API_KEY` não estiver definida, os emails de verificação/reposição ficam só registados na consola (`console.log`) em vez de enviados a sério — comportamento pensado para desenvolvimento, não usar em produção sem a definir.
- `EMAIL_FROM` por omissão é `Carrinho de Compras <onboarding@resend.dev>` (domínio de teste do Resend, só entrega ao email da conta Resend) — em produção convém trocar para um endereço do domínio próprio (`noreply@carrinhodecompras.pt`), depois de verificar o domínio no Resend com os registos DNS que eles pedem.
- `FRONTEND_URL` por omissão é `http://localhost:5173` — usado para montar os links de verificação/reposição enviados por email (`{FRONTEND_URL}/verificar-email?token=...`); em produção tem de ser `https://carrinhodecompras.pt`.

## nginx (VM)

**A configuração do nginx vive só na VM**, em `/etc/nginx/sites-available/carrinho-compras` (com symlink em `sites-enabled/`). Não há cópia no repositório de propósito — existiu um `nginx.conf` de referência e foi removido em 31/08/2026 depois de causar uma paragem do site (ver abaixo). Nenhum workflow gere o nginx.

O que essa config faz: serve a SPA a partir de `frontend/dist` com fallback para `index.html`, faz proxy de `/api/` para `localhost:3000`, e tem um bloco `listen 443 ssl` com os certificados Let's Encrypt, escrito e renovado pelo **certbot**.

**Nunca substituir esse ficheiro por inteiro.** O bloco TLS vive lá dentro e não existe em mais lado nenhum. Apagá-lo deixa o nginx só com `listen 80`; como a Cloudflare está em modo **Full** e se liga à origem por 443, tudo passa a responder **521** — site, API e o endpoint do n8n. Aconteceu a 31/08/2026, ao copiar para lá o antigo `nginx.conf` do repo. O diagnóstico é traiçoeiro: `nginx -t` passa e `systemctl status nginx` diz "running", porque o nginx está mesmo bem, só sem TLS. Confirma-se com `sudo ss -ltnp | grep -E ':(80|443)\b'` — nesse estado só aparece a porta 80.

**Recuperação** (não faz validação nenhuma, não precisa do site acessível):

```bash
sudo certbot install --cert-name carrinhodecompras.pt --nginx
```

Para alterar a config: editar o ficheiro na VM acrescentando só as linhas em falta, `sudo nginx -t`, `sudo systemctl reload nginx`, e confirmar com `curl -sI https://carrinhodecompras.pt/` que responde 200 e traz os cabeçalhos.

### Cabeçalhos de segurança da SPA

Ficam no `location /` e **não** ao nível do `server`, para não duplicarem os que o `@fastify/helmet` já devolve em `/api/` (dois `X-Frame-Options` deixariam o browser a escolher). Atenção ao comportamento do nginx: `add_header` dentro de um `location` descarta os herdados do `server`, por isso qualquer cabeçalho novo tem de ser acrescentado aí.

```nginx
add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://www.googletagmanager.com https://www.google-analytics.com; connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com; upgrade-insecure-requests" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), interest-cohort=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

Duas decisões deliberadas nesta CSP:

- **Sem `'unsafe-inline'` em `script-src`** — é isso que a torna útil contra XSS (o JWT vive em `localStorage`, logo um XSS dá tomada de conta completa). Só é possível porque o arranque do Google Analytics vive em `frontend/public/analytics.js` e não inline no `index.html`. **Se voltar a haver um `<script>` inline no `index.html`, esse script deixa de correr.**
- **Com `'unsafe-inline'` em `style-src`** — inevitável: o Vue e o reka-ui (Popover/Select/Dialog) posicionam-se com estilos inline.

Validada a servir o `dist/` localmente com estes cabeçalhos, exercitando login, tabelas, dialogs, combobox e Select: zero eventos `securitypolicyviolation`.

## Backups

`backend/scripts/backup-db.sh` faz `pg_dump` diário e guarda o dump comprimido em `~/backups/carrinho-compras` na própria VM (fora do volume Docker), mantendo só os últimos 14. É instalado como cron job (03:15) pelo próprio workflow de deploy, via `crontab`. **O deploy corre também o mesmo script antes de cada `prisma migrate deploy`** — não há rollback automático de migrations, e sem isto uma migração destrutiva a meio do dia podia custar quase 24h de dados. Antes do dump há uma espera com `pg_isready` (o `docker compose up -d` devolve antes de o Postgres aceitar ligações); se o Postgres não responder, o backup é saltado com aviso, mas um dump que arranque e falhe aborta o deploy de propósito.

**Decisão deliberada**: backup só local, sem serviço externo (GCS, Drive, etc.) — evita custos adicionais. Protege contra apagar o volume Docker por acidente, migração mal feita ou corrupção, mas **não protege contra perda do disco/VM** (o backup está no mesmo disco que os dados). Se isso vier a ser um problema, mover para um destino fora da VM é a evolução natural.

**Setup manual necessário na VM (ainda não feito por CI):**
1. Instalar o pacote `cron` na VM se não estiver presente (`sudo apt install -y cron` em Debian/Ubuntu) — sem isto o passo de agendamento no deploy.yml só avisa e não falha o deploy, mas o backup não fica agendado.

## Tarefas em aberto / dívida técnica conhecida

- **Achados de auditorias de segurança/qualidade**: registados em [`AUDITORIA.md`](./AUDITORIA.md), com checkbox por achado (por resolver / corrigido). Consultar esse ficheiro antes de propor trabalho novo em áreas já auditadas, e marcar os achados como corrigidos ali (não aqui) quando resolvidos.

## Convenções do repositório

- **`main` é protegido: não se commita lá diretamente.** Toda a alteração vive num branch `feature/<descrição>`, criado a partir de `main`, e entra por Pull Request. O push direto é recusado pelo GitHub (`GH006`), inclusive para o dono do repositório.
- **Fluxo:** `git checkout -b feature/x` → commits → `git push -u origin feature/x` → `gh pr create --fill`. O workflow [`pr-checks.yml`](.github/workflows/pr-checks.yml) corre lint, testes e type-check do frontend e do backend; o merge fica bloqueado até ficar verde e até o branch estar atualizado com `main` (regra `strict`). O merge é sempre **squash** — o repositório exige histórico linear e tem os merge commits desligados.
- **O título da PR vira a mensagem do commit** quando a PR tem mais do que um commit (com um só, usa-se a mensagem desse commit). Escrever o título já em Conventional Commits, como as mensagens.
- Não há aprovações exigidas na PR, e é deliberado: o GitHub não deixa aprovar as próprias PRs, e o projeto é mantido por uma pessoa. A PR continua obrigatória; a aprovação é o clique em *Merge*.
- Emergência com `main` partido: Settings → Branches → desligar *"Do not allow bypassing the above settings"*, corrigir, voltar a ligar.
- Não há ambiente intermédio: o merge em `main` vai direto para produção. (Existiu um branch `staging` com ambiente próprio entre 31/08 e 03/09/2026; foi descontinuado por não compensar numa app mantida por uma só pessoa — o histórico dos problemas que deu está no `AUDITORIA.md`.)
- Mensagens de commit: estilo Conventional Commits, escritas em português.
- Formatação: só Prettier (sem ponto-e-vírgula, aspas simples, indentação de 2 espaços) — ver `.prettierrc`.
- O CI (`.github/workflows/deploy.yml`) builda e faz deploy para GCP em cada push para `main`, correndo primeiro `lint` e `test` como gate antes do build. Depois do `pm2 restart`, faz healthcheck a `/api/health` (10 tentativas, 3s) — se a app não responder, o job falha e mostra os últimos logs do `pm2` (não há rollback automático de código/migrations, só falha visível em vez de silenciosa). Tem `concurrency: group: deploy-production` (`cancel-in-progress: false`) — pushes seguidos para `main` ficam em fila em vez de correr o script de SSH em paralelo (dois deploys a mexer ao mesmo tempo em `npm ci`/`pm2 restart`/migrations na mesma VM seria um risco real).
- Toda a documentação, especificações, comentários no código e mensagens de commit devem ser escritos em **português de Portugal (pt-PT)**.
