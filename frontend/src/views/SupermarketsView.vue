<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PlusIcon, StoreIcon } from '@lucide/vue'
import { supermarketsApi } from '@/api'
import type { Supermarket } from '@/types'
import { FormDialog, ConfirmDialog } from '@/components/dialogs'
import { useAsyncAction, ASYNC_ACTION_FAILED } from '@/composables/useAsyncAction'
import { useToast } from '@/composables/useToast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'

const supermarkets = ref<Supermarket[]>([])
const { loading, error, run: runLoad } = useAsyncAction('Erro ao carregar supermercados', { immediate: true })

const showModal = ref(false)
const editingItem = ref<Supermarket | null>(null)
const form = ref({ name: '', location: '' })
const { loading: saving, error: formError, run: runSave } = useAsyncAction('Erro ao guardar')

const deleteTarget = ref<Supermarket | null>(null)
const showDeleteConfirm = ref(false)
const { loading: deleting, error: deleteError, run: runDelete } = useAsyncAction('Erro ao eliminar')

const toast = useToast()

async function loadSupermarkets() {
  const result = await runLoad(() => supermarketsApi.getAll())
  if (result !== ASYNC_ACTION_FAILED) supermarkets.value = result
}

onMounted(loadSupermarkets)

function openCreate() {
  editingItem.value = null
  form.value = { name: '', location: '' }
  formError.value = ''
  showModal.value = true
}

function openEdit(s: Supermarket) {
  editingItem.value = s
  form.value = { name: s.name, location: s.location ?? '' }
  formError.value = ''
  showModal.value = true
}

async function save() {
  if (!form.value.name) {
    formError.value = 'Nome é obrigatório'
    return
  }
  const result = await runSave(async () => {
    const data = { name: form.value.name, location: form.value.location || null }
    if (editingItem.value) {
      await supermarketsApi.update(editingItem.value.id, data)
    } else {
      await supermarketsApi.create(data)
    }
  })
  if (result !== ASYNC_ACTION_FAILED) {
    showModal.value = false
    toast.success(editingItem.value ? 'Supermercado atualizado com sucesso' : 'Supermercado criado com sucesso')
    await loadSupermarkets()
  }
}

function openDeleteConfirm(s: Supermarket) {
  deleteTarget.value = s
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const target = deleteTarget.value
  const result = await runDelete(() => supermarketsApi.delete(target.id))
  if (result !== ASYNC_ACTION_FAILED) {
    showDeleteConfirm.value = false
    deleteTarget.value = null
    toast.success('Supermercado eliminado com sucesso')
    await loadSupermarkets()
  }
}
</script>

<template>
  <div>
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Supermercados</h1>
        <p class="mt-1 text-gray-500">Gerir supermercados</p>
      </div>
      <Button @click="openCreate">
        <PlusIcon class="size-4" />
        Novo Supermercado
      </Button>
    </div>

    <div v-if="loading" class="flex h-40 items-center justify-center">
      <Spinner class="size-8 text-brand-600" />
    </div>

    <Alert v-else-if="error || deleteError" variant="destructive">
      <AlertDescription>{{ error || deleteError }}</AlertDescription>
    </Alert>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-if="supermarkets.length === 0" class="col-span-full py-16 text-center text-gray-400">
        Nenhum supermercado registado
      </div>
      <Card
        v-for="s in supermarkets"
        :key="s.id"
        class="flex flex-row items-start justify-between gap-4 p-5 transition-shadow hover:shadow-md"
      >
        <div class="flex items-start gap-4">
          <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100">
            <StoreIcon class="size-5 text-blue-600" />
          </div>
          <div>
            <p class="font-semibold text-gray-900">{{ s.name }}</p>
            <p v-if="s.location" class="mt-0.5 text-sm text-gray-500">{{ s.location }}</p>
            <p class="mt-1 text-xs text-gray-400">{{ s._count?.prices ?? 0 }} preços registados</p>
            <div v-if="s.createdBy" class="mt-1 text-xs text-gray-400">
              por <span class="font-medium text-gray-600">{{ s.createdBy.name }}</span>
              <template v-if="s.updatedBy && s.updatedBy.id !== s.createdBy.id">
                · editado por <span class="font-medium text-gray-600">{{ s.updatedBy.name }}</span>
              </template>
            </div>
          </div>
        </div>
        <div class="flex flex-shrink-0 flex-col gap-2">
          <Button variant="outline" size="sm" @click="openEdit(s)">Editar</Button>
          <Button variant="destructive" size="sm" data-testid="delete-supermarket" @click="openDeleteConfirm(s)">
            Eliminar
          </Button>
        </div>
      </Card>
    </div>

    <FormDialog
      v-model="showModal"
      :title="editingItem ? 'Editar Supermercado' : 'Novo Supermercado'"
      :loading="saving"
      :error="formError"
      @submit="save"
    >
      <div class="space-y-4">
        <div class="space-y-1.5">
          <Label>Nome *</Label>
          <Input v-model="form.name" type="text" placeholder="ex: Continente" />
        </div>
        <div class="space-y-1.5">
          <Label>Localização</Label>
          <Input v-model="form.location" type="text" placeholder="ex: Lisboa, Rua X" />
        </div>
      </div>
    </FormDialog>

    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="Eliminar supermercado"
      :message="`Eliminar &quot;${deleteTarget?.name}&quot;? Todos os preços associados serão removidos.`"
      confirm-label="Eliminar"
      :danger="true"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
