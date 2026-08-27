import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'
import type { AuthUser } from '@carrinho/shared'
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

  async function register(name: string, email: string, password: string) {
    const res = await authApi.register(name, email, password)
    setToken(res.token)
    user.value = res.user
  }

  async function updateMe(data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) {
    user.value = await authApi.updateMe(data)
  }

  function logout() {
    clearAuth()
  }

  return { token, user, isAuthenticated, isAdmin, login, register, logout, fetchMe, updateMe }
})
