import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/LoginView.vue'

const { loginMock, registerMock, resendVerificationMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  registerMock: vi.fn(),
  resendVerificationMock: vi.fn(),
}))

vi.mock('@/api', () => ({
  authApi: { login: loginMock, register: registerMock, resendVerification: resendVerificationMock },
}))

async function setupRouter() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: { template: '<div>Dashboard</div>' } },
      { path: '/login', name: 'login', component: LoginView },
    ],
  })
  router.push('/login')
  await router.isReady()
  return router
}

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    loginMock.mockReset()
    registerMock.mockReset()
    resendVerificationMock.mockReset()
    localStorage.clear()
  })

  it('mostra o formulário de login por omissão', async () => {
    const router = await setupRouter()
    const wrapper = mount(LoginView, { global: { plugins: [router] } })
    expect(wrapper.text()).toContain('Entrar na conta')
    expect(wrapper.find('input[type="text"]').exists()).toBe(false)
  })

  it('alterna para o modo de registo', async () => {
    const router = await setupRouter()
    const wrapper = mount(LoginView, { global: { plugins: [router] } })
    await wrapper.find('button.text-brand-600').trigger('click')
    expect(wrapper.text()).toContain('Criar conta')
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
  })

  it('mostra erro quando o login falha', async () => {
    loginMock.mockRejectedValueOnce({ data: { error: 'Credenciais inválidas' } })
    const router = await setupRouter()
    const wrapper = mount(LoginView, { global: { plugins: [router] } })

    await wrapper.find('input[type="email"]').setValue('ana@example.com')
    await wrapper.find('input[type="password"]').setValue('errada')
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 0))

    expect(wrapper.text()).toContain('Credenciais inválidas')
  })

  it('mostra ecrã de confirmação após registar em vez de entrar automaticamente', async () => {
    registerMock.mockResolvedValueOnce({ message: 'Conta criada. Verifica o teu email.' })
    const router = await setupRouter()
    const wrapper = mount(LoginView, { global: { plugins: [router] } })

    await wrapper.find('button.text-brand-600').trigger('click') // muda para "Registar"
    await wrapper.find('input[type="text"]').setValue('Ana')
    await wrapper.find('input[type="email"]').setValue('ana@example.com')
    await wrapper.find('input[type="password"]').setValue('segredo123')
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(registerMock).toHaveBeenCalledWith('Ana', 'ana@example.com', 'segredo123')
    expect(wrapper.text()).toContain('Confirma o teu email')
    expect(wrapper.text()).toContain('ana@example.com')
    expect(router.currentRoute.value.name).toBe('login') // não navegou para a dashboard
  })

  it('oferece reenviar o email de confirmação quando o login falha por conta não confirmada', async () => {
    loginMock.mockRejectedValueOnce({
      data: { error: 'Confirma o teu email antes de entrar.', code: 'EMAIL_NOT_VERIFIED' },
    })
    resendVerificationMock.mockResolvedValueOnce({ message: 'Reenviámos o email de confirmação.' })
    const router = await setupRouter()
    const wrapper = mount(LoginView, { global: { plugins: [router] } })

    await wrapper.find('input[type="email"]').setValue('ana@example.com')
    await wrapper.find('input[type="password"]').setValue('segredo123')
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    const resendButton = wrapper.findAll('button').find((b) => b.text().includes('Reenviar email'))
    expect(resendButton).toBeTruthy()

    await resendButton!.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(resendVerificationMock).toHaveBeenCalledWith('ana@example.com')
    expect(wrapper.text()).toContain('Reenviámos o email de confirmação.')
  })
})
