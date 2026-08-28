import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ReviewProductsView from '@/views/ReviewProductsView.vue'

const { getAllMock, markReviewedMock, reassignMock } = vi.hoisted(() => ({
  getAllMock: vi.fn(),
  markReviewedMock: vi.fn(),
  reassignMock: vi.fn(),
}))

vi.mock('@/api', () => ({
  productsApi: { getAll: getAllMock, markReviewed: markReviewedMock },
  variantsApi: { reassign: reassignMock },
}))

const placeholder = {
  id: 7,
  name: 'ACUCAR BR SIDUL EMB PAPEL 1KG',
  category: null,
  needsReview: true,
  variants: [{ id: 42, productId: 7, brand: null, packageSize: null, unit: 'un' }],
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

describe('ReviewProductsView', () => {
  beforeEach(() => {
    getAllMock.mockReset()
    markReviewedMock.mockReset()
    reassignMock.mockReset()
  })

  it('mostra a mensagem de erro real quando falha ao carregar', async () => {
    getAllMock.mockRejectedValue({ data: { error: 'Sem acesso' } })
    const wrapper = mount(ReviewProductsView)

    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Sem acesso')
  })

  it('lista produtos por rever com a variante placeholder', async () => {
    getAllMock.mockResolvedValueOnce([placeholder])
    const wrapper = mount(ReviewProductsView)

    await flush()
    await wrapper.vm.$nextTick()

    expect(getAllMock).toHaveBeenCalledWith({ needsReview: true })
    expect(wrapper.text()).toContain('ACUCAR BR SIDUL EMB PAPEL 1KG')
  })

  it('mostra mensagem quando não há produtos por rever', async () => {
    getAllMock.mockResolvedValueOnce([])
    const wrapper = mount(ReviewProductsView)

    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Não há produtos por rever')
  })

  it('marca produto como revisto e recarrega a lista', async () => {
    getAllMock.mockResolvedValueOnce([placeholder]).mockResolvedValueOnce([])
    markReviewedMock.mockResolvedValue({ ...placeholder, needsReview: false })
    const wrapper = mount(ReviewProductsView)

    await flush()
    await wrapper.vm.$nextTick()

    await wrapper.find('button.btn-primary').trigger('click')
    await flush()
    await wrapper.vm.$nextTick()

    expect(markReviewedMock).toHaveBeenCalledWith(7)
    expect(getAllMock).toHaveBeenCalledTimes(2)
  })

  it('reatribui a variante para o produto pesquisado e recarrega a lista', async () => {
    const target = { id: 3, name: 'Açúcar branco', category: 'Mercearia', needsReview: false, variants: [] }
    getAllMock
      .mockResolvedValueOnce([placeholder]) // carga inicial
      .mockResolvedValueOnce([target]) // resultado da pesquisa
      .mockResolvedValueOnce([]) // recarga após reatribuir
    reassignMock.mockResolvedValue({})
    const wrapper = mount(ReviewProductsView)

    await flush()
    await wrapper.vm.$nextTick()

    await wrapper.find('input[type="text"]').setValue('Açúcar')
    await new Promise((r) => setTimeout(r, 320)) // aguarda o debounce de 300ms
    await wrapper.vm.$nextTick()

    await wrapper.find('li').trigger('click')
    await wrapper.vm.$nextTick()

    const reassignButton = wrapper.find('button.btn-secondary')
    expect((reassignButton.element as HTMLButtonElement).disabled).toBe(false)
    await reassignButton.trigger('click')
    await flush()
    await wrapper.vm.$nextTick()

    expect(reassignMock).toHaveBeenCalledWith(42, 3)
  })
})
