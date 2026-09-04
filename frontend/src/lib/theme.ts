import type { Theme } from '@carrinho/shared'

const CHAVE = 'theme'

/**
 * Aplica o tema ao `<html>` e guarda-o no `localStorage`.
 *
 * A fonte de verdade é o `User.theme` no backend, que segue o utilizador entre
 * dispositivos. O `localStorage` é a cache local, e existe por dois motivos:
 * o tema tem de valer **antes de haver sessão** (ecrã de login, recuperação de
 * password) e tem de ser aplicado antes do primeiro pixel, para não haver
 * flash. Quem o lê no arranque é o `public/theme.js`.
 */
export function aplicarTema(tema: Theme) {
  document.documentElement.classList.toggle('dark', tema === 'dark')
  try {
    localStorage.setItem(CHAVE, tema)
  } catch {
    // Modo privado ou cookies bloqueados: o tema continua a ser aplicado nesta
    // sessão, só não sobrevive a um recarregamento.
  }
}

/** Tema em cache, ou `null` se nunca foi guardado / o storage não está acessível. */
export function temaGuardado(): Theme | null {
  try {
    const valor = localStorage.getItem(CHAVE)
    return valor === 'dark' || valor === 'light' ? valor : null
  } catch {
    return null
  }
}
