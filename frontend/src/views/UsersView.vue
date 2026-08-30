<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PencilIcon, TrashIcon } from '@lucide/vue'
import { usersApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types'
import { FormDialog, ConfirmDialog } from '@/components/dialogs'
import { useAsyncAction, ASYNC_ACTION_FAILED } from '@/composables/useAsyncAction'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const auth = useAuthStore()
const users = ref<User[]>([])
const { loading, error, run: runLoad } = useAsyncAction('Erro ao carregar utilizadores', { immediate: true })

const showEditModal = ref(false)
const editTarget = ref<User | null>(null)
const editForm = ref({ name: '', email: '', role: 'USER' as 'USER' | 'ADMIN', password: '' })
const { loading: editLoading, error: editError, run: runSave } = useAsyncAction('Erro ao guardar alterações')

const deleteTarget = ref<User | null>(null)
const showDeleteConfirm = ref(false)
const { loading: deleteLoading, error: deleteError, run: runDelete } = useAsyncAction('Erro ao eliminar utilizador')

async function loadUsers() {
  const result = await runLoad(() => usersApi.getAll())
  if (result !== ASYNC_ACTION_FAILED) users.value = result
}

function openEdit(user: User) {
  editTarget.value = user
  editForm.value = { name: user.name, email: user.email, role: user.role, password: '' }
  editError.value = ''
  showEditModal.value = true
}

async function saveEdit() {
  if (!editTarget.value) return
  const target = editTarget.value
  const updated = await runSave(async () => {
    const payload: Record<string, string> = {
      name: editForm.value.name,
      email: editForm.value.email,
      role: editForm.value.role,
    }
    if (editForm.value.password) payload.password = editForm.value.password

    return usersApi.update(target.id, payload as Parameters<typeof usersApi.update>[1])
  })
  if (updated !== ASYNC_ACTION_FAILED) {
    const idx = users.value.findIndex((u) => u.id === updated.id)
    if (idx !== -1) users.value[idx] = updated
    showEditModal.value = false
  }
}

function openDeleteConfirm(user: User) {
  deleteTarget.value = user
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const target = deleteTarget.value
  const result = await runDelete(() => usersApi.delete(target.id))
  if (result !== ASYNC_ACTION_FAILED) {
    users.value = users.value.filter((u) => u.id !== target.id)
    showDeleteConfirm.value = false
    deleteTarget.value = null
  } else {
    showDeleteConfirm.value = false
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
      <p class="mt-1 text-sm text-gray-500">Administre contas e permissões dos utilizadores</p>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-16">
      <Spinner class="size-6 text-brand-600" />
    </div>

    <Alert v-else-if="error || deleteError" variant="destructive">
      <AlertDescription>{{ error || deleteError }}</AlertDescription>
    </Alert>

    <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow class="bg-gray-50">
            <TableHead>Utilizador</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Registado em</TableHead>
            <TableHead class="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="user in users" :key="user.id">
            <TableCell>
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-100">
                  <span class="text-xs font-semibold text-brand-700">{{ user.name.charAt(0).toUpperCase() }}</span>
                </div>
                <span class="font-medium text-gray-900">{{ user.name }}</span>
                <span v-if="user.id === auth.user?.id" class="text-xs text-gray-400">(eu)</span>
              </div>
            </TableCell>
            <TableCell class="text-gray-600">{{ user.email }}</TableCell>
            <TableCell>
              <Badge
                variant="outline"
                :class="
                  user.role === 'ADMIN'
                    ? 'border-brand-200 bg-brand-50 text-brand-700'
                    : 'border-gray-200 bg-gray-100 text-gray-600'
                "
              >
                {{ user.role === 'ADMIN' ? 'Administrador' : 'Utilizador' }}
              </Badge>
            </TableCell>
            <TableCell class="text-gray-500">{{ formatDate(user.createdAt) }}</TableCell>
            <TableCell class="text-right">
              <div class="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Editar"
                  class="text-gray-400 hover:bg-brand-50 hover:text-brand-600"
                  @click="openEdit(user)"
                >
                  <PencilIcon class="size-4" />
                </Button>
                <Button
                  v-if="user.id !== auth.user?.id"
                  variant="ghost"
                  size="icon-sm"
                  title="Eliminar"
                  data-testid="delete-user"
                  class="text-gray-400 hover:bg-red-50 hover:text-red-500"
                  @click="openDeleteConfirm(user)"
                >
                  <TrashIcon class="size-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="users.length === 0">
            <TableCell colspan="5" class="py-8 text-center text-sm text-gray-400">
              Nenhum utilizador encontrado
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <FormDialog
      v-model="showEditModal"
      title="Editar utilizador"
      :loading="editLoading"
      :error="editError"
      @submit="saveEdit"
    >
      <div class="space-y-4">
        <div class="space-y-1.5">
          <Label>Nome</Label>
          <Input v-model="editForm.name" type="text" />
        </div>
        <div class="space-y-1.5">
          <Label>Email</Label>
          <Input v-model="editForm.email" type="email" />
        </div>
        <div class="space-y-1.5">
          <Label>Papel</Label>
          <Select v-model="editForm.role" :disabled="editTarget?.id === auth.user?.id">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USER">Utilizador</SelectItem>
              <SelectItem value="ADMIN">Administrador</SelectItem>
            </SelectContent>
          </Select>
          <p v-if="editTarget?.id === auth.user?.id" class="text-xs text-gray-400">
            Não pode alterar o seu próprio papel
          </p>
        </div>
        <div class="space-y-1.5">
          <Label>
            Nova password
            <span class="font-normal text-gray-400">(opcional)</span>
          </Label>
          <Input v-model="editForm.password" type="password" placeholder="Deixar em branco para manter" />
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
