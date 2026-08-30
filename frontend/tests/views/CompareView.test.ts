import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CompareView from '@/views/CompareView.vue'

const { getAllMock, supermarketsGetAllMock, compareMock, historyMock } =
  vi.hoisted(() => ({
    getAllMock: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    supermarketsGetAllMock: vi.fn().mockResolvedValue([]),
    compareMock: vi.fn(),
    historyMock: vi.fn(),
  }))

vi.mock('@/api', () => ({
  productsApi: { getAll: getAllMock },
  supermarketsApi: { getAll: supermarketsGetAllMock },
  pricesApi: { compare: compareMock, history: historyMock },
}))

const variant = {
  id: 10,
  productId: 1,
  brand: null,
  packageSize: null,
  unit: 'L',
}
const product = { id: 1, name: 'Leite', variants: [variant] }
const outroProduto = { id: 2, name: 'Água', variants: [] }

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

async function searchAndSelectProduct(
  wrapper: ReturnType<typeof mount>,
  query: string
) {
  await wrapper.find('input[placeholder="Pesquisar produto…"]').setValue(query)
  await new Promise((r) => setTimeout(r, 320)) // aguarda o debounce de 300ms
  await wrapper.vm.$nextTick()
  await wrapper.find('li').trigger('click')
  await wrapper.vm.$nextTick()
}

describe('CompareView', () => {
  beforeEach(() => {
    getAllMock.mockClear()
    getAllMock.mockResolvedValue({ data: [product], total: 1 })
    supermarketsGetAllMock.mockClear()
    supermarketsGetAllMock.mockResolvedValue([])
    compareMock.mockReset()
    historyMock.mockReset()
  })

  it('mostra o erro real quando a comparação falha', async () => {
    compareMock.mockRejectedValue({ data: { error: 'Produto sem preços' } })
    historyMock.mockResolvedValue({ product, history: [] })
    const wrapper = mount(CompareView)
    await flush()

    await searchAndSelectProduct(wrapper, 'Leite')

    expect(wrapper.text()).toContain('Produto sem preços')
  })

  it('mostra o erro real quando o histórico falha', async () => {
    compareMock.mockResolvedValue({ product, prices: [] })
    historyMock.mockRejectedValue({ data: { error: 'Histórico indisponível' } })
    const wrapper = mount(CompareView)
    await flush()

    await searchAndSelectProduct(wrapper, 'Leite')

    // segundo select só aparece depois de escolher o produto — é a variante,
    // necessária para carregar o histórico
    await wrapper.find('select').setValue('10')
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Histórico indisponível')
  })

  it('limpa o erro anterior ao trocar de produto', async () => {
    compareMock.mockRejectedValueOnce({
      data: { error: 'Erro no primeiro produto' },
    })
    historyMock.mockResolvedValue({ product, history: [] })
    const wrapper = mount(CompareView)
    await flush()

    await searchAndSelectProduct(wrapper, 'Leite')
    expect(wrapper.text()).toContain('Erro no primeiro produto')

    compareMock.mockResolvedValueOnce({ product: outroProduto, prices: [] })
    getAllMock.mockResolvedValueOnce({ data: [outroProduto], total: 1 })
    await searchAndSelectProduct(wrapper, 'Água')

    expect(wrapper.text()).not.toContain('Erro no primeiro produto')
  })
})
