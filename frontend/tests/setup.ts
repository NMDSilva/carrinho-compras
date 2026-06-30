import { beforeEach } from 'vitest'

// Node 20+ expõe um localStorage global experimental que tem precedência
// sobre o do jsdom; forçamos a usar o do jsdom em vez desse.
Object.defineProperty(globalThis, 'localStorage', {
  value: window.localStorage,
  configurable: true,
})

// jsdom não implementa <dialog>.showModal()/close()
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
}

beforeEach(() => {
  localStorage.clear()
})
