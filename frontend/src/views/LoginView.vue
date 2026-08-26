<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/errors'

const router = useRouter()
const auth = useAuthStore()

const mode = ref<'login' | 'register'>('login')
const loading = ref(false)
const error = ref('')

const form = ref({ name: '', email: '', password: '' })

async function submit() {
  error.value = ''
  loading.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(form.value.email, form.value.password)
    } else {
      if (!form.value.name.trim()) {
        error.value = 'Nome é obrigatório'
        return
      }
      await auth.register(form.value.name, form.value.email, form.value.password)
    }
    const redirect = (router.currentRoute.value.query.redirect as string) ?? '/'
    router.push(redirect)
  } catch (e: unknown) {
    error.value = extractApiError(e, 'Ocorreu um erro, tenta novamente')
  } finally {
    loading.value = false
  }
}

function switchMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  error.value = ''
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
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Carrinho de Compras</h1>
        <p class="text-gray-500 text-sm mt-1">Rastreador de preços de supermercado</p>
      </div>

      <div class="card p-8">
        <h2 class="text-lg font-semibold text-gray-900 mb-6">
          {{ mode === 'login' ? 'Entrar na conta' : 'Criar conta' }}
        </h2>

        <form @submit.prevent="submit" class="space-y-4">
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
            <label class="label">Password</label>
            <input
              v-model="form.password"
              type="password"
              class="input"
              placeholder="••••••••"
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            />
            <p v-if="mode === 'register'" class="text-xs text-gray-400 mt-1">Mínimo 6 caracteres</p>
          </div>

          <p v-if="error" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ error }}</p>

          <button
            type="submit"
            class="btn-primary w-full justify-center py-2.5"
            :disabled="loading"
          >
            <svg v-if="loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ loading ? 'A processar…' : mode === 'login' ? 'Entrar' : 'Criar conta' }}
          </button>
        </form>

        <div class="mt-6 text-center text-sm text-gray-500">
          {{ mode === 'login' ? 'Ainda não tens conta?' : 'Já tens conta?' }}
          <button @click="switchMode" class="text-brand-600 font-medium hover:underline ml-1">
            {{ mode === 'login' ? 'Registar' : 'Entrar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
