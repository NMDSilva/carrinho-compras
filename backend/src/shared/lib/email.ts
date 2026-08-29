import { Resend } from 'resend'

// Sem RESEND_API_KEY definida (ex: desenvolvimento local sem configurar o
// serviço), os emails ficam só registados na consola em vez de enviados a
// sério — permite testar os fluxos de verificação/reposição sem precisar de
// uma conta Resend nem de um serviço local tipo Mailhog.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM = process.env.EMAIL_FROM ?? 'Carrinho de Compras <onboarding@resend.dev>'
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'

async function send(to: string, subject: string, html: string, url: string) {
  if (!resend) {
    console.log(`\n📧 [email simulado — RESEND_API_KEY não definida]\nPara: ${to}\nAssunto: ${subject}\nLink: ${url}\n`)
    return
  }
  await resend.emails.send({ from: FROM, to, subject, html })
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const url = `${FRONTEND_URL}/verificar-email?token=${encodeURIComponent(token)}`
  await send(
    to,
    'Confirma o teu email — Carrinho de Compras',
    `<p>Olá ${name},</p>
     <p>Falta só confirmar o teu email para ativares a conta no Carrinho de Compras:</p>
     <p><a href="${url}">Confirmar email</a></p>
     <p>Este link expira em 24 horas. Se não foste tu a criar esta conta, ignora este email.</p>`,
    url
  )
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const url = `${FRONTEND_URL}/repor-password?token=${encodeURIComponent(token)}`
  await send(
    to,
    'Repor password — Carrinho de Compras',
    `<p>Olá ${name},</p>
     <p>Pediste para repor a password da tua conta. Clica no link abaixo (válido por 1 hora):</p>
     <p><a href="${url}">Repor password</a></p>
     <p>Se não foste tu, ignora este email — a tua password mantém-se inalterada.</p>`,
    url
  )
}
