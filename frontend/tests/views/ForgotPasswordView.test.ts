import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ForgotPasswordView from '@/views/ForgotPasswordView.vue'

const { forgotPasswordMock } = vi.hoisted(() => ({
  forgotPasswordMock: vi.fn(),
}))

vi.mock('@/api', () => ({
  authApi: { forgotPassword: forgotPasswordMock },
}))

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

describe('ForgotPasswordView', () => {
  beforeEach(() => {
    forgotPasswordMock.mockReset()
  })

  it('mostra mensagem genérica de sucesso ao submeter um email', async () => {
    forgotPasswordMock.mockResolvedValueOnce({ message: 'Se a conta existir, enviámos um email.' })
    const wrapper = mount(ForgotPasswordView, { global: { stubs: { RouterLink: true } } })

    await wrapper.find('input[type="email"]').setValue('ana@example.com')
    await wrapper.find('form').trigger('submit.prevent')
    await flush()
    await wrapper.vm.$nextTick()

    expect(forgotPasswordMock).toHaveBeenCalledWith('ana@example.com')
    expect(wrapper.text()).toContain('Verifica o teu email')
    expect(wrapper.text()).toContain('ana@example.com')
  })

  it('mostra o erro real quando o pedido falha', async () => {
    forgotPasswordMock.mockRejectedValueOnce({ data: { error: 'Demasiados pedidos, tenta mais tarde' } })
    const wrapper = mount(ForgotPasswordView, { global: { stubs: { RouterLink: true } } })

    await wrapper.find('input[type="email"]').setValue('ana@example.com')
    await wrapper.find('form').trigger('submit.prevent')
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Demasiados pedidos, tenta mais tarde')
  })
})
