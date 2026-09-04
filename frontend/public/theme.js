// Aplica o tema guardado ANTES de a app arrancar.
//
// Vive aqui, e não no bundle, por duas razões:
//
// 1. Sem flash. O bundle é um módulo (defer), logo só corre depois do HTML
//    estar processado — o suficiente para a página pintar em claro e só depois
//    saltar para escuro. Este ficheiro é carregado de forma bloqueante no
//    <head>, portanto a classe já está no <html> quando o primeiro pixel é
//    desenhado.
// 2. A CSP servida pelo nginx usa `script-src 'self'` sem `'unsafe-inline'`,
//    por isso um <script> inline no index.html seria simplesmente ignorado.
//
// A fonte de verdade do tema continua a ser o `User.theme` no backend — isto é
// só a cache local, para o tema valer também antes de haver sessão (ecrã de
// login) e para não haver flash em cada arranque. Quem a escreve é o
// `src/lib/theme.ts`.
;(function () {
  try {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark')
    }
  } catch {
    // localStorage pode rebentar (modo privado, cookies bloqueados). Sem tema
    // guardado a app fica em claro, que é o valor por omissão — não vale a pena
    // impedir o arranque por causa disto.
  }
})()
