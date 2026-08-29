<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api'
import { extractApiError } from '@/utils/errors'
import type { FetchError } from 'ofetch'

const router = useRouter()
const auth = useAuthStore()

const mode = ref<'login' | 'register'>('login')
const loading = ref(false)
const error = ref('')
const showResend = ref(false)
const resending = ref(false)
const resendMessage = ref('')
// Preenchido após um registo bem-sucedido — a conta fica por confirmar, sem
// login automático, por isso mostramos um ecrã de confirmação em vez de
// navegar logo para a app.
const registeredEmail = ref('')

const form = ref({ name: '', email: '', password: '' })

async function submit() {
  error.value = ''
  showResend.value = false
  loading.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(form.value.email, form.value.password)
      const redirect = (router.currentRoute.value.query.redirect as string) ?? '/'
      router.push(redirect)
    } else {
      if (!form.value.name.trim()) {
        error.value = 'Nome é obrigatório'
        return
      }
      await auth.register(form.value.name, form.value.email, form.value.password)
      registeredEmail.value = form.value.email
    }
  } catch (e: unknown) {
    error.value = extractApiError(e, 'Ocorreu um erro, tenta novamente')
    const data = (e as FetchError)?.data as { code?: string } | undefined
    if (data?.code === 'EMAIL_NOT_VERIFIED') showResend.value = true
  } finally {
    loading.value = false
  }
}

async function resendVerification() {
  resending.value = true
  resendMessage.value = ''
  try {
    const res = await authApi.resendVerification(form.value.email)
    resendMessage.value = res.message
  } catch (e) {
    resendMessage.value = extractApiError(e, 'Não foi possível reenviar o email')
  } finally {
    resending.value = false
  }
}

function switchMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  error.value = ''
  showResend.value = false
  resendMessage.value = ''
  registeredEmail.value = ''
  form.value = { name: '', email: '', password: '' }
}

function backToLogin() {
  registeredEmail.value = ''
  mode.value = 'login'
  form.value = { name: '', email: '', password: '' }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl shadow-lg mb-4">
          <svg class="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Carrinho de Compras</h1>
        <p class="text-gray-500 text-sm mt-1">Rastreador de preços de supermercado</p>
      </div>

      <!-- Ecrã de confirmação depois de registar -->
      <div v-if="registeredEmail" class="card p-8 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 bg-brand-50 rounded-full mb-4">
          <svg class="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 class="text-lg font-semibold text-gray-900 mb-2">Confirma o teu email</h2>
        <p class="text-sm text-gray-500">
          Enviámos um link de confirmação para <b class="text-gray-700">{{ registeredEmail }}</b
          >. Clica nele para ativares a conta — só depois consegues entrar.
        </p>
        <button class="btn-secondary w-full justify-center py-2.5 mt-6" @click="backToLogin">Voltar ao login</button>
      </div>

      <div v-else class="card p-8">
        <h2 class="text-lg font-semibold text-gray-900 mb-6">
          {{ mode === 'login' ? 'Entrar na conta' : 'Criar conta' }}
        </h2>

        <form class="space-y-4" @submit.prevent="submit">
          <div v-if="mode === 'register'">
            <label class="label">Nome</label>
            <input
              v-model="form.name"
              type="text"
              class="input"
              placeholder="O teu nome"
              autocomplete="name"
            />
          </div>

          <div>
            <label class="label">Email</label>
            <input
              v-model="form.email"
              type="email"
              class="input"
              placeholder="email@exemplo.com"
              autocomplete="email"
            />
          </div>

          <div>
            <div class="flex items-center justify-between">
              <label class="label">Password</label>
              <RouterLink
                v-if="mode === 'login'"
                to="/recuperar-password"
                class="text-xs text-brand-600 hover:underline"
              >
                Esqueceste-te da password?
              </RouterLink>
            </div>
            <input
              v-model="form.password"
              type="password"
              class="input"
              placeholder="••••••••"
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            />
            <p v-if="mode === 'register'" class="text-xs text-gray-400 mt-1">Mínimo 6 caracteres</p>
          </div>

          <div v-if="error" class="bg-red-50 rounded-lg px-3 py-2 space-y-2">
            <p class="text-sm text-red-600">{{ error }}</p>
            <button
              v-if="showResend"
              type="button"
              class="text-sm text-brand-600 font-medium hover:underline"
              :disabled="resending"
              @click="resendVerification"
            >
              {{ resending ? 'A reenviar…' : 'Reenviar email de confirmação' }}
            </button>
          </div>
          <p v-if="resendMessage" class="text-sm text-brand-700 bg-brand-50 rounded-lg px-3 py-2">
            {{ resendMessage }}
          </p>

          <button type="submit" class="btn-primary w-full justify-center py-2.5" :disabled="loading">
            <svg v-if="loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ loading ? 'A processar…' : mode === 'login' ? 'Entrar' : 'Criar conta' }}
          </button>
        </form>

        <div class="mt-6 text-center text-sm text-gray-500">
          {{ mode === 'login' ? 'Ainda não tens conta?' : 'Já tens conta?' }}
          <button class="text-brand-600 font-medium hover:underline ml-1" @click="switchMode">
            {{ mode === 'login' ? 'Registar' : 'Entrar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
