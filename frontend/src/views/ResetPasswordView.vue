<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { authApi } from '@/api'
import { useAsyncAction, ASYNC_ACTION_FAILED } from '@/composables/useAsyncAction'

const route = useRoute()
const token = ref('')
const password = ref('')
const confirmPassword = ref('')
const done = ref(false)
const { loading, error, run } = useAsyncAction('Link inválido ou expirado')

const mismatch = computed(() => confirmPassword.value.length > 0 && password.value !== confirmPassword.value)

onMounted(() => {
  const t = route.query.token as string | undefined
  if (!t) {
    error.value = 'Link inválido — falta o token de reposição.'
    return
  }
  token.value = t
})

async function submit() {
  if (!token.value) return
  if (password.value.length < 6) {
    error.value = 'A password deve ter pelo menos 6 caracteres'
    return
  }
  if (mismatch.value) {
    error.value = 'As passwords não coincidem'
    return
  }
  const result = await run(() => authApi.resetPassword(token.value, password.value))
  if (result !== ASYNC_ACTION_FAILED) done.value = true
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Carrinho de Compras</h1>
      </div>

      <div class="card p-8">
        <div v-if="done" class="text-center">
          <div class="inline-flex items-center justify-center w-12 h-12 bg-brand-50 rounded-full mb-4">
            <svg class="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-gray-900 mb-2">Password atualizada</h2>
          <p class="text-sm text-gray-500 mb-6">Já podes entrar com a nova password.</p>
          <RouterLink to="/login" class="btn-primary w-full justify-center py-2.5">Ir para o login</RouterLink>
        </div>

        <template v-else-if="!token">
          <p class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ error }}</p>
          <RouterLink to="/recuperar-password" class="block text-center text-sm text-brand-600 hover:underline mt-6">
            Pedir novo link
          </RouterLink>
        </template>

        <template v-else>
          <h2 class="text-lg font-semibold text-gray-900 mb-6">Definir nova password</h2>

          <form class="space-y-4" @submit.prevent="submit">
            <div>
              <label class="label">Nova password</label>
              <input
                v-model="password"
                type="password"
                class="input"
                placeholder="••••••••"
                autocomplete="new-password"
              />
              <p class="text-xs text-gray-400 mt-1">Mínimo 6 caracteres</p>
            </div>
            <div>
              <label class="label">Confirmar password</label>
              <input
                v-model="confirmPassword"
                type="password"
                class="input"
                placeholder="••••••••"
                autocomplete="new-password"
              />
              <p v-if="mismatch" class="text-xs text-red-500 mt-1">As passwords não coincidem</p>
            </div>

            <p v-if="error" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ error }}</p>

            <button type="submit" class="btn-primary w-full justify-center py-2.5" :disabled="loading">
              <svg v-if="loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ loading ? 'A guardar…' : 'Repor password' }}
            </button>
          </form>
        </template>
      </div>
    </div>
  </div>
</template>
