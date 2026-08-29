import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import VerifyEmailView from '@/views/VerifyEmailView.vue'

const { verifyEmailMock, resendVerificationMock } = vi.hoisted(() => ({
  verifyEmailMock: vi.fn(),
  resendVerificationMock: vi.fn(),
}))

vi.mock('@/api', () => ({
  authApi: { verifyEmail: verifyEmailMock, resendVerification: resendVerificationMock },
}))

async function setupRouter(path: string) {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/login', name: 'login', component: { template: '<div>Login</div>' } },
      { path: '/verificar-email', name: 'verify-email', component: VerifyEmailView },
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

describe('VerifyEmailView', () => {
  beforeEach(() => {
    verifyEmailMock.mockReset()
    resendVerificationMock.mockReset()
  })

  it('confirma o email com um token válido', async () => {
    verifyEmailMock.mockResolvedValueOnce({ message: 'Email confirmado.' })
    const router = await setupRouter('/verificar-email?token=abc123')
    const wrapper = mount(VerifyEmailView, { global: { plugins: [router] } })

    await flush()
    await wrapper.vm.$nextTick()

    expect(verifyEmailMock).toHaveBeenCalledWith('abc123')
    expect(wrapper.text()).toContain('Email confirmado')
  })

  it('mostra erro e permite pedir novo link quando o token é inválido', async () => {
    verifyEmailMock.mockRejectedValueOnce({ data: { error: 'Link inválido ou expirado' } })
    const router = await setupRouter('/verificar-email?token=invalido')
    const wrapper = mount(VerifyEmailView, { global: { plugins: [router] } })

    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Link inválido ou expirado')

    resendVerificationMock.mockResolvedValueOnce({ message: 'Novo email enviado.' })
    await wrapper.find('input[type="email"]').setValue('ana@example.com')
    await wrapper.find('button.btn-primary').trigger('click')
    await flush()
    await wrapper.vm.$nextTick()

    expect(resendVerificationMock).toHaveBeenCalledWith('ana@example.com')
    expect(wrapper.text()).toContain('Novo email enviado.')
  })

  it('mostra erro quando não há token no link', async () => {
    const router = await setupRouter('/verificar-email')
    const wrapper = mount(VerifyEmailView, { global: { plugins: [router] } })

    await flush()
    await wrapper.vm.$nextTick()

    expect(verifyEmailMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Link inválido')
  })
})
