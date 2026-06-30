import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }))

vi.mock('ofetch', () => ({
  $fetch: fetchMock,
}))

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
    localStorage.clear()
  })

  it('inicia sem token quando localStorage está vazio', () => {
    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.isAdmin).toBe(false)
  })

  it('login guarda o token e o utilizador', async () => {
    fetchMock.mockResolvedValueOnce({
      token: 'abc123',
      user: { id: 1, name: 'Ana', email: 'ana@example.com', role: 'USER' },
    })

    const auth = useAuthStore()
    await auth.login('ana@example.com', 'segredo')

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user?.email).toBe('ana@example.com')
    expect(localStorage.getItem('token')).toBe('abc123')
  })

  it('isAdmin reflete o papel do utilizador', async () => {
    fetchMock.mockResolvedValueOnce({
      token: 'abc123',
      user: { id: 1, name: 'Ana', email: 'ana@example.com', role: 'ADMIN' },
    })

    const auth = useAuthStore()
    await auth.login('ana@example.com', 'segredo')

    expect(auth.isAdmin).toBe(true)
  })

  it('logout limpa o estado e o localStorage', async () => {
    fetchMock.mockResolvedValueOnce({
      token: 'abc123',
      user: { id: 1, name: 'Ana', email: 'ana@example.com', role: 'USER' },
    })

    const auth = useAuthStore()
    await auth.login('ana@example.com', 'segredo')
    auth.logout()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('fetchMe limpa a sessão quando recebe 401', async () => {
    localStorage.setItem('token', 'expired-token')
    const auth = useAuthStore()
    fetchMock.mockRejectedValueOnce({ response: { status: 401 } })

    await auth.fetchMe()

    expect(auth.user).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })
})
