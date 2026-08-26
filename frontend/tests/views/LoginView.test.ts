import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/LoginView.vue'

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }))

vi.mock('ofetch', () => ({
  $fetch: fetchMock,
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
    fetchMock.mockReset()
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
    fetchMock.mockRejectedValueOnce({ data: { error: 'Credenciais inválidas' } })
    const router = await setupRouter()
    const wrapper = mount(LoginView, { global: { plugins: [router] } })

    await wrapper.find('input[type="email"]').setValue('ana@example.com')
    await wrapper.find('input[type="password"]').setValue('errada')
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 0))

    expect(wrapper.text()).toContain('Credenciais inválidas')
  })
})
