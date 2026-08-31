<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { CheckIcon, XIcon } from '@lucide/vue'
import { authApi } from '@/api'
import { extractApiError } from '@/utils/errors'
import { useAsyncAction, ASYNC_ACTION_FAILED } from '@/composables/useAsyncAction'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

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
  <div class="flex min-h-screen items-center justify-center bg-background p-4">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <h1 class="text-2xl font-bold text-foreground">Carrinho de Compras</h1>
      </div>

      <Card class="p-8 text-center">
        <div v-if="loading" class="flex flex-col items-center gap-4 py-4">
          <Spinner class="size-8 text-primary" />
          <p class="text-sm text-muted-foreground">A confirmar o teu email…</p>
        </div>

        <div v-else-if="verified">
          <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CheckIcon class="size-6 text-primary" />
          </div>
          <h2 class="mb-2 text-lg font-semibold text-foreground">Email confirmado</h2>
          <p class="mb-6 text-sm text-muted-foreground">Já podes entrar na tua conta.</p>
          <Button as-child class="w-full">
            <RouterLink to="/login">Ir para o login</RouterLink>
          </Button>
        </div>

        <div v-else>
          <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <XIcon class="size-6 text-destructive" />
          </div>
          <h2 class="mb-2 text-lg font-semibold text-foreground">{{ error }}</h2>
          <p class="mb-4 text-sm text-muted-foreground">Podes pedir um novo link de confirmação.</p>

          <div class="space-y-3 text-left">
            <Input v-model="resendEmail" type="email" placeholder="email@exemplo.com" autocomplete="email" />
            <Button
              type="button"
              class="w-full"
              data-testid="resend-verification"
              :disabled="resending || !resendEmail"
              @click="resendVerification"
            >
              {{ resending ? 'A reenviar…' : 'Reenviar email de confirmação' }}
            </Button>
            <p v-if="resendMessage" class="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
              {{ resendMessage }}
            </p>
          </div>

          <RouterLink to="/login" class="mt-6 block text-sm text-primary hover:underline">
            Voltar ao login
          </RouterLink>
        </div>
      </Card>
    </div>
  </div>
</template>
