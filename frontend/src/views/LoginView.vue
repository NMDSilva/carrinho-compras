<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { ShoppingCartIcon, MailCheckIcon } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api'
import { extractApiError } from '@/utils/errors'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
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
  <div class="flex min-h-screen items-center justify-center bg-background p-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="mb-8 text-center">
        <div class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <ShoppingCartIcon class="size-9 text-primary-foreground" />
        </div>
        <h1 class="text-2xl font-bold text-foreground">Carrinho de Compras</h1>
        <p class="mt-1 text-sm text-muted-foreground">Rastreador de preços de supermercado</p>
      </div>

      <!-- Ecrã de confirmação depois de registar -->
      <Card v-if="registeredEmail" class="p-8 text-center">
        <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <MailCheckIcon class="size-6 text-primary" />
        </div>
        <h2 class="mb-2 text-lg font-semibold text-foreground">Confirma o teu email</h2>
        <p class="text-sm text-muted-foreground">
          Enviámos um link de confirmação para <b class="text-foreground">{{ registeredEmail }}</b
          >. Clica nele para ativares a conta — só depois consegues entrar.
        </p>
        <Button variant="outline" class="mt-6 w-full" @click="backToLogin">Voltar ao login</Button>
      </Card>

      <Card v-else class="p-8">
        <h2 class="mb-6 text-lg font-semibold text-foreground">
          {{ mode === 'login' ? 'Entrar na conta' : 'Criar conta' }}
        </h2>

        <form class="space-y-4" @submit.prevent="submit">
          <div v-if="mode === 'register'" class="space-y-1.5">
            <Label>Nome</Label>
            <Input v-model="form.name" type="text" placeholder="O teu nome" autocomplete="name" />
          </div>

          <div class="space-y-1.5">
            <Label>Email</Label>
            <Input v-model="form.email" type="email" placeholder="email@exemplo.com" autocomplete="email" />
          </div>

          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <Label>Password</Label>
              <RouterLink
                v-if="mode === 'login'"
                to="/recuperar-password"
                class="text-xs text-primary hover:underline"
              >
                Esqueceste-te da password?
              </RouterLink>
            </div>
            <Input
              v-model="form.password"
              type="password"
              placeholder="••••••••"
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            />
            <p v-if="mode === 'register'" class="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
          </div>

          <Alert v-if="error" variant="destructive">
            <AlertDescription class="space-y-2">
              <p>{{ error }}</p>
              <button
                v-if="showResend"
                type="button"
                class="text-sm font-medium text-primary hover:underline"
                :disabled="resending"
                @click="resendVerification"
              >
                {{ resending ? 'A reenviar…' : 'Reenviar email de confirmação' }}
              </button>
            </AlertDescription>
          </Alert>
          <p v-if="resendMessage" class="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
            {{ resendMessage }}
          </p>

          <Button type="submit" class="w-full" :disabled="loading">
            <Spinner v-if="loading" class="size-4" />
            {{ loading ? 'A processar…' : mode === 'login' ? 'Entrar' : 'Criar conta' }}
          </Button>
        </form>

        <div class="mt-6 text-center text-sm text-muted-foreground">
          {{ mode === 'login' ? 'Ainda não tens conta?' : 'Já tens conta?' }}
          <button
            class="ml-1 font-medium text-primary hover:underline"
            data-testid="switch-mode"
            @click="switchMode"
          >
            {{ mode === 'login' ? 'Registar' : 'Entrar' }}
          </button>
        </div>
      </Card>
    </div>
  </div>
</template>
