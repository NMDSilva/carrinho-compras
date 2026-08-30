import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardView from '@/views/DashboardView.vue'

const { dashboardMock } = vi.hoisted(() => ({ dashboardMock: vi.fn() }))

vi.mock('@/api', () => ({
  pricesApi: { dashboard: dashboardMock },
}))

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

describe('DashboardView', () => {
  beforeEach(() => {
    dashboardMock.mockReset()
  })

  it('mostra o spinner logo no primeiro render, antes do onMounted resolver', () => {
    dashboardMock.mockReturnValue(new Promise(() => {})) // nunca resolve
    const wrapper = mount(DashboardView)

    expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true)
  })

  it('mostra a mensagem de erro real quando falha ao carregar', async () => {
    dashboardMock.mockRejectedValue({ data: { error: 'Falha na base de dados' } })
    const wrapper = mount(DashboardView)

    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Falha na base de dados')
  })

  it('mostra as estatísticas quando o pedido é bem-sucedido', async () => {
    dashboardMock.mockResolvedValue({
      stats: { totalProducts: 3, totalSupermarkets: 2, totalPrices: 10 },
      recentPrices: [],
      cheapestByProduct: [],
    })
    const wrapper = mount(DashboardView)

    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('Produtos')
  })
})
