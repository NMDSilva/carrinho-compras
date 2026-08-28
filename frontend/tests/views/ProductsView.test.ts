import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ProductsView from '@/views/ProductsView.vue'

const { getAllMock, getCategoriesMock, deleteMock, reassignMock } = vi.hoisted(() => ({
  getAllMock: vi.fn(),
  getCategoriesMock: vi.fn(),
  deleteMock: vi.fn(),
  reassignMock: vi.fn(),
}))

vi.mock('@/api', () => ({
  productsApi: {
    getAll: getAllMock,
    getCategories: getCategoriesMock,
    create: vi.fn(),
    update: vi.fn(),
    delete: deleteMock,
  },
  variantsApi: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    reassign: reassignMock,
  },
}))

const product = {
  id: 1,
  name: 'Leite meio gordo',
  category: 'Laticínios',
  needsReview: false,
  createdAt: '',
  updatedAt: '',
  variants: [],
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
    // índice 0 = eliminar da linha, índice 1 = confirmar no dialog de produto
    // (índice 2 seria o dialog de eliminar variante, mais abaixo na página)
    const dangerButtons = wrapper.findAll('button.btn-danger')
    await dangerButtons[1].trigger('click')
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
    expect((wrapper.find('input[placeholder="ex: Açúcar branco"]').element as HTMLInputElement).value).toBe(
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

  it('move uma variante para outro produto através do diálogo de pesquisa', async () => {
    const source = {
      id: 1,
      name: 'POLPA TOMATE CNT TETRA 350G',
      category: null,
      needsReview: false,
      createdAt: '',
      updatedAt: '',
      variants: [{ id: 10, productId: 1, brand: null, packageSize: null, unit: 'un', _count: { prices: 1 } }],
    }
    const target = { id: 2, name: 'Polpa de Tomate', category: 'Mercearia', needsReview: false, variants: [] }

    getAllMock
      .mockResolvedValueOnce([source]) // carga inicial
      .mockResolvedValueOnce([target]) // resultado da pesquisa no diálogo
      .mockResolvedValueOnce([]) // recarga após mover
    reassignMock.mockResolvedValue({})

    const router = await setupRouter('/produtos')
    const wrapper = mount(ProductsView, { global: { plugins: [router] } })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    // expandir a linha do produto para ver as variantes
    await wrapper.find('tbody tr').trigger('click')
    await wrapper.vm.$nextTick()

    const moveButton = wrapper.findAll('button').find((b) => b.text() === 'Mover')
    expect(moveButton).toBeTruthy()
    await moveButton!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Mover variante para outro produto')

    await wrapper.find('input[placeholder="Pesquisar produto de destino..."]').setValue('Polpa')
    await new Promise((r) => setTimeout(r, 320)) // aguarda o debounce de 300ms
    await wrapper.vm.$nextTick()

    await wrapper.find('li').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Destino selecionado: Polpa de Tomate')

    // 3 diálogos com <form> na página (produto, variante, mover) — o de
    // "mover" é o último a ser declarado no template.
    const forms = wrapper.findAll('form')
    await forms[forms.length - 1].trigger('submit')
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(reassignMock).toHaveBeenCalledWith(10, 2)
    expect(getAllMock).toHaveBeenCalledTimes(3)
  })
})
