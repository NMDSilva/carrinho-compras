import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { $fetch } from 'ofetch'
import type { AuthUser } from '@carrinho/shared'

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
      user.value = await $fetch<AuthUser>('/api/auth/me', {
        headers: { Authorization: `Bearer ${token.value}` },
      })
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status
      console.error('[auth] fetchMe failed:', status, err?.message)
      if (status === 401) {
        clearAuth()
      }
    }
  }

  async function login(email: string, password: string) {
    const res = await $fetch<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    setToken(res.token)
    user.value = res.user
  }

  async function register(name: string, email: string, password: string) {
    const res = await $fetch<{ token: string; user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: { name, email, password },
    })
    setToken(res.token)
    user.value = res.user
  }

  async function updateMe(data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) {
    user.value = await $fetch<AuthUser>('/api/auth/me', {
      method: 'PATCH',
      body: data,
      headers: { Authorization: `Bearer ${token.value}` },
    })
  }

  function logout() {
    clearAuth()
  }

  return { token, user, isAuthenticated, isAdmin, login, register, logout, fetchMe, updateMe }
})
