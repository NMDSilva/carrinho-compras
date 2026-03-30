import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

interface AuthUser {
  id: number
  name: string
  email: string
  role: string
}

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
      const res = await axios.get<AuthUser>('/api/auth/me', {
        headers: { Authorization: `Bearer ${token.value}` },
      })
      user.value = res.data
    } catch {
      clearAuth()
    }
  }

  async function login(email: string, password: string) {
    const res = await axios.post<{ token: string; user: AuthUser }>('/api/auth/login', { email, password })
    setToken(res.data.token)
    user.value = res.data.user
  }

  async function register(name: string, email: string, password: string) {
    const res = await axios.post<{ token: string; user: AuthUser }>('/api/auth/register', { name, email, password })
    setToken(res.data.token)
    user.value = res.data.user
  }

  async function updateMe(data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) {
    const res = await axios.patch<AuthUser>('/api/auth/me', data, {
      headers: { Authorization: `Bearer ${token.value}` },
    })
    user.value = res.data
  }

  function logout() {
    clearAuth()
  }

  return { token, user, isAuthenticated, isAdmin, login, register, logout, fetchMe, updateMe }
})
