<script setup lang="ts">
import { ref, watch } from 'vue'
import { SunIcon, MoonIcon } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/errors'
import { useToast } from '@/composables/useToast'
import type { Theme } from '@carrinho/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'

const auth = useAuthStore()
const toast = useToast()

// --- Secção de aparência ---
const themeLoading = ref(false)

async function setTheme(theme: Theme) {
  if (auth.user?.theme === theme || themeLoading.value) return
  themeLoading.value = true
  try {
    await auth.updateMe({ theme })
    toast.success(theme === 'dark' ? 'Tema escuro ativado' : 'Tema claro ativado')
  } catch (e: unknown) {
    toast.error(extractApiError(e, 'Erro ao mudar o tema'))
  } finally {
    themeLoading.value = false
  }
}

// --- Secção de informação pessoal ---
const infoForm = ref({ name: auth.user?.name ?? '', email: auth.user?.email ?? '' })
const infoLoading = ref(false)
const infoError = ref('')

watch(() => auth.user, (u) => {
  if (u) { infoForm.value.name = u.name; infoForm.value.email = u.email }
})

async function saveInfo() {
  infoLoading.value = true
  infoError.value = ''
  try {
    await auth.updateMe({ name: infoForm.value.name, email: infoForm.value.email })
    toast.success('Informações guardadas com sucesso')
  } catch (e: unknown) {
    infoError.value = extractApiError(e, 'Erro ao guardar alterações')
  } finally {
    infoLoading.value = false
  }
}

// --- Secção de password ---
const pwForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const pwLoading = ref(false)
const pwError = ref('')

function validatePassword(): string {
  if (!pwForm.value.currentPassword) return 'Introduz a password atual'
  if (!pwForm.value.newPassword) return 'Introduz a nova password'
  if (pwForm.value.newPassword.length < 6) return 'A nova password deve ter pelo menos 6 caracteres'
  if (pwForm.value.newPassword !== pwForm.value.confirmPassword) return 'As passwords não coincidem'
  return ''
}

async function savePassword() {
  pwError.value = validatePassword()
  if (pwError.value) return

  pwLoading.value = true
  try {
    await auth.updateMe({
      currentPassword: pwForm.value.currentPassword,
      newPassword: pwForm.value.newPassword,
    })
    toast.success('Password alterada com sucesso')
    pwForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (e: unknown) {
    pwError.value = extractApiError(e, 'Erro ao alterar password')
  } finally {
    pwLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-xl">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-foreground">O meu perfil</h1>
      <p class="mt-1 text-sm text-muted-foreground">Gere as tuas informações de conta</p>
    </div>

    <!-- Avatar + nome atual -->
    <Card class="mb-8 flex-row items-center gap-4 p-4">
      <div class="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
        <span class="text-xl font-bold text-primary">{{ auth.user?.name.charAt(0).toUpperCase() }}</span>
      </div>
      <div>
        <p class="font-semibold text-foreground">{{ auth.user?.name }}</p>
        <p class="text-sm text-muted-foreground">{{ auth.user?.email }}</p>
        <Badge
          variant="outline"
          class="mt-1"
          :class="
            auth.isAdmin
              ? 'border-primary/20 bg-primary/10 text-primary'
              : 'border-border bg-muted text-muted-foreground'
          "
        >
          {{ auth.isAdmin ? 'Administrador' : 'Utilizador' }}
        </Badge>
      </div>
    </Card>

    <!-- Aparência -->
    <Card class="mb-6 p-6">
      <h2 class="mb-1 text-base font-semibold text-foreground">Aparência</h2>
      <p class="mb-4 text-sm text-muted-foreground">Escolhe como a aplicação aparece para ti.</p>
      <div class="inline-flex rounded-lg border p-1">
        <Button
          :variant="auth.user?.theme === 'dark' ? 'ghost' : 'default'"
          size="sm"
          :disabled="themeLoading"
          @click="setTheme('light')"
        >
          <SunIcon class="size-4" />
          Claro
        </Button>
        <Button
          :variant="auth.user?.theme === 'dark' ? 'default' : 'ghost'"
          size="sm"
          :disabled="themeLoading"
          @click="setTheme('dark')"
        >
          <MoonIcon class="size-4" />
          Escuro
        </Button>
      </div>
    </Card>

    <!-- Informação pessoal -->
    <Card class="mb-6 p-6">
      <h2 class="mb-4 text-base font-semibold text-foreground">Informação pessoal</h2>

      <div class="space-y-4">
        <div class="space-y-1.5">
          <Label>Nome</Label>
          <Input v-model="infoForm.name" type="text" />
        </div>
        <div class="space-y-1.5">
          <Label>Email</Label>
          <Input v-model="infoForm.email" type="email" />
        </div>
      </div>

      <Alert v-if="infoError" variant="destructive" class="mt-4">
        <AlertDescription>{{ infoError }}</AlertDescription>
      </Alert>

      <div class="mt-6 flex justify-end">
        <Button :disabled="infoLoading" @click="saveInfo">
          <Spinner v-if="infoLoading" class="size-4" />
          {{ infoLoading ? 'A guardar...' : 'Guardar alterações' }}
        </Button>
      </div>
    </Card>

    <!-- Alterar password -->
    <Card class="p-6">
      <h2 class="mb-4 text-base font-semibold text-foreground">Alterar password</h2>

      <div class="space-y-4">
        <div class="space-y-1.5">
          <Label>Password atual</Label>
          <Input
            v-model="pwForm.currentPassword"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
          />
        </div>
        <div class="space-y-1.5">
          <Label>Nova password</Label>
          <Input
            v-model="pwForm.newPassword"
            type="password"
            autocomplete="new-password"
            placeholder="••••••••"
          />
          <p class="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
        </div>
        <div class="space-y-1.5">
          <Label>Confirmar nova password</Label>
          <Input
            v-model="pwForm.confirmPassword"
            type="password"
            autocomplete="new-password"
            placeholder="••••••••"
            :class="pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword ? 'border-destructive' : ''"
          />
          <p
            v-if="pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword"
            class="text-xs text-destructive"
          >
            As passwords não coincidem
          </p>
        </div>
      </div>

      <Alert v-if="pwError" variant="destructive" class="mt-4">
        <AlertDescription>{{ pwError }}</AlertDescription>
      </Alert>

      <div class="mt-6 flex justify-end">
        <Button :disabled="pwLoading" @click="savePassword">
          <Spinner v-if="pwLoading" class="size-4" />
          {{ pwLoading ? 'A alterar...' : 'Alterar password' }}
        </Button>
      </div>
    </Card>
  </div>
</template>
