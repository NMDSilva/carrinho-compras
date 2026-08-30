import { beforeEach, afterEach } from 'vitest'

// Node 20+ expõe um localStorage global experimental que tem precedência
// sobre o do jsdom; forçamos a usar o do jsdom em vez desse.
Object.defineProperty(globalThis, 'localStorage', {
  value: window.localStorage,
  configurable: true,
})

// jsdom não implementa scrollIntoView — o Listbox subjacente ao Command
// (usado pelo ProductCombobox) chama-o ao destacar/selecionar um item.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

beforeEach(() => {
  localStorage.clear()
})

// Dialog/AlertDialog do shadcn-vue (reka-ui) montam com attachTo: document.body
// (renderizam via <Teleport to="body">) — limpar entre testes para não
// deixar diálogos de um teste a interferir com o find() do teste seguinte.
afterEach(() => {
  document.body.innerHTML = ''
})
