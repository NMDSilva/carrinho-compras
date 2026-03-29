<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supermarketsApi } from '@/api'
import type { Supermarket } from '@/types'

const supermarkets = ref<Supermarket[]>([])
const loading = ref(true)
const showModal = ref(false)
const editingItem = ref<Supermarket | null>(null)
const saving = ref(false)
const formError = ref('')
const form = ref({ name: '', location: '' })

async function loadSupermarkets() {
  loading.value = true
  try {
    supermarkets.value = await supermarketsApi.getAll()
  } finally {
    loading.value = false
  }
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
  saving.value = true
  formError.value = ''
  try {
    const data = { name: form.value.name, location: form.value.location || null }
    if (editingItem.value) {
      await supermarketsApi.update(editingItem.value.id, data)
    } else {
      await supermarketsApi.create(data)
    }
    showModal.value = false
    await loadSupermarkets()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    formError.value = err.response?.data?.error ?? 'Erro ao guardar'
  } finally {
    saving.value = false
  }
}

async function deleteSupermarket(s: Supermarket) {
  if (!confirm(`Eliminar "${s.name}"? Todos os preços associados serão removidos.`)) return
  await supermarketsApi.delete(s.id)
  await loadSupermarkets()
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
          </div>
        </div>
        <div class="flex flex-col gap-2 flex-shrink-0">
          <button @click="openEdit(s)" class="btn-secondary btn-sm">Editar</button>
          <button @click="deleteSupermarket(s)" class="btn-danger btn-sm">Eliminar</button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40" @click="showModal = false"></div>
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-5">
            {{ editingItem ? 'Editar Supermercado' : 'Novo Supermercado' }}
          </h2>
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
          <p v-if="formError" class="mt-3 text-sm text-red-600">{{ formError }}</p>
          <div class="flex justify-end gap-3 mt-6">
            <button class="btn-secondary" @click="showModal = false">Cancelar</button>
            <button class="btn-primary" :disabled="saving" @click="save">
              {{ saving ? 'A guardar…' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
