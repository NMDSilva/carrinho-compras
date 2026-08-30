import { describe, it, expect } from 'vitest'
import { mount, DOMWrapper } from '@vue/test-utils'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog.vue'
import { flushTeleport } from '../helpers/teleport'

// Dialog/AlertDialog do shadcn-vue (reka-ui) renderizam via <Teleport
// to="body"> — attachTo: document.body para o conteúdo ficar acessível, e
// consultamos via `body` (document.body) em vez de `wrapper` (que só vê a
// subárvore não-teleportada). tests/setup.ts limpa o body entre testes.
const body = new DOMWrapper(document.body)

describe('ConfirmDialog', () => {
  it('mostra o título e a mensagem', async () => {
    mount(ConfirmDialog, {
      attachTo: document.body,
      props: { modelValue: true, title: 'Eliminar produto', message: 'Tens a certeza?' },
    })
    await flushTeleport()
    expect(body.text()).toContain('Eliminar produto')
    expect(body.text()).toContain('Tens a certeza?')
  })

  it('emite "confirm" ao clicar no botão de confirmação', async () => {
    const wrapper = mount(ConfirmDialog, {
      attachTo: document.body,
      props: { modelValue: true, title: 'Eliminar', message: 'Confirmas?' },
    })
    await flushTeleport()
    await body.find('[data-testid="dialog-confirm"]').trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('emite "cancel" e fecha o modelValue ao cancelar', async () => {
    const wrapper = mount(ConfirmDialog, {
      attachTo: document.body,
      props: { modelValue: true, title: 'Eliminar', message: 'Confirmas?' },
    })
    await flushTeleport()
    await body.find('[data-testid="dialog-cancel"]').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('desativa os botões quando loading é true', async () => {
    mount(ConfirmDialog, {
      attachTo: document.body,
      props: { modelValue: true, title: 'Eliminar', message: 'Confirmas?', loading: true },
    })
    await flushTeleport()
    expect(body.find('[data-testid="dialog-confirm"]').attributes('disabled')).toBeDefined()
    expect(body.find('[data-testid="dialog-cancel"]').attributes('disabled')).toBeDefined()
  })
})
