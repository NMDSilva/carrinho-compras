<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { productsApi } from '@/api'
import { useRoute, useRouter } from 'vue-router'
import type { Product } from '@/types'
import { FormDialog, ConfirmDialog } from '@/components/dialogs'
import { useAsyncAction } from '@/composables/useAsyncAction'

const products = ref<Product[]>([])
const categories = ref<string[]>([])
const search = ref('')
const filterCategory = ref('')
const { loading, error, run: runLoad } = useAsyncAction('Erro ao carregar produtos', { immediate: true })

let searchDebounce: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(loadProducts, 300)
})

const showModal = ref(false)
const editingProduct = ref<Product | null>(null)
const form = ref({ name: '', brand: '', unit: 'un', category: '' })
const { loading: saving, error: formError, run: runSave } = useAsyncAction('Erro ao guardar produto')

const deleteTarget = ref<Product | null>(null)
const showDeleteConfirm = ref(false)
const { loading: deleting, error: deleteError, run: runDelete } = useAsyncAction('Erro ao eliminar produto')

const route = useRoute()
const router = useRouter()

const UNITS = ['un', 'kg', 'g', 'L', 'ml', 'cx', 'pac', 'dz']

async function loadProducts() {
  const result = await runLoad(() =>
    productsApi.getAll({
      search: search.value || undefined,
      category: filterCategory.value || undefined,
    })
  )
  if (result !== undefined) products.value = result
}

async function loadCategories() {
  categories.value = await productsApi.getCategories()
}

onMounted(async () => {
  await Promise.all([loadProducts(), loadCategories()])

  if (route.params.id) {
    const product = products.value.find((p) => p.id === Number(route.params.id))
    if (product) {
      openEdit(product)
    } else {
      router.replace({ name: 'products' })
    }
  }
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
  const result = await runSave(async () => {
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
  })
  if (result !== undefined) {
    showModal.value = false
    await loadProducts()
    await loadCategories()
  }
}

function openDeleteConfirm(product: Product) {
  deleteTarget.value = product
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const target = deleteTarget.value
  const result = await runDelete(() => productsApi.delete(target.id))
  if (result !== undefined) {
    showDeleteConfirm.value = false
    deleteTarget.value = null
    await loadProducts()
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
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Novo Produto
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3 mb-6">
      <input
        v-model="search"
        type="text"
        placeholder="Pesquisar produto..."
        class="input max-w-xs"
      />
      <select
        v-model="filterCategory"
        @change="loadProducts"
        class="input max-w-xs"
      >
        <option value="">Todas as categorias</option>
        <option v-for="cat in categories" :key="cat" :value="cat">
          {{ cat }}
        </option>
      </select>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div v-if="loading" class="flex items-center justify-center h-40">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"
        ></div>
      </div>
      <div
        v-else-if="error || deleteError"
        class="bg-red-50 border border-red-200 rounded-lg p-4 m-6 text-red-700 text-sm"
      >
        {{ error || deleteError }}
      </div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="text-left px-6 py-3 font-medium text-gray-500">Nome</th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">Marca</th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">
              Unidade
            </th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">
              Categoria
            </th>
            <th class="text-right px-6 py-3 font-medium text-gray-500">
              Preços
            </th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">
              Registado por
            </th>
            <th class="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-if="products.length === 0">
            <td colspan="7" class="text-center py-12 text-gray-400">
              Nenhum produto encontrado
            </td>
          </tr>
          <tr
            v-for="product in products"
            :key="product.id"
            class="hover:bg-gray-50 transition-colors"
          >
            <td class="px-6 py-4 font-medium text-gray-900">
              {{ product.name }}
            </td>
            <td class="px-6 py-4 text-gray-500">{{ product.brand ?? '—' }}</td>
            <td class="px-6 py-4">
              <span class="badge-blue">{{ product.unit }}</span>
            </td>
            <td class="px-6 py-4 text-gray-500">
              {{ product.category ?? '—' }}
            </td>
            <td class="px-6 py-4 text-right text-gray-500">
              {{ product._count?.prices ?? 0 }}
            </td>
            <td class="px-6 py-4">
              <div v-if="product.createdBy" class="text-xs">
                <span class="text-gray-700 font-medium">{{
                  product.createdBy.name
                }}</span>
                <span
                  v-if="
                    product.updatedBy &&
                    product.updatedBy.id !== product.createdBy.id
                  "
                  class="text-gray-400 block"
                >
                  editado por {{ product.updatedBy.name }}
                </span>
              </div>
              <span v-else class="text-gray-300 text-xs">—</span>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end gap-2">
                <button @click="openEdit(product)" class="btn-secondary btn-sm">
                  Editar
                </button>
                <button
                  @click="openDeleteConfirm(product)"
                  class="btn-danger btn-sm"
                >
                  Eliminar
                </button>
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
          <input
            v-model="form.name"
            type="text"
            class="input"
            placeholder="ex: Leite Meio-Gordo"
          />
        </div>
        <div>
          <label class="label">Marca</label>
          <input
            v-model="form.brand"
            type="text"
            class="input"
            placeholder="ex: Mimosa"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Unidade *</label>
            <select v-model="form.unit" class="input">
              <option v-for="unit in UNITS" :key="unit" :value="unit">
                {{ unit }}
              </option>
            </select>
          </div>
          <div>
            <label class="label">Categoria</label>
            <input
              v-model="form.category"
              type="text"
              list="cats"
              class="input"
              placeholder="ex: Lacticínios"
            />
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
