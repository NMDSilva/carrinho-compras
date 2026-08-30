import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, DOMWrapper } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import UsersView from '@/views/UsersView.vue'
import { flushTeleport } from '../helpers/teleport'

const body = new DOMWrapper(document.body)

const { getAllMock, deleteMock } = vi.hoisted(() => ({
  getAllMock: vi.fn(),
  deleteMock: vi.fn(),
}))

vi.mock('@/api', () => ({
  usersApi: {
    getAll: getAllMock,
    update: vi.fn(),
    delete: deleteMock,
  },
}))

const user = { id: 2, name: 'Bruno', email: 'bruno@example.com', role: 'USER', createdAt: '2026-01-01T00:00:00.000Z' }

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

describe('UsersView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getAllMock.mockReset()
    deleteMock.mockReset()
  })

  it('mostra a mensagem de erro real quando falha ao carregar a lista', async () => {
    getAllMock.mockRejectedValue({ data: { error: 'Acesso negado' } })
    const wrapper = mount(UsersView)
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Acesso negado')
  })

  it('mostra a mensagem de erro real quando falha ao eliminar', async () => {
    getAllMock.mockResolvedValue([user])
    deleteMock.mockRejectedValue({ data: { error: 'Não é possível eliminar' } })
    const wrapper = mount(UsersView)
    await flush()
    await wrapper.vm.$nextTick()

    await wrapper.find('button[title="Eliminar"]').trigger('click')
    await wrapper.vm.$nextTick()
    // O ConfirmDialog (shadcn-vue) renderiza via <Teleport> para o <body>.
    await flushTeleport()
    await body.find('[data-testid="dialog-confirm"]').trigger('click')
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Não é possível eliminar')
  })
})
