import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FormDialog from '@/components/dialogs/FormDialog.vue'

describe('FormDialog', () => {
  it('coloca os campos do slot dentro de um <form> (Enter submete nativamente)', () => {
    const wrapper = mount(FormDialog, {
      props: { modelValue: true, title: 'Novo produto' },
      slots: { default: '<input type="text" />' },
    })

    expect(wrapper.find('form input').exists()).toBe(true)
  })

  it('emite "submit" ao clicar no botão de guardar', async () => {
    const wrapper = mount(FormDialog, {
      props: { modelValue: true, title: 'Novo produto' },
      slots: { default: '<input type="text" />' },
    })

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  it('o botão de guardar está associado ao formulário via atributo form', () => {
    const wrapper = mount(FormDialog, {
      props: { modelValue: true, title: 'Novo produto' },
      slots: { default: '<input type="text" />' },
    })

    const form = wrapper.find('form')
    const submitButton = wrapper.find('button[type="submit"]')
    expect(submitButton.attributes('form')).toBe(form.attributes('id'))
  })

  it('não submete ao clicar em cancelar', async () => {
    const wrapper = mount(FormDialog, {
      props: { modelValue: true, title: 'Novo produto' },
      slots: { default: '<input type="text" />' },
    })

    await wrapper.find('.btn-secondary').trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
