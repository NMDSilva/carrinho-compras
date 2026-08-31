// Arranque do Google Analytics (gtag). Vive num ficheiro próprio, e não inline
// no index.html, para a CSP servida pelo nginx poder usar `script-src 'self'`
// sem `'unsafe-inline'` — que é o que dá valor real à CSP contra XSS.
// O loader (googletagmanager.com) continua a ser carregado pelo index.html.
window.dataLayer = window.dataLayer || []
function gtag() {
  window.dataLayer.push(arguments)
}
gtag('js', new Date())
gtag('config', 'G-S4P6W0BTTF')
