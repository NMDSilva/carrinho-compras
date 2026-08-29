<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { authApi } from '@/api'
import { extractApiError } from '@/utils/errors'
import { useAsyncAction, ASYNC_ACTION_FAILED } from '@/composables/useAsyncAction'

const route = useRoute()
const { loading, error, run } = useAsyncAction('Link inválido ou expirado', { immediate: true })
const verified = ref(false)

const resendEmail = ref('')
const resending = ref(false)
const resendMessage = ref('')

onMounted(async () => {
  const token = route.query.token as string | undefined
  if (!token) {
    error.value = 'Link inválido — falta o token de confirmação.'
    loading.value = false
    return
  }
  const result = await run(() => authApi.verifyEmail(token))
  if (result !== ASYNC_ACTION_FAILED) verified.value = true
})

async function resendVerification() {
  resending.value = true
  resendMessage.value = ''
  try {
    const res = await authApi.resendVerification(resendEmail.value)
    resendMessage.value = res.message
  } catch (e) {
    resendMessage.value = extractApiError(e, 'Não foi possível reenviar o email')
  } finally {
    resending.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Carrinho de Compras</h1>
      </div>

      <div class="card p-8 text-center">
        <div v-if="loading" class="flex flex-col items-center gap-4 py-4">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          <p class="text-sm text-gray-500">A confirmar o teu email…</p>
        </div>

        <div v-else-if="verified">
          <div class="inline-flex items-center justify-center w-12 h-12 bg-brand-50 rounded-full mb-4">
            <svg class="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-gray-900 mb-2">Email confirmado</h2>
          <p class="text-sm text-gray-500 mb-6">Já podes entrar na tua conta.</p>
          <RouterLink to="/login" class="btn-primary w-full justify-center py-2.5">Ir para o login</RouterLink>
        </div>

        <div v-else>
          <div class="inline-flex items-center justify-center w-12 h-12 bg-red-50 rounded-full mb-4">
            <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-gray-900 mb-2">{{ error }}</h2>
          <p class="text-sm text-gray-500 mb-4">Podes pedir um novo link de confirmação.</p>

          <div class="space-y-3 text-left">
            <input
              v-model="resendEmail"
              type="email"
              class="input"
              placeholder="email@exemplo.com"
              autocomplete="email"
            />
            <button
              type="button"
              class="btn-primary w-full justify-center py-2.5"
              :disabled="resending || !resendEmail"
              @click="resendVerification"
            >
              {{ resending ? 'A reenviar…' : 'Reenviar email de confirmação' }}
            </button>
            <p v-if="resendMessage" class="text-sm text-brand-700 bg-brand-50 rounded-lg px-3 py-2">
              {{ resendMessage }}
            </p>
          </div>

          <RouterLink to="/login" class="block text-sm text-brand-600 hover:underline mt-6">
            Voltar ao login
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
