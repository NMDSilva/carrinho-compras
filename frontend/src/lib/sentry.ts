import type { App } from 'vue'
import * as Sentry from '@sentry/vue'

/**
 * `VITE_SENTRY_DSN` não é segredo — só permite enviar eventos, nunca lê dados
 * do projeto Sentry — mas fica em `frontend/.env.production` e não fixo no
 * código, para trocar de projeto/DSN sem recompilar código-fonte. Sem essa
 * variável (ex: `vite dev`, que não carrega `.env.production`), o Sentry
 * fica por inicializar de propósito — não vale a pena poluir o projeto com
 * erros de localhost.
 *
 * `import.meta.env.MODE` é `'production'` no build servido pelo nginx e
 * `'development'` no `vite dev`.
 */
export function inicializarSentry(app: App) {
  if (!import.meta.env.VITE_SENTRY_DSN) return
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
  })
}
