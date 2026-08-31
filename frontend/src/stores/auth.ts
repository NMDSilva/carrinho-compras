import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'
import type { AuthUser, Theme } from '@carrinho/shared'
import type { FetchError } from 'ofetch'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<AuthUser | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  function setToken(t: string) {
    token.value = t
    localStorage.setItem('token', t)
  }

  function clearAuth() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      user.value = await authApi.me()
    } catch (err) {
      const status = (err as FetchError)?.response?.status ?? (err as FetchError)?.status
      console.error('[auth] fetchMe failed:', status, err instanceof Error ? err.message : err)
      if (status === 401) {
        clearAuth()
      }
    }
  }

  async function login(email: string, password: string) {
    const res = await authApi.login(email, password)
    setToken(res.token)
    user.value = res.user
  }

  // Conta fica por confirmar até se clicar no link do email — sem login
  // automático (ao contrário de login()), por isso não guarda token/user.
  async function register(name: string, email: string, password: string) {
    await authApi.register(name, email, password)
  }

  async function updateMe(data: {
    name?: string
    email?: string
    currentPassword?: string
    newPassword?: string
    theme?: Theme
  }) {
    const res = await authApi.updateMe(data)
    // Mudar a password invalida as sessões abertas (tokenVersion no backend).
    // A resposta traz um token novo para esta sessão não se expulsar a si
    // própria — sem isto, o pedido seguinte levava 401.
    if (res.token) setToken(res.token)
    const { token: _descartado, ...perfil } = res
    user.value = perfil
  }

  function logout() {
    clearAuth()
  }

  return { token, user, isAuthenticated, isAdmin, login, register, logout, fetchMe, updateMe }
})
