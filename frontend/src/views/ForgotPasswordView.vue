<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { authApi } from '@/api'
import { useAsyncAction, ASYNC_ACTION_FAILED } from '@/composables/useAsyncAction'

const email = ref('')
const sent = ref(false)
const { loading, error, run } = useAsyncAction('Não foi possível enviar o email, tenta novamente')

async function submit() {
  const result = await run(() => authApi.forgotPassword(email.value))
  if (result !== ASYNC_ACTION_FAILED) sent.value = true
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Carrinho de Compras</h1>
      </div>

      <div class="card p-8">
        <div v-if="sent" class="text-center">
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
          <h2 class="text-lg font-semibold text-gray-900 mb-2">Verifica o teu email</h2>
          <p class="text-sm text-gray-500">
            Se existir uma conta com o email <b class="text-gray-700">{{ email }}</b
            >, enviámos um link para repores a password.
          </p>
          <RouterLink to="/login" class="block text-sm text-brand-600 hover:underline mt-6">
            Voltar ao login
          </RouterLink>
        </div>

        <template v-else>
          <h2 class="text-lg font-semibold text-gray-900 mb-2">Recuperar password</h2>
          <p class="text-sm text-gray-500 mb-6">
            Indica o email da tua conta — enviamos-te um link para definires uma password nova.
          </p>

          <form class="space-y-4" @submit.prevent="submit">
            <div>
              <label class="label">Email</label>
              <input
                v-model="email"
                type="email"
                class="input"
                placeholder="email@exemplo.com"
                autocomplete="email"
              />
            </div>

            <p v-if="error" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ error }}</p>

            <button type="submit" class="btn-primary w-full justify-center py-2.5" :disabled="loading || !email">
              <svg v-if="loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ loading ? 'A enviar…' : 'Enviar link de recuperação' }}
            </button>
          </form>

          <RouterLink to="/login" class="block text-center text-sm text-brand-600 hover:underline mt-6">
            Voltar ao login
          </RouterLink>
        </template>
      </div>
    </div>
  </div>
</template>
