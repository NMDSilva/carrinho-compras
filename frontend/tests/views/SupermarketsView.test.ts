import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, DOMWrapper } from '@vue/test-utils'
import SupermarketsView from '@/views/SupermarketsView.vue'
import { flushTeleport } from '../helpers/teleport'

const body = new DOMWrapper(document.body)

const { getAllMock, deleteMock } = vi.hoisted(() => ({
  getAllMock: vi.fn(),
  deleteMock: vi.fn(),
}))

vi.mock('@/api', () => ({
  supermarketsApi: {
    getAll: getAllMock,
    create: vi.fn(),
    update: vi.fn(),
    delete: deleteMock,
  },
}))

const supermarket = { id: 1, name: 'Continente', location: 'Lisboa' }

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

describe('SupermarketsView', () => {
  beforeEach(() => {
    getAllMock.mockReset()
    deleteMock.mockReset()
  })

  it('mostra a mensagem de erro real quando falha ao carregar a lista', async () => {
    getAllMock.mockRejectedValue({ data: { error: 'Sem permissões' } })
    const wrapper = mount(SupermarketsView)
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Sem permissões')
  })

  it('mostra a mensagem de erro real quando falha ao eliminar', async () => {
    getAllMock.mockResolvedValue([supermarket])
    deleteMock.mockRejectedValue({ data: { error: 'Tem preços associados' } })
    const wrapper = mount(SupermarketsView)
    await flush()
    await wrapper.vm.$nextTick()

    await wrapper.find('button.btn-danger').trigger('click')
    await wrapper.vm.$nextTick()
    // O ConfirmDialog (shadcn-vue) renderiza via <Teleport> para o <body>.
    await flushTeleport()
    await body.find('[data-testid="dialog-confirm"]').trigger('click')
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Tem preços associados')
  })
})
