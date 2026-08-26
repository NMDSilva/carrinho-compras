<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/utils/errors'

const auth = useAuthStore()

// --- Secção de informação pessoal ---
const infoForm = ref({ name: auth.user?.name ?? '', email: auth.user?.email ?? '' })
const infoLoading = ref(false)
const infoSuccess = ref(false)
const infoError = ref('')

watch(() => auth.user, (u) => {
  if (u) { infoForm.value.name = u.name; infoForm.value.email = u.email }
})

async function saveInfo() {
  infoLoading.value = true
  infoSuccess.value = false
  infoError.value = ''
  try {
    await auth.updateMe({ name: infoForm.value.name, email: infoForm.value.email })
    infoSuccess.value = true
    setTimeout(() => { infoSuccess.value = false }, 3000)
  } catch (e: unknown) {
    infoError.value = extractApiError(e, 'Erro ao guardar alterações')
  } finally {
    infoLoading.value = false
  }
}

// --- Secção de password ---
const pwForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const pwLoading = ref(false)
const pwSuccess = ref(false)
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
  pwSuccess.value = false
  try {
    await auth.updateMe({
      currentPassword: pwForm.value.currentPassword,
      newPassword: pwForm.value.newPassword,
    })
    pwSuccess.value = true
    pwForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    setTimeout(() => { pwSuccess.value = false }, 3000)
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
      <h1 class="text-2xl font-bold text-gray-900">O meu perfil</h1>
      <p class="text-sm text-gray-500 mt-1">Gere as tuas informações de conta</p>
    </div>

    <!-- Avatar + nome atual -->
    <div class="flex items-center gap-4 mb-8 p-4 bg-white rounded-xl border border-gray-200">
      <div class="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
        <span class="text-brand-700 font-bold text-xl">{{ auth.user?.name.charAt(0).toUpperCase() }}</span>
      </div>
      <div>
        <p class="font-semibold text-gray-900">{{ auth.user?.name }}</p>
        <p class="text-sm text-gray-500">{{ auth.user?.email }}</p>
        <span
          :class="auth.isAdmin
            ? 'bg-brand-50 text-brand-700 border-brand-200'
            : 'bg-gray-100 text-gray-600 border-gray-200'"
          class="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium border"
        >
          {{ auth.isAdmin ? 'Administrador' : 'Utilizador' }}
        </span>
      </div>
    </div>

    <!-- Informação pessoal -->
    <section class="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 class="text-base font-semibold text-gray-900 mb-4">Informação pessoal</h2>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input
            v-model="infoForm.name"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            v-model="infoForm.email"
            type="email"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </div>

      <div v-if="infoError" class="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
        {{ infoError }}
      </div>
      <div v-if="infoSuccess" class="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
        Informações guardadas com sucesso
      </div>

      <div class="mt-6 flex justify-end">
        <button
          @click="saveInfo"
          :disabled="infoLoading"
          class="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {{ infoLoading ? 'A guardar...' : 'Guardar alterações' }}
        </button>
      </div>
    </section>

    <!-- Alterar password -->
    <section class="bg-white rounded-xl border border-gray-200 p-6">
      <h2 class="text-base font-semibold text-gray-900 mb-4">Alterar password</h2>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password atual</label>
          <input
            v-model="pwForm.currentPassword"
            type="password"
            autocomplete="current-password"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nova password</label>
          <input
            v-model="pwForm.newPassword"
            type="password"
            autocomplete="new-password"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            placeholder="••••••••"
          />
          <p class="text-xs text-gray-400 mt-1">Mínimo 6 caracteres</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Confirmar nova password</label>
          <input
            v-model="pwForm.confirmPassword"
            type="password"
            autocomplete="new-password"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            :class="pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword ? 'border-red-400' : ''"
            placeholder="••••••••"
          />
          <p
            v-if="pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword"
            class="text-xs text-red-500 mt-1"
          >
            As passwords não coincidem
          </p>
        </div>
      </div>

      <div v-if="pwError" class="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
        {{ pwError }}
      </div>
      <div v-if="pwSuccess" class="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
        Password alterada com sucesso
      </div>

      <div class="mt-6 flex justify-end">
        <button
          @click="savePassword"
          :disabled="pwLoading"
          class="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {{ pwLoading ? 'A alterar...' : 'Alterar password' }}
        </button>
      </div>
    </section>
  </div>
</template>
