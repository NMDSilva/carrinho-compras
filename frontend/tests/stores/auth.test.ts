import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const { loginMock, registerMock, meMock, updateMeMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  registerMock: vi.fn(),
  meMock: vi.fn(),
  updateMeMock: vi.fn(),
}))

vi.mock('@/api', () => ({
  authApi: {
    login: loginMock,
    register: registerMock,
    me: meMock,
    updateMe: updateMeMock,
  },
}))

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    loginMock.mockReset()
    registerMock.mockReset()
    meMock.mockReset()
    updateMeMock.mockReset()
    localStorage.clear()
  })

  it('inicia sem token quando localStorage está vazio', () => {
    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.isAdmin).toBe(false)
  })

  it('login guarda o token e o utilizador', async () => {
    loginMock.mockResolvedValueOnce({
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
    loginMock.mockResolvedValueOnce({
      token: 'abc123',
      user: { id: 1, name: 'Ana', email: 'ana@example.com', role: 'ADMIN' },
    })

    const auth = useAuthStore()
    await auth.login('ana@example.com', 'segredo')

    expect(auth.isAdmin).toBe(true)
  })

  it('logout limpa o estado e o localStorage', async () => {
    loginMock.mockResolvedValueOnce({
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
    meMock.mockRejectedValueOnce({ response: { status: 401 } })

    await auth.fetchMe()

    expect(auth.user).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('register não faz login automático — conta fica por confirmar', async () => {
    registerMock.mockResolvedValueOnce({ message: 'Conta criada. Verifica o teu email.' })

    const auth = useAuthStore()
    await auth.register('Bruno', 'bruno@example.com', 'segredo')

    expect(registerMock).toHaveBeenCalledWith('Bruno', 'bruno@example.com', 'segredo')
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
  })

  it('updateMe atualiza o utilizador em sessão', async () => {
    localStorage.setItem('token', 'abc123')
    updateMeMock.mockResolvedValueOnce({ id: 1, name: 'Ana Nova', email: 'ana@example.com', role: 'USER' })

    const auth = useAuthStore()
    await auth.updateMe({ name: 'Ana Nova' })

    expect(auth.user?.name).toBe('Ana Nova')
    expect(updateMeMock).toHaveBeenCalledWith({ name: 'Ana Nova' })
  })
})
