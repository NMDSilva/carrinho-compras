import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ProductsView from '@/views/ProductsView.vue'

const { getAllMock, getCategoriesMock } = vi.hoisted(() => ({
  getAllMock: vi.fn(),
  getCategoriesMock: vi.fn(),
}))

vi.mock('@/api', () => ({
  productsApi: {
    getAll: getAllMock,
    getCategories: getCategoriesMock,
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

const product = {
  id: 1,
  name: 'Leite meio gordo',
  brand: 'Mimosa',
  unit: 'L',
  category: 'Laticínios',
  createdAt: '',
  updatedAt: '',
}

async function setupRouter(path: string) {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/produtos', name: 'products', component: ProductsView },
      { path: '/produtos/:id/editar', name: 'products-edit', component: ProductsView },
    ],
  })
  router.push(path)
  await router.isReady()
  return router
}

describe('ProductsView', () => {
  beforeEach(() => {
    getAllMock.mockReset()
    getCategoriesMock.mockReset()
    getCategoriesMock.mockResolvedValue([])
  })

  it('abre o modal de edição ao aceder diretamente ao deep-link', async () => {
    getAllMock.mockResolvedValue([product])
    const router = await setupRouter('/produtos/1/editar')
    const wrapper = mount(ProductsView, { global: { plugins: [router] } })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Editar Produto')
    expect((wrapper.find('input[placeholder="ex: Leite Meio-Gordo"]').element as HTMLInputElement).value).toBe(
      'Leite meio gordo'
    )
  })

  it('volta à lista se o produto do deep-link não existir', async () => {
    getAllMock.mockResolvedValue([])
    const router = await setupRouter('/produtos/999/editar')
    mount(ProductsView, { global: { plugins: [router] } })

    await new Promise((r) => setTimeout(r, 0))
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('products')
  })

  it('faz debounce da pesquisa em vez de pedir a cada tecla', async () => {
    getAllMock.mockResolvedValue([])
    const router = await setupRouter('/produtos')
    const wrapper = mount(ProductsView, { global: { plugins: [router] } })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    getAllMock.mockClear()

    vi.useFakeTimers()
    try {
      const input = wrapper.find('input[placeholder="Pesquisar produto..."]')
      await input.setValue('a')
      await input.setValue('ab')
      await input.setValue('abc')

      expect(getAllMock).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(300)

      expect(getAllMock).toHaveBeenCalledTimes(1)
      expect(getAllMock).toHaveBeenCalledWith(expect.objectContaining({ search: 'abc' }))
    } finally {
      vi.useRealTimers()
    }
  })
})
