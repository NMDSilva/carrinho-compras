import * as Sentry from '@sentry/node'

// SENTRY_DSN não é segredo — só permite enviar eventos, nunca lê dados do
// projeto Sentry — mas fica em env var, não fixa no código, para trocar de
// projeto/DSN sem recompilar. Se não estiver definida (ex: dev local sem
// conta Sentry), fica por inicializar e os erros continuam só nos logs da
// consola/pm2 — mesmo padrão do RESEND_API_KEY em `shared/lib/email.ts`.
//
// A verificação de NODE_ENV !== 'test' evita que o SDK registe
// `onUncaughtException`/`onUnhandledRejection` globais que terminam o
// processo — o vitest passaria a abortar em vez de reportar a falha do teste.
if (process.env.SENTRY_DSN && process.env.NODE_ENV !== 'test') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
  })
}

export default Sentry
