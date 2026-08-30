import { DOMWrapper } from '@vue/test-utils'
import { flushTeleport } from './teleport'

// Abre um Select do shadcn-vue (reka-ui) e escolhe uma opção.
//
// Duas particularidades do reka-ui que isto contorna:
// - O trigger abre no `pointerdown`, não no `click` — e o VTU `.trigger()`
//   não serve para simular isto porque tenta reatribuir propriedades
//   como `button`/`clientX`, que em MouseEvent são getters só de leitura
//   depois de o evento ser construído; por isso despachamos os eventos
//   nativamente.
// - A seleção só é aceite se o `pointerup` acontecer a mais de 10px do
//   `pointerdown` que abriu o menu — é a proteção contra "clicar, arrastar,
//   largar" ser interpretado como a mesma interação que abriu o dropdown.
//   Um `pointermove` a meio garante essa distância.
export async function selectOption(
  body: DOMWrapper<Element>,
  triggerSelector: string,
  itemSelector: string,
) {
  const trigger = body.find(triggerSelector)
  trigger.element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))
  await flushTeleport()

  document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 500, clientY: 500 }))
  const item = body.find(itemSelector)
  item.element.dispatchEvent(
    new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: 500, clientY: 500 }),
  )
  await flushTeleport()
}
