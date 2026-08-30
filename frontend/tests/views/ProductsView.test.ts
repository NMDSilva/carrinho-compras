import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, DOMWrapper } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ProductsView from '@/views/ProductsView.vue'
import { flushTeleport } from '../helpers/teleport'

const body = new DOMWrapper(document.body)

const { getAllMock, getByIdMock, getCategoriesMock, deleteMock, reassignMock } =
  vi.hoisted(() => ({
    getAllMock: vi.fn(),
    getByIdMock: vi.fn(),
    getCategoriesMock: vi.fn(),
    deleteMock: vi.fn(),
    reassignMock: vi.fn(),
  }))

vi.mock('@/api', () => ({
  productsApi: {
    getAll: getAllMock,
    getById: getByIdMock,
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

function page(data: unknown[], total = data.length) {
  return { data, total }
}

async function setupRouter(path: string) {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/produtos', name: 'products', component: ProductsView },
      {
        path: '/produtos/:id/editar',
        name: 'products-edit',
        component: ProductsView,
      },
    ],
  })
  router.push(path)
  await router.isReady()
  return router
}

describe('ProductsView', () => {
  beforeEach(() => {
    getAllMock.mockReset()
    getByIdMock.mockReset()
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

  it('elimina produto com sucesso: fecha o popup e recarrega a lista', async () => {
    // Regressão: DELETE bem-sucedido responde 204 (ofetch resolve
    // `undefined`) — com o bug antigo isto era tratado como falha, o popup
    // de confirmação nunca fechava e a lista nunca recarregava.
    getAllMock
      .mockResolvedValueOnce(page([product]))
      .mockResolvedValueOnce(page([]))
    deleteMock.mockResolvedValueOnce(undefined)
    const router = await setupRouter('/produtos')
    const wrapper = mount(ProductsView, { global: { plugins: [router] } })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    await wrapper.find('button.btn-danger').trigger('click')
    await wrapper.vm.$nextTick()
    // O ConfirmDialog (shadcn-vue) renderiza via <Teleport> para o <body>.
    await flushTeleport()
    await body.find('[data-testid="dialog-confirm"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(deleteMock).toHaveBeenCalledWith(1)
    // se o bug reaparecer, loadProducts() nunca é chamado a seguir ao
    // delete e isto fica em 1 (só a carga inicial)
    expect(getAllMock).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Nenhum produto encontrado')
  })

  it('mostra a mensagem de erro real quando falha ao eliminar', async () => {
    getAllMock.mockResolvedValue(page([product]))
    deleteMock.mockRejectedValue({
      data: { error: 'Produto tem preços associados' },
    })
    const router = await setupRouter('/produtos')
    const wrapper = mount(ProductsView, { global: { plugins: [router] } })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    await wrapper.find('button.btn-danger').trigger('click')
    await wrapper.vm.$nextTick()
    // O ConfirmDialog (shadcn-vue) renderiza via <Teleport> para o <body>.
    await flushTeleport()
    await body.find('[data-testid="dialog-confirm"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Produto tem preços associados')
  })

  it('abre o modal de edição ao aceder diretamente ao deep-link', async () => {
    getAllMock.mockResolvedValue(page([product]))
    getByIdMock.mockResolvedValue(product)
    const router = await setupRouter('/produtos/1/editar')
    const wrapper = mount(ProductsView, { global: { plugins: [router] } })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    // O FormDialog (shadcn-vue) renderiza via <Teleport> para o <body>.
    await flushTeleport()

    expect(getByIdMock).toHaveBeenCalledWith(1)
    expect(body.text()).toContain('Editar Produto')
    expect(
      (
        body.find('input[placeholder="ex: Açúcar branco"]')
          .element as HTMLInputElement
      ).value
    ).toBe('Leite meio gordo')
  })

  it('volta à lista se o produto do deep-link não existir', async () => {
    getAllMock.mockResolvedValue(page([]))
    getByIdMock.mockRejectedValue({ data: { error: 'Produto não encontrado' } })
    const router = await setupRouter('/produtos/999/editar')
    mount(ProductsView, { global: { plugins: [router] } })

    await new Promise((r) => setTimeout(r, 0))
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('products')
  })

  it('faz debounce da pesquisa em vez de pedir a cada tecla', async () => {
    getAllMock.mockResolvedValue(page([]))
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
      expect(getAllMock).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'abc' })
      )
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
      variants: [
        {
          id: 10,
          productId: 1,
          brand: null,
          packageSize: null,
          unit: 'un',
          _count: { prices: 1 },
        },
      ],
    }
    const target = {
      id: 2,
      name: 'Polpa de Tomate',
      category: 'Mercearia',
      needsReview: false,
      variants: [],
    }

    getAllMock
      .mockResolvedValueOnce(page([source])) // carga inicial
      .mockResolvedValueOnce(page([target])) // resultado da pesquisa no diálogo
      .mockResolvedValueOnce(page([])) // recarga após mover
    reassignMock.mockResolvedValue({})

    const router = await setupRouter('/produtos')
    const wrapper = mount(ProductsView, { global: { plugins: [router] } })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    // expandir a linha do produto para ver as variantes
    await wrapper.find('tbody tr').trigger('click')
    await wrapper.vm.$nextTick()

    const moveButton = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Mover')
    expect(moveButton).toBeTruthy()
    await moveButton!.trigger('click')
    await wrapper.vm.$nextTick()
    // O FormDialog "mover" (shadcn-vue) renderiza via <Teleport> para o
    // <body> — é o único aberto neste ponto do teste (os dialogs de
    // criar/editar produto e variante não chegam a ser abertos aqui).
    await flushTeleport()

    expect(body.text()).toContain('Mover variante para outro produto')

    await body
      .find('input[placeholder="Pesquisar produto de destino..."]')
      .setValue('Polpa')
    await new Promise((r) => setTimeout(r, 320)) // aguarda o debounce de 300ms
    await wrapper.vm.$nextTick()

    await body.find('li').trigger('click')
    await wrapper.vm.$nextTick()
    expect(body.text()).toContain('Destino selecionado: Polpa de Tomate')

    await body.find('form').trigger('submit')
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(reassignMock).toHaveBeenCalledWith(10, 2)
    expect(getAllMock).toHaveBeenCalledTimes(3)
  })

  it('pagina o catálogo com limit/offset e mostra o total', async () => {
    getAllMock.mockResolvedValue(page([product], 45))
    const router = await setupRouter('/produtos')
    const wrapper = mount(ProductsView, { global: { plugins: [router] } })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(getAllMock).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0 })
    )
    expect(wrapper.text()).toContain('45 produtos')

    getAllMock.mockClear()
    const nextButton = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Seguinte')
    await nextButton!.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(getAllMock).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 20 })
    )
  })
})
