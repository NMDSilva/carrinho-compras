<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usersApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types'
import { FormDialog, ConfirmDialog } from '@/components/dialogs'

const auth = useAuthStore()
const users = ref<User[]>([])
const loading = ref(true)
const error = ref('')

const showEditModal = ref(false)
const editTarget = ref<User | null>(null)
const editForm = ref({ name: '', email: '', role: 'USER' as 'USER' | 'ADMIN', password: '' })
const editLoading = ref(false)
const editError = ref('')

const deleteTarget = ref<User | null>(null)
const showDeleteConfirm = ref(false)
const deleteLoading = ref(false)

async function loadUsers() {
  loading.value = true
  error.value = ''
  try {
    users.value = await usersApi.getAll()
  } catch {
    error.value = 'Erro ao carregar utilizadores'
  } finally {
    loading.value = false
  }
}

function openEdit(user: User) {
  editTarget.value = user
  editForm.value = { name: user.name, email: user.email, role: user.role, password: '' }
  editError.value = ''
  showEditModal.value = true
}

async function saveEdit() {
  if (!editTarget.value) return
  editLoading.value = true
  editError.value = ''
  try {
    const payload: Record<string, string> = {
      name: editForm.value.name,
      email: editForm.value.email,
      role: editForm.value.role,
    }
    if (editForm.value.password) payload.password = editForm.value.password

    const updated = await usersApi.update(editTarget.value.id, payload as Parameters<typeof usersApi.update>[1])
    const idx = users.value.findIndex((u) => u.id === updated.id)
    if (idx !== -1) users.value[idx] = updated
    showEditModal.value = false
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
    editError.value = msg ?? 'Erro ao guardar alterações'
  } finally {
    editLoading.value = false
  }
}

function openDeleteConfirm(user: User) {
  deleteTarget.value = user
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await usersApi.delete(deleteTarget.value.id)
    users.value = users.value.filter((u) => u.id !== deleteTarget.value!.id)
    showDeleteConfirm.value = false
    deleteTarget.value = null
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
    error.value = msg ?? 'Erro ao eliminar utilizador'
    showDeleteConfirm.value = false
  } finally {
    deleteLoading.value = false
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

onMounted(loadUsers)
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Gestão de Utilizadores</h1>
      <p class="text-sm text-gray-500 mt-1">Administre contas e permissões dos utilizadores</p>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="animate-spin w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full"></div>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
      {{ error }}
    </div>

    <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50 text-left">
            <th class="px-4 py-3 font-medium text-gray-600">Utilizador</th>
            <th class="px-4 py-3 font-medium text-gray-600">Email</th>
            <th class="px-4 py-3 font-medium text-gray-600">Papel</th>
            <th class="px-4 py-3 font-medium text-gray-600">Registado em</th>
            <th class="px-4 py-3 font-medium text-gray-600 text-right">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-brand-700 font-semibold text-xs">{{ user.name.charAt(0).toUpperCase() }}</span>
                </div>
                <span class="font-medium text-gray-900">{{ user.name }}</span>
                <span v-if="user.id === auth.user?.id" class="text-xs text-gray-400">(eu)</span>
              </div>
            </td>
            <td class="px-4 py-3 text-gray-600">{{ user.email }}</td>
            <td class="px-4 py-3">
              <span
                :class="user.role === 'ADMIN'
                  ? 'bg-brand-50 text-brand-700 border-brand-200'
                  : 'bg-gray-100 text-gray-600 border-gray-200'"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
              >
                {{ user.role === 'ADMIN' ? 'Administrador' : 'Utilizador' }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-500">{{ formatDate(user.createdAt) }}</td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-2">
                <button
                  @click="openEdit(user)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  title="Editar"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  v-if="user.id !== auth.user?.id"
                  @click="openDeleteConfirm(user)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Eliminar"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="users.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-gray-400 text-sm">Nenhum utilizador encontrado</td>
          </tr>
        </tbody>
      </table>
    </div>

    <FormDialog
      v-model="showEditModal"
      title="Editar utilizador"
      :loading="editLoading"
      :error="editError"
      @submit="saveEdit"
    >
      <div class="space-y-4">
        <div>
          <label class="label">Nome</label>
          <input v-model="editForm.name" type="text" class="input" />
        </div>
        <div>
          <label class="label">Email</label>
          <input v-model="editForm.email" type="email" class="input" />
        </div>
        <div>
          <label class="label">Papel</label>
          <select
            v-model="editForm.role"
            :disabled="editTarget?.id === auth.user?.id"
            class="input disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="USER">Utilizador</option>
            <option value="ADMIN">Administrador</option>
          </select>
          <p v-if="editTarget?.id === auth.user?.id" class="text-xs text-gray-400 mt-1">
            Não pode alterar o seu próprio papel
          </p>
        </div>
        <div>
          <label class="label">
            Nova password
            <span class="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            v-model="editForm.password"
            type="password"
            placeholder="Deixar em branco para manter"
            class="input"
          />
        </div>
      </div>
    </FormDialog>

    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="Eliminar utilizador"
      :message="`Tem a certeza que quer eliminar &quot;${deleteTarget?.name}&quot;? Esta ação não pode ser desfeita.`"
      confirm-label="Eliminar"
      :danger="true"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />
  </div>
</template>
