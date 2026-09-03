import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from '@/App.vue'
import { useAuthStore } from '@/stores/auth'

const vazio = { template: '<div>conteúdo</div>' }

// Espelha as rotas reais no que importa para o layout: quais têm `meta.public`.
function criarRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: vazio, meta: { requiresAuth: true } },
      { path: '/precos', name: 'prices', component: vazio, meta: { requiresAuth: true } },
      { path: '/login', name: 'login', component: vazio, meta: { public: true } },
      { path: '/verificar-email', name: 'verify-email', component: vazio, meta: { public: true } },
      { path: '/recuperar-password', name: 'forgot-password', component: vazio, meta: { public: true } },
      { path: '/repor-password', name: 'reset-password', component: vazio, meta: { public: true } },
    ],
  })
}

async function montarEm(caminho: string) {
  const router = criarRouter()
  router.push(caminho)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] } })
  await wrapper.vm.$nextTick()
  return wrapper
}

// A barra lateral é identificada pelo link de navegação, que só existe nela.
function temBarraLateral(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('a').some((a) => a.text().includes('Dashboard'))
}

describe('App — layout por rota', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.user = {
      id: 1,
      name: 'Ana',
      email: 'ana@example.com',
      role: 'USER',
      theme: 'light',
    }
  })

  // Antes de 04/09/2026 a condição era `route.name === 'login'`, por isso as
  // outras três rotas públicas apareciam com a barra lateral e o bloco de
  // utilizador, sem sessão iniciada.
  it.each([
    ['/login', 'login'],
    ['/recuperar-password', 'forgot-password'],
    ['/repor-password', 'reset-password'],
    ['/verificar-email', 'verify-email'],
  ])('não mostra a barra lateral em %s', async (caminho) => {
    const wrapper = await montarEm(caminho)

    expect(temBarraLateral(wrapper)).toBe(false)
  })

  it.each([
    ['/', 'dashboard'],
    ['/precos', 'prices'],
  ])('mostra a barra lateral em %s', async (caminho) => {
    const wrapper = await montarEm(caminho)

    expect(temBarraLateral(wrapper)).toBe(true)
  })
})
