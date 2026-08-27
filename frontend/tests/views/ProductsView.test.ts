import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ProductsView from '@/views/ProductsView.vue'

const { getAllMock, getCategoriesMock, deleteMock } = vi.hoisted(() => ({
  getAllMock: vi.fn(),
  getCategoriesMock: vi.fn(),
  deleteMock: vi.fn(),
}))

vi.mock('@/api', () => ({
  productsApi: {
    getAll: getAllMock,
    getCategories: getCategoriesMock,
    create: vi.fn(),
    update: vi.fn(),
    delete: deleteMock,
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
    deleteMock.mockReset()
    getCategoriesMock.mockResolvedValue([])
  })

  it('mostra a mensagem de erro real quando falha ao carregar a lista', async () => {
    getAllMock.mockRejectedValue({ data: { error: 'Sessão expirada' } })
    const router = await setupRouter('/produtos')
    const wrapper = mount(ProductsView, { global: { plugins: [router] } })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Sessão expirada')
  })

  it('mostra a mensagem de erro real quando falha ao eliminar', async () => {
    getAllMock.mockResolvedValue([product])
    deleteMock.mockRejectedValue({ data: { error: 'Produto tem preços associados' } })
    const router = await setupRouter('/produtos')
    const wrapper = mount(ProductsView, { global: { plugins: [router] } })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    await wrapper.find('button.btn-danger').trigger('click')
    await wrapper.vm.$nextTick()
    const buttons = wrapper.findAll('button')
    await buttons[buttons.length - 1].trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Produto tem preços associados')
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
