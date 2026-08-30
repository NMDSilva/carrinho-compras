<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { MailCheckIcon } from '@lucide/vue'
import { authApi } from '@/api'
import { useAsyncAction, ASYNC_ACTION_FAILED } from '@/composables/useAsyncAction'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'

const email = ref('')
const sent = ref(false)
const { loading, error, run } = useAsyncAction('Não foi possível enviar o email, tenta novamente')

async function submit() {
  const result = await run(() => authApi.forgotPassword(email.value))
  if (result !== ASYNC_ACTION_FAILED) sent.value = true
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <h1 class="text-2xl font-bold text-gray-900">Carrinho de Compras</h1>
      </div>

      <Card class="p-8">
        <div v-if="sent" class="text-center">
          <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
            <MailCheckIcon class="size-6 text-brand-600" />
          </div>
          <h2 class="mb-2 text-lg font-semibold text-gray-900">Verifica o teu email</h2>
          <p class="text-sm text-gray-500">
            Se existir uma conta com o email <b class="text-gray-700">{{ email }}</b
            >, enviámos um link para repores a password.
          </p>
          <RouterLink to="/login" class="mt-6 block text-sm text-brand-600 hover:underline">
            Voltar ao login
          </RouterLink>
        </div>

        <template v-else>
          <h2 class="mb-2 text-lg font-semibold text-gray-900">Recuperar password</h2>
          <p class="mb-6 text-sm text-gray-500">
            Indica o email da tua conta — enviamos-te um link para definires uma password nova.
          </p>

          <form class="space-y-4" @submit.prevent="submit">
            <div class="space-y-1.5">
              <Label>Email</Label>
              <Input v-model="email" type="email" placeholder="email@exemplo.com" autocomplete="email" />
            </div>

            <Alert v-if="error" variant="destructive">
              <AlertDescription>{{ error }}</AlertDescription>
            </Alert>

            <Button type="submit" class="w-full" :disabled="loading || !email">
              <Spinner v-if="loading" class="size-4" />
              {{ loading ? 'A enviar…' : 'Enviar link de recuperação' }}
            </Button>
          </form>

          <RouterLink to="/login" class="mt-6 block text-center text-sm text-brand-600 hover:underline">
            Voltar ao login
          </RouterLink>
        </template>
      </Card>
    </div>
  </div>
</template>
