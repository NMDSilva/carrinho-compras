import { describe, it, expect } from 'vitest'
import { mount, DOMWrapper } from '@vue/test-utils'
import FormDialog from '@/components/dialogs/FormDialog.vue'
import { flushTeleport } from '../helpers/teleport'

// Dialog do shadcn-vue (reka-ui) renderiza via <Teleport to="body"> —
// attachTo: document.body para o conteúdo ficar acessível, e consultamos
// via `body` (document.body) em vez de `wrapper`. tests/setup.ts limpa o
// body entre testes.
const body = new DOMWrapper(document.body)

describe('FormDialog', () => {
  it('coloca os campos do slot dentro de um <form> (Enter submete nativamente)', async () => {
    mount(FormDialog, {
      attachTo: document.body,
      props: { modelValue: true, title: 'Novo produto' },
      slots: { default: '<input type="text" />' },
    })
    await flushTeleport()

    expect(body.find('form input').exists()).toBe(true)
  })

  it('emite "submit" ao clicar no botão de guardar', async () => {
    const wrapper = mount(FormDialog, {
      attachTo: document.body,
      props: { modelValue: true, title: 'Novo produto' },
      slots: { default: '<input type="text" />' },
    })
    await flushTeleport()

    await body.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  it('o botão de guardar está associado ao formulário via atributo form', async () => {
    mount(FormDialog, {
      attachTo: document.body,
      props: { modelValue: true, title: 'Novo produto' },
      slots: { default: '<input type="text" />' },
    })
    await flushTeleport()

    const form = body.find('form')
    const submitButton = body.find('[data-testid="dialog-confirm"]')
    expect(submitButton.attributes('form')).toBe(form.attributes('id'))
  })

  it('não submete ao clicar em cancelar', async () => {
    const wrapper = mount(FormDialog, {
      attachTo: document.body,
      props: { modelValue: true, title: 'Novo produto' },
      slots: { default: '<input type="text" />' },
    })
    await flushTeleport()

    await body.find('[data-testid="dialog-cancel"]').trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
