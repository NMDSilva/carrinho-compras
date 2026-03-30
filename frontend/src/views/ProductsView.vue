<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { productsApi } from '@/api'
import type { Product } from '@/types'
import { FormDialog, ConfirmDialog } from '@/components/dialogs'

const products = ref<Product[]>([])
const categories = ref<string[]>([])
const loading = ref(true)
const search = ref('')
const filterCategory = ref('')

const showModal = ref(false)
const editingProduct = ref<Product | null>(null)
const saving = ref(false)
const formError = ref('')
const form = ref({ name: '', brand: '', unit: 'un', category: '' })

const deleteTarget = ref<Product | null>(null)
const showDeleteConfirm = ref(false)
const deleting = ref(false)

const UNITS = ['un', 'kg', 'g', 'L', 'ml', 'cx', 'pac', 'dz']

async function loadProducts() {
  loading.value = true
  try {
    products.value = await productsApi.getAll({
      search: search.value || undefined,
      category: filterCategory.value || undefined,
    })
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  categories.value = await productsApi.getCategories()
}

onMounted(() => {
  loadProducts()
  loadCategories()
})

function openCreate() {
  editingProduct.value = null
  form.value = { name: '', brand: '', unit: 'un', category: '' }
  formError.value = ''
  showModal.value = true
}

function openEdit(product: Product) {
  editingProduct.value = product
  form.value = {
    name: product.name,
    brand: product.brand ?? '',
    unit: product.unit,
    category: product.category ?? '',
  }
  formError.value = ''
  showModal.value = true
}

async function saveProduct() {
  if (!form.value.name || !form.value.unit) {
    formError.value = 'Nome e unidade são obrigatórios'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const data = {
      name: form.value.name,
      brand: form.value.brand || null,
      unit: form.value.unit,
      category: form.value.category || null,
    }
    if (editingProduct.value) {
      await productsApi.update(editingProduct.value.id, data)
    } else {
      await productsApi.create(data)
    }
    showModal.value = false
    await loadProducts()
    await loadCategories()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    formError.value = err.response?.data?.error ?? 'Erro ao guardar produto'
  } finally {
    saving.value = false
  }
}

function openDeleteConfirm(product: Product) {
  deleteTarget.value = product
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await productsApi.delete(deleteTarget.value.id)
    showDeleteConfirm.value = false
    deleteTarget.value = null
    await loadProducts()
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Produtos</h1>
        <p class="text-gray-500 mt-1">Gerir produtos registados</p>
      </div>
      <button class="btn-primary" @click="openCreate">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Novo Produto
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3 mb-6">
      <input
        v-model="search"
        @input="loadProducts"
        type="text"
        placeholder="Pesquisar produto..."
        class="input max-w-xs"
      />
      <select v-model="filterCategory" @change="loadProducts" class="input max-w-xs">
        <option value="">Todas as categorias</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div v-if="loading" class="flex items-center justify-center h-40">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="text-left px-6 py-3 font-medium text-gray-500">Nome</th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">Marca</th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">Unidade</th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">Categoria</th>
            <th class="text-right px-6 py-3 font-medium text-gray-500">Preços</th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">Registado por</th>
            <th class="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-if="products.length === 0">
            <td colspan="7" class="text-center py-12 text-gray-400">Nenhum produto encontrado</td>
          </tr>
          <tr v-for="product in products" :key="product.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 font-medium text-gray-900">{{ product.name }}</td>
            <td class="px-6 py-4 text-gray-500">{{ product.brand ?? '—' }}</td>
            <td class="px-6 py-4"><span class="badge-blue">{{ product.unit }}</span></td>
            <td class="px-6 py-4 text-gray-500">{{ product.category ?? '—' }}</td>
            <td class="px-6 py-4 text-right text-gray-500">{{ product._count?.prices ?? 0 }}</td>
            <td class="px-6 py-4">
              <div v-if="product.createdBy" class="text-xs">
                <span class="text-gray-700 font-medium">{{ product.createdBy.name }}</span>
                <span v-if="product.updatedBy && product.updatedBy.id !== product.createdBy.id" class="text-gray-400 block">
                  editado por {{ product.updatedBy.name }}
                </span>
              </div>
              <span v-else class="text-gray-300 text-xs">—</span>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end gap-2">
                <button @click="openEdit(product)" class="btn-secondary btn-sm">Editar</button>
                <button @click="openDeleteConfirm(product)" class="btn-danger btn-sm">Eliminar</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <FormDialog
      v-model="showModal"
      :title="editingProduct ? 'Editar Produto' : 'Novo Produto'"
      :loading="saving"
      :error="formError"
      @submit="saveProduct"
    >
      <div class="space-y-4">
        <div>
          <label class="label">Nome *</label>
          <input v-model="form.name" type="text" class="input" placeholder="ex: Leite Meio-Gordo" />
        </div>
        <div>
          <label class="label">Marca</label>
          <input v-model="form.brand" type="text" class="input" placeholder="ex: Mimosa" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Unidade *</label>
            <select v-model="form.unit" class="input">
              <option v-for="unit in UNITS" :key="unit" :value="unit">{{ unit }}</option>
            </select>
          </div>
          <div>
            <label class="label">Categoria</label>
            <input v-model="form.category" type="text" list="cats" class="input" placeholder="ex: Lacticínios" />
            <datalist id="cats">
              <option v-for="cat in categories" :key="cat" :value="cat" />
            </datalist>
          </div>
        </div>
      </div>
    </FormDialog>

    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="Eliminar produto"
      :message="`Eliminar &quot;${deleteTarget?.name}&quot;? Todos os preços associados serão removidos.`"
      confirm-label="Eliminar"
      :danger="true"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
