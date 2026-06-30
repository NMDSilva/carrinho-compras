import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog.vue'

describe('ConfirmDialog', () => {
  it('mostra o título e a mensagem', () => {
    const wrapper = mount(ConfirmDialog, {
      props: { modelValue: true, title: 'Eliminar produto', message: 'Tens a certeza?' },
    })
    expect(wrapper.text()).toContain('Eliminar produto')
    expect(wrapper.text()).toContain('Tens a certeza?')
  })

  it('emite "confirm" ao clicar no botão de confirmação', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: { modelValue: true, title: 'Eliminar', message: 'Confirmas?' },
    })
    await wrapper.findAll('button').at(-1)!.trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('emite "cancel" e fecha o modelValue ao cancelar', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: { modelValue: true, title: 'Eliminar', message: 'Confirmas?' },
    })
    const buttons = wrapper.findAll('button')
    await buttons[buttons.length - 2].trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('desativa os botões quando loading é true', () => {
    const wrapper = mount(ConfirmDialog, {
      props: { modelValue: true, title: 'Eliminar', message: 'Confirmas?', loading: true },
    })
    const buttons = wrapper.findAll('.btn')
    expect(buttons.length).toBeGreaterThan(0)
    buttons.forEach((btn) => expect(btn.attributes('disabled')).toBeDefined())
  })
})
