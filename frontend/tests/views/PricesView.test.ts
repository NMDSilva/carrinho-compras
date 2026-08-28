import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import PricesView from '@/views/PricesView.vue'

const { getAllMock, getByIdMock, deleteMock } = vi.hoisted(() => ({
  getAllMock: vi.fn(),
  getByIdMock: vi.fn(),
  deleteMock: vi.fn(),
}))

vi.mock('@/api', () => ({
  pricesApi: {
    getAll: getAllMock,
    getById: getByIdMock,
    create: vi.fn(),
    update: vi.fn(),
    delete: deleteMock,
  },
  productsApi: { getAll: vi.fn().mockResolvedValue([]) },
  supermarketsApi: { getAll: vi.fn().mockResolvedValue([]) },
}))

const price = {
  id: 1,
  variantId: 1,
  supermarketId: 1,
  price: 1.5,
  quantity: 1,
  date: '2026-01-01T00:00:00.000Z',
  notes: null,
  variant: { id: 1, productId: 1, brand: null, packageSize: null, unit: 'L', product: { id: 1, name: 'Leite' } },
  supermarket: { id: 1, name: 'Continente' },
}

async function setupRouter() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/precos', name: 'prices', component: PricesView },
      { path: '/precos/:id/editar', name: 'prices-edit', component: PricesView },
    ],
  })
  router.push('/precos')
  await router.isReady()
  return router
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

describe('PricesView', () => {
  beforeEach(() => {
    getAllMock.mockReset()
    getByIdMock.mockReset()
    deleteMock.mockReset()
  })

  it('mostra a mensagem de erro real quando falha ao carregar a lista', async () => {
    getAllMock.mockRejectedValue({ data: { error: 'Sem acesso' } })
    const router = await setupRouter()
    const wrapper = mount(PricesView, { global: { plugins: [router] } })

    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Sem acesso')
  })

  it('mostra a mensagem de erro real quando falha ao eliminar', async () => {
    getAllMock.mockResolvedValue({ data: [price], total: 1 })
    deleteMock.mockRejectedValue({ data: { error: 'Registo bloqueado' } })
    const router = await setupRouter()
    const wrapper = mount(PricesView, { global: { plugins: [router] } })

    await flush()
    await wrapper.vm.$nextTick()

    await wrapper.find('button.btn-danger').trigger('click')
    await wrapper.vm.$nextTick()
    const buttons = wrapper.findAll('button')
    await buttons[buttons.length - 1].trigger('click')
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Registo bloqueado')
  })
})
