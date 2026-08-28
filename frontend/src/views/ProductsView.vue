<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { productsApi, variantsApi } from '@/api'
import { useRoute, useRouter } from 'vue-router'
import type { Product, ProductVariant } from '@/types'
import { FormDialog, ConfirmDialog } from '@/components/dialogs'
import { useAsyncAction, ASYNC_ACTION_FAILED } from '@/composables/useAsyncAction'

const products = ref<Product[]>([])
const categories = ref<string[]>([])
const search = ref('')
const filterCategory = ref('')
const expanded = ref<Set<number>>(new Set())
const {
  loading,
  error,
  run: runLoad,
} = useAsyncAction('Erro ao carregar produtos', { immediate: true })

let searchDebounce: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(loadProducts, 300)
})

// --- Produto (genérico) ---
const showModal = ref(false)
const editingProduct = ref<Product | null>(null)
const form = ref({ name: '', category: '' })
const {
  loading: saving,
  error: formError,
  run: runSave,
} = useAsyncAction('Erro ao guardar produto')

const deleteTarget = ref<Product | null>(null)
const showDeleteConfirm = ref(false)
const {
  loading: deleting,
  error: deleteError,
  run: runDelete,
} = useAsyncAction('Erro ao eliminar produto')

// --- Variante ---
const UNITS = ['un', 'kg', 'g', 'L', 'ml', 'cx', 'pac', 'dz']
const showVariantModal = ref(false)
const editingVariant = ref<ProductVariant | null>(null)
const variantProductId = ref<number | null>(null)
const variantForm = ref({ brand: '', packageSize: '', packCount: '', unit: 'un' })
const {
  loading: savingVariant,
  error: variantFormError,
  run: runSaveVariant,
} = useAsyncAction('Erro ao guardar variante')

const variantDeleteTarget = ref<ProductVariant | null>(null)
const showVariantDeleteConfirm = ref(false)
const {
  loading: deletingVariant,
  error: variantDeleteError,
  run: runDeleteVariant,
} = useAsyncAction('Erro ao eliminar variante')

// --- Mover variante para outro produto ---
const showReassignModal = ref(false)
const reassignSource = ref<ProductVariant | null>(null)
const reassignQuery = ref('')
const reassignResults = ref<Product[]>([])
const reassignTarget = ref<Product | null>(null)
const {
  loading: reassigning,
  error: reassignError,
  run: runReassign,
} = useAsyncAction('Erro ao mover variante')
let reassignDebounce: ReturnType<typeof setTimeout> | undefined

const route = useRoute()
const router = useRouter()

async function loadProducts() {
  const result = await runLoad(() =>
    productsApi.getAll({
      search: search.value || undefined,
      category: filterCategory.value || undefined,
    })
  )
  if (result !== ASYNC_ACTION_FAILED) products.value = result
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

function toggleExpanded(productId: number) {
  if (expanded.value.has(productId)) {
    expanded.value.delete(productId)
  } else {
    expanded.value.add(productId)
  }
  // força reatividade — Set não é profundamente reativo por si só
  expanded.value = new Set(expanded.value)
}

// --- Produto ---

function openCreate() {
  editingProduct.value = null
  form.value = { name: '', category: '' }
  formError.value = ''
  showModal.value = true
}

function openEdit(product: Product) {
  editingProduct.value = product
  form.value = { name: product.name, category: product.category ?? '' }
  formError.value = ''
  showModal.value = true
}

async function saveProduct() {
  if (!form.value.name) {
    formError.value = 'Nome é obrigatório'
    return
  }
  const result = await runSave(async () => {
    const data = {
      name: form.value.name,
      category: form.value.category || null,
    }
    if (editingProduct.value) {
      await productsApi.update(editingProduct.value.id, data)
    } else {
      await productsApi.create(data)
    }
  })
  if (result !== ASYNC_ACTION_FAILED) {
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
  if (result !== ASYNC_ACTION_FAILED) {
    showDeleteConfirm.value = false
    deleteTarget.value = null
    await loadProducts()
  }
}

// --- Variante ---

function openCreateVariant(productId: number) {
  editingVariant.value = null
  variantProductId.value = productId
  variantForm.value = { brand: '', packageSize: '', packCount: '', unit: 'un' }
  variantFormError.value = ''
  showVariantModal.value = true
}

function openEditVariant(productId: number, variant: ProductVariant) {
  editingVariant.value = variant
  variantProductId.value = productId
  variantForm.value = {
    brand: variant.brand ?? '',
    packageSize: variant.packageSize != null ? String(variant.packageSize) : '',
    packCount: variant.packCount != null ? String(variant.packCount) : '',
    unit: variant.unit,
  }
  variantFormError.value = ''
  showVariantModal.value = true
}

async function saveVariant() {
  if (!variantForm.value.unit || variantProductId.value === null) {
    variantFormError.value = 'Unidade é obrigatória'
    return
  }
  const result = await runSaveVariant(async () => {
    const data = {
      brand: variantForm.value.brand || null,
      packageSize: variantForm.value.packageSize
        ? Number(variantForm.value.packageSize)
        : null,
      packCount: variantForm.value.packCount ? Number(variantForm.value.packCount) : null,
      unit: variantForm.value.unit,
    }
    if (editingVariant.value) {
      await variantsApi.update(editingVariant.value.id, data)
    } else {
      await variantsApi.create(variantProductId.value as number, data)
    }
  })
  if (result !== ASYNC_ACTION_FAILED) {
    showVariantModal.value = false
    await loadProducts()
  }
}

function openVariantDeleteConfirm(variant: ProductVariant) {
  variantDeleteTarget.value = variant
  showVariantDeleteConfirm.value = true
}

async function confirmDeleteVariant() {
  if (!variantDeleteTarget.value) return
  const target = variantDeleteTarget.value
  const result = await runDeleteVariant(() => variantsApi.delete(target.id))
  if (result !== ASYNC_ACTION_FAILED) {
    showVariantDeleteConfirm.value = false
    variantDeleteTarget.value = null
    await loadProducts()
  }
}

// --- Mover variante para outro produto ---

function openReassign(variant: ProductVariant) {
  reassignSource.value = variant
  reassignQuery.value = ''
  reassignResults.value = []
  reassignTarget.value = null
  reassignError.value = ''
  showReassignModal.value = true
}

function searchReassignTarget() {
  clearTimeout(reassignDebounce)
  reassignDebounce = setTimeout(async () => {
    const query = reassignQuery.value.trim()
    if (!query) {
      reassignResults.value = []
      return
    }
    const results = await productsApi.getAll({ search: query })
    // não faz sentido mover a variante para o mesmo produto onde já está
    reassignResults.value = results.filter((p) => p.id !== reassignSource.value?.productId)
  }, 300)
}

function selectReassignTarget(product: Product) {
  reassignTarget.value = product
  reassignQuery.value = product.name
  reassignResults.value = []
}

async function confirmReassign() {
  if (!reassignSource.value || !reassignTarget.value) {
    reassignError.value = 'Escolhe o produto de destino'
    return
  }
  const source = reassignSource.value
  const target = reassignTarget.value
  const result = await runReassign(() => variantsApi.reassign(source.id, target.id))
  if (result !== ASYNC_ACTION_FAILED) {
    showReassignModal.value = false
    await loadProducts()
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Produtos</h1>
        <p class="text-gray-500 mt-1">
          Gerir produtos e as suas variantes (marca/embalagem)
        </p>
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
        class="input max-w-xs"
        @change="loadProducts"
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
            <th class="w-8"></th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">Nome</th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">
              Categoria
            </th>
            <th class="text-right px-6 py-3 font-medium text-gray-500">
              Variantes
            </th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">
              Registado por
            </th>
            <th class="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-if="products.length === 0">
            <td colspan="6" class="text-center py-12 text-gray-400">
              Nenhum produto encontrado
            </td>
          </tr>
          <template v-for="product in products" :key="product.id">
            <tr
              class="hover:bg-gray-50 transition-colors cursor-pointer"
              @click="toggleExpanded(product.id)"
            >
              <td class="pl-6 py-4 text-gray-400">
                <svg
                  class="w-4 h-4 transition-transform"
                  :class="{ 'rotate-90': expanded.has(product.id) }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </td>
              <td class="px-6 py-4 font-medium text-gray-900">
                {{ product.name }}
                <span v-if="product.needsReview" class="badge-yellow ml-2"
                  >Por rever</span
                >
              </td>
              <td class="px-6 py-4 text-gray-500">
                {{ product.category ?? '—' }}
              </td>
              <td class="px-6 py-4 text-right text-gray-500">
                {{ product.variants?.length ?? 0 }}
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
              <td class="px-6 py-4" @click.stop>
                <div class="flex items-center justify-end gap-2">
                  <button
                    class="btn-secondary btn-sm"
                    @click="openEdit(product)"
                  >
                    Editar
                  </button>
                  <button
                    class="btn-danger btn-sm"
                    @click="openDeleteConfirm(product)"
                  >
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="expanded.has(product.id)">
              <td colspan="6" class="bg-gray-50 px-6 py-4">
                <div class="flex items-center justify-between mb-3">
                  <h3
                    class="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    Variantes
                  </h3>
                  <button
                    class="btn-secondary btn-sm"
                    @click="openCreateVariant(product.id)"
                  >
                    Nova variante
                  </button>
                </div>
                <table
                  v-if="product.variants && product.variants.length > 0"
                  class="w-full text-sm bg-white rounded-lg border border-gray-100 overflow-hidden"
                >
                  <thead class="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th class="text-left px-4 py-2 font-medium text-gray-500">
                        Marca
                      </th>
                      <th class="text-left px-4 py-2 font-medium text-gray-500">
                        Tamanho
                      </th>
                      <th class="text-left px-4 py-2 font-medium text-gray-500">
                        Unidade
                      </th>
                      <th
                        class="text-right px-4 py-2 font-medium text-gray-500"
                      >
                        Preços
                      </th>
                      <th class="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-50">
                    <tr v-for="variant in product.variants" :key="variant.id">
                      <td class="px-4 py-2 text-gray-900">
                        {{ variant.brand ?? '—' }}
                      </td>
                      <td class="px-4 py-2 text-gray-500">
                        <span v-if="variant.packageSize == null">—</span>
                        <span v-else-if="variant.packCount"
                          >{{ variant.packCount }} × {{ variant.packageSize }}</span
                        >
                        <span v-else>{{ variant.packageSize }}</span>
                      </td>
                      <td class="px-4 py-2">
                        <span class="badge-blue">{{ variant.unit }}</span>
                      </td>
                      <td class="px-4 py-2 text-right text-gray-500">
                        {{ variant._count?.prices ?? 0 }}
                      </td>
                      <td class="px-4 py-2">
                        <div class="flex items-center justify-end gap-2">
                          <button
                            class="btn-secondary btn-sm"
                            @click="openEditVariant(product.id, variant)"
                          >
                            Editar
                          </button>
                          <button
                            class="btn-secondary btn-sm"
                            @click="openReassign(variant)"
                          >
                            Mover
                          </button>
                          <button
                            class="btn-danger btn-sm"
                            @click="openVariantDeleteConfirm(variant)"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p v-else class="text-sm text-gray-400">
                  Ainda sem variantes — cria a primeira acima.
                </p>
              </td>
            </tr>
          </template>
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
            placeholder="ex: Açúcar branco"
          />
        </div>
        <div>
          <label class="label">Categoria</label>
          <input
            v-model="form.category"
            type="text"
            list="cats"
            class="input"
            placeholder="ex: Mercearia"
          />
          <datalist id="cats">
            <option v-for="cat in categories" :key="cat" :value="cat" />
          </datalist>
        </div>
      </div>
    </FormDialog>

    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="Eliminar produto"
      :message="`Eliminar &quot;${deleteTarget?.name}&quot;? Todas as variantes e preços associados serão removidos.`"
      confirm-label="Eliminar"
      :danger="true"
      :loading="deleting"
      @confirm="confirmDelete"
    />

    <FormDialog
      v-model="showVariantModal"
      :title="editingVariant ? 'Editar Variante' : 'Nova Variante'"
      :loading="savingVariant"
      :error="variantFormError"
      @submit="saveVariant"
    >
      <div class="space-y-4">
        <div>
          <label class="label">Marca</label>
          <input
            v-model="variantForm.brand"
            type="text"
            class="input"
            placeholder="ex: Sidul"
          />
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="label">Embalagens</label>
            <input
              v-model="variantForm.packCount"
              type="number"
              step="1"
              min="1"
              class="input"
              placeholder="ex: 3"
            />
          </div>
          <div>
            <label class="label">Tamanho</label>
            <input
              v-model="variantForm.packageSize"
              type="number"
              step="0.01"
              class="input"
              placeholder="ex: 1"
            />
          </div>
          <div>
            <label class="label">Unidade *</label>
            <select v-model="variantForm.unit" class="input">
              <option v-for="unit in UNITS" :key="unit" :value="unit">
                {{ unit }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </FormDialog>

    <ConfirmDialog
      v-model="showVariantDeleteConfirm"
      title="Eliminar variante"
      :message="`Eliminar esta variante? Todos os preços associados serão removidos.`"
      confirm-label="Eliminar"
      :danger="true"
      :loading="deletingVariant"
      @confirm="confirmDeleteVariant"
    />
    <p v-if="variantDeleteError" class="text-sm text-red-600 mt-2">
      {{ variantDeleteError }}
    </p>

    <FormDialog
      v-model="showReassignModal"
      title="Mover variante para outro produto"
      submit-label="Mover"
      :loading="reassigning"
      :error="reassignError"
      @submit="confirmReassign"
    >
      <div class="space-y-4">
        <p class="text-sm text-gray-500">
          A variante
          <b class="text-gray-900">{{
            reassignSource?.brand ?? 'Genérico'
          }}</b>
          vai passar a pertencer a outro produto. Se o produto de origem
          ficar sem mais nenhuma variante, é eliminado automaticamente.
        </p>
        <div class="relative">
          <label class="label">Produto de destino</label>
          <input
            v-model="reassignQuery"
            type="text"
            class="input"
            placeholder="Pesquisar produto de destino..."
            @input="searchReassignTarget"
          />
          <ul
            v-if="reassignResults.length > 0"
            class="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          >
            <li
              v-for="candidate in reassignResults"
              :key="candidate.id"
              class="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
              @click="selectReassignTarget(candidate)"
            >
              {{ candidate.name }}
            </li>
          </ul>
        </div>
        <p v-if="reassignTarget" class="text-sm text-brand-700">
          Destino selecionado: <b>{{ reassignTarget.name }}</b>
        </p>
      </div>
    </FormDialog>
  </div>
</template>
