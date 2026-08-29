import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ResetPasswordView from '@/views/ResetPasswordView.vue'

const { resetPasswordMock } = vi.hoisted(() => ({
  resetPasswordMock: vi.fn(),
}))

vi.mock('@/api', () => ({
  authApi: { resetPassword: resetPasswordMock },
}))

async function setupRouter(path: string) {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/login', name: 'login', component: { template: '<div>Login</div>' } },
      { path: '/repor-password', name: 'reset-password', component: ResetPasswordView },
      { path: '/recuperar-password', name: 'forgot-password', component: { template: '<div />' } },
    ],
  })
  router.push(path)
  await router.isReady()
  return router
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

describe('ResetPasswordView', () => {
  beforeEach(() => {
    resetPasswordMock.mockReset()
  })

  it('repõe a password com sucesso', async () => {
    resetPasswordMock.mockResolvedValueOnce({ message: 'Password atualizada.' })
    const router = await setupRouter('/repor-password?token=abc123')
    const wrapper = mount(ResetPasswordView, { global: { plugins: [router] } })
    await wrapper.vm.$nextTick()

    const inputs = wrapper.findAll('input[autocomplete="new-password"]')
    await inputs[0].setValue('novaSenha123')
    await inputs[1].setValue('novaSenha123')
    await wrapper.find('form').trigger('submit.prevent')
    await flush()
    await wrapper.vm.$nextTick()

    expect(resetPasswordMock).toHaveBeenCalledWith('abc123', 'novaSenha123')
    expect(wrapper.text()).toContain('Password atualizada')
  })

  it('rejeita quando as passwords não coincidem, sem chamar a API', async () => {
    const router = await setupRouter('/repor-password?token=abc123')
    const wrapper = mount(ResetPasswordView, { global: { plugins: [router] } })
    await wrapper.vm.$nextTick()

    const inputs = wrapper.findAll('input[autocomplete="new-password"]')
    await inputs[0].setValue('novaSenha123')
    await inputs[1].setValue('outraSenha456')
    await wrapper.find('form').trigger('submit.prevent')
    await flush()
    await wrapper.vm.$nextTick()

    expect(resetPasswordMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('As passwords não coincidem')
  })

  it('mostra erro e não mostra o formulário quando falta o token no link', async () => {
    const router = await setupRouter('/repor-password')
    const wrapper = mount(ResetPasswordView, { global: { plugins: [router] } })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain('Link inválido')
  })
})
