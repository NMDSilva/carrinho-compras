<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { CheckIcon } from '@lucide/vue'
import { authApi } from '@/api'
import { useAsyncAction, ASYNC_ACTION_FAILED } from '@/composables/useAsyncAction'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'

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
  <div class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <h1 class="text-2xl font-bold text-gray-900">Carrinho de Compras</h1>
      </div>

      <Card class="p-8">
        <div v-if="done" class="text-center">
          <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
            <CheckIcon class="size-6 text-brand-600" />
          </div>
          <h2 class="mb-2 text-lg font-semibold text-gray-900">Password atualizada</h2>
          <p class="mb-6 text-sm text-gray-500">Já podes entrar com a nova password.</p>
          <Button as-child class="w-full">
            <RouterLink to="/login">Ir para o login</RouterLink>
          </Button>
        </div>

        <template v-else-if="!token">
          <Alert variant="destructive">
            <AlertDescription>{{ error }}</AlertDescription>
          </Alert>
          <RouterLink to="/recuperar-password" class="mt-6 block text-center text-sm text-brand-600 hover:underline">
            Pedir novo link
          </RouterLink>
        </template>

        <template v-else>
          <h2 class="mb-6 text-lg font-semibold text-gray-900">Definir nova password</h2>

          <form class="space-y-4" @submit.prevent="submit">
            <div class="space-y-1.5">
              <Label>Nova password</Label>
              <Input v-model="password" type="password" placeholder="••••••••" autocomplete="new-password" />
              <p class="text-xs text-gray-400">Mínimo 6 caracteres</p>
            </div>
            <div class="space-y-1.5">
              <Label>Confirmar password</Label>
              <Input
                v-model="confirmPassword"
                type="password"
                placeholder="••••••••"
                autocomplete="new-password"
              />
              <p v-if="mismatch" class="text-xs text-red-500">As passwords não coincidem</p>
            </div>

            <Alert v-if="error" variant="destructive">
              <AlertDescription>{{ error }}</AlertDescription>
            </Alert>

            <Button type="submit" class="w-full" :disabled="loading">
              <Spinner v-if="loading" class="size-4" />
              {{ loading ? 'A guardar…' : 'Repor password' }}
            </Button>
          </form>
        </template>
      </Card>
    </div>
  </div>
</template>
