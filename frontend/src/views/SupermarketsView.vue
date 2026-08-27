<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supermarketsApi } from '@/api'
import type { Supermarket } from '@/types'
import { FormDialog, ConfirmDialog } from '@/components/dialogs'
import { useAsyncAction } from '@/composables/useAsyncAction'

const supermarkets = ref<Supermarket[]>([])
const { loading, error, run: runLoad } = useAsyncAction('Erro ao carregar supermercados', { immediate: true })

const showModal = ref(false)
const editingItem = ref<Supermarket | null>(null)
const form = ref({ name: '', location: '' })
const { loading: saving, error: formError, run: runSave } = useAsyncAction('Erro ao guardar')

const deleteTarget = ref<Supermarket | null>(null)
const showDeleteConfirm = ref(false)
const { loading: deleting, error: deleteError, run: runDelete } = useAsyncAction('Erro ao eliminar')

async function loadSupermarkets() {
  const result = await runLoad(() => supermarketsApi.getAll())
  if (result !== undefined) supermarkets.value = result
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
  if (result !== undefined) {
    showModal.value = false
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
  if (result !== undefined) {
    showDeleteConfirm.value = false
    deleteTarget.value = null
    await loadSupermarkets()
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Supermercados</h1>
        <p class="text-gray-500 mt-1">Gerir supermercados</p>
      </div>
      <button class="btn-primary" @click="openCreate">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Novo Supermercado
      </button>
    </div>

    <div v-if="loading" class="flex items-center justify-center h-40">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
    </div>

    <div v-else-if="error || deleteError" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
      {{ error || deleteError }}
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-if="supermarkets.length === 0" class="col-span-full text-center py-16 text-gray-400">
        Nenhum supermercado registado
      </div>
      <div
        v-for="s in supermarkets"
        :key="s.id"
        class="card p-5 flex items-start justify-between gap-4 hover:shadow-md transition-shadow"
      >
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <p class="font-semibold text-gray-900">{{ s.name }}</p>
            <p v-if="s.location" class="text-sm text-gray-500 mt-0.5">{{ s.location }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ s._count?.prices ?? 0 }} preços registados</p>
            <div v-if="s.createdBy" class="text-xs text-gray-400 mt-1">
              por <span class="text-gray-600 font-medium">{{ s.createdBy.name }}</span>
              <template v-if="s.updatedBy && s.updatedBy.id !== s.createdBy.id">
                · editado por <span class="text-gray-600 font-medium">{{ s.updatedBy.name }}</span>
              </template>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-2 flex-shrink-0">
          <button @click="openEdit(s)" class="btn-secondary btn-sm">Editar</button>
          <button @click="openDeleteConfirm(s)" class="btn-danger btn-sm">Eliminar</button>
        </div>
      </div>
    </div>

    <FormDialog
      v-model="showModal"
      :title="editingItem ? 'Editar Supermercado' : 'Novo Supermercado'"
      :loading="saving"
      :error="formError"
      @submit="save"
    >
      <div class="space-y-4">
        <div>
          <label class="label">Nome *</label>
          <input v-model="form.name" type="text" class="input" placeholder="ex: Continente" />
        </div>
        <div>
          <label class="label">Localização</label>
          <input v-model="form.location" type="text" class="input" placeholder="ex: Lisboa, Rua X" />
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
