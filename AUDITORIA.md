# Auditoria do projeto

Registo cumulativo de achados de auditorias (segurança, qualidade, dívida técnica). Cada achado fica marcado como `[ ]` (por resolver) ou `[x]` (corrigido, com data e commit/PR se aplicável). Não apagar achados corrigidos — manter o histórico.

## 30/08/2026

- [x] **Alto** (corrigido em 30/08/2026 12:39) — `PATCH /api/auth/me` (`backend/src/modules/auth/auth.controller.ts:82-100`) deixa mudar o `email` sem repor `emailVerified: false` nem exigir reverificação. Como `compras.service.ts` faz find-or-create de `User` por email para associar faturas do n8n, um utilizador pode mudar o seu email para o de outra pessoa e sequestrar os registos de preços dela. **Correção aplicada:** `updateMe` repõe `emailVerified: false` e reenvia o email de verificação para o novo endereço quando o email muda; adicionalmente, `compras.service.ts` só associa a fatura a um utilizador existente se `emailVerified: true` (caso contrário cai no utilizador Sistema), fechando o vetor mesmo antes da reverificação. Testes novos em `auth.test.ts` (3) e `compras.test.ts` (1).
- [ ] **Alto** — `npm audit` (root e `backend`) reporta 3 vulnerabilidades "high" em `deepmerge-ts`, arrastadas pela CLI do Prisma (`@prisma/config`, devDependency). Downgrade do Prisma 7→6 resolveria mas contraria a stack atual — aguardar patch upstream, reavaliar periodicamente.
- [ ] **Médio** — falta `@fastify/helmet` (ou equivalente) em `backend/src/app.ts`: sem cabeçalhos de segurança HTTP (`X-Content-Type-Options`, CSP/`X-Frame-Options`, `Referrer-Policy`).
- [ ] **Baixo** — `backend/src/shared/middleware/apiKey.middleware.ts:11` compara o `N8N_API_KEY` com `!==` em vez de `crypto.timingSafeEqual` (risco teórico de timing attack).
- [ ] **A esclarecer** — `requireAuth` (não `requireAdmin`) basta para editar/eliminar produtos e preços de outros utilizadores. Confirmar se é intencional (catálogo partilhado entre utilizadores) antes de decidir se é um problema a corrigir.
- [ ] **Limpeza** — existe um `git stash` local (não é código no repo, só nota) de uma migração SQLite→Postgres já concluída e mergeada em `main` — confirmar que pode ser descartado.

### Sem achados / decisões deliberadas confirmadas nesta auditoria

`npm run lint`, `vue-tsc --noEmit` e `npm test` (78 backend + 63 frontend) passavam todos nesta data. `role` como String simples, 409 no registo, backups locais, `EMAIL_FROM` de teste e o fallback de `JWT_SECRET` em dev são decisões já documentadas no `CLAUDE.md` — não repetidas aqui.
