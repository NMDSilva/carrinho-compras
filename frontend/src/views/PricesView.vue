<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { pricesApi, productsApi, supermarketsApi } from '@/api'
import type { PriceRecord, Product, Supermarket } from '@/types'
import { FormDialog, ConfirmDialog } from '@/components/dialogs'
import {
  useAsyncAction,
  ASYNC_ACTION_FAILED,
} from '@/composables/useAsyncAction'
import { useDebouncedSearch } from '@/composables/useDebouncedSearch'

const prices = ref<PriceRecord[]>([])
const supermarkets = ref<Supermarket[]>([])
const total = ref(0)
const page = ref(0)
const PAGE_SIZE = 15
const {
  loading,
  error,
  run: runLoad,
} = useAsyncAction('Erro ao carregar preços', { immediate: true })

const filterProduct = ref<number | ''>('')
const {
  query: filterProductQuery,
  results: filterProductResults,
  loading: filterProductSearchLoading,
  search: searchFilterProductsDebounced,
} = useDebouncedSearch<Product>(
  async (query) => (await productsApi.getAll({ search: query })).data
)
const filterSupermarket = ref<number | ''>('')

const showModal = ref(false)
const editingPrice = ref<PriceRecord | null>(null)
const {
  loading: saving,
  error: formError,
  run: runSave,
} = useAsyncAction('Erro ao guardar')

const deleteTarget = ref<PriceRecord | null>(null)
const showDeleteConfirm = ref(false)
const {
  loading: deleting,
  error: deleteError,
  run: runDelete,
} = useAsyncAction('Erro ao eliminar')

const route = useRoute()
const router = useRouter()

const today = new Date().toISOString().substring(0, 10)
const form = ref({
  variantId: '' as number | '',
  supermarketId: '' as number | '',
  price: '' as number | '',
  quantity: 1,
  date: today,
  notes: '',
})

const {
  query: formProductQuery,
  results: formProductResults,
  loading: formProductSearchLoading,
  search: searchFormProducts,
  clear: clearFormProductSearch,
} = useDebouncedSearch<Product>(
  async (query) => (await productsApi.getAll({ search: query })).data
)
const formProductObj = ref<Product | null>(null)

const formVariants = computed(() => formProductObj.value?.variants ?? [])

const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE))

function formatVariant(variant: {
  brand: string | null
  packageSize: number | null
  packCount: number | null
  unit: string
}) {
  const size = variant.packageSize
    ? `${variant.packageSize}${variant.unit}`
    : variant.unit
  const label = variant.packCount ? `${variant.packCount}×${size}` : size
  return variant.brand ? `${variant.brand} ${label}` : `Genérico ${label}`
}

async function loadPrices() {
  const result = await runLoad(() =>
    pricesApi.getAll({
      productId:
        filterProduct.value !== '' ? Number(filterProduct.value) : undefined,
      supermarketId:
        filterSupermarket.value !== ''
          ? Number(filterSupermarket.value)
          : undefined,
      limit: PAGE_SIZE,
      offset: page.value * PAGE_SIZE,
    })
  )
  if (result !== ASYNC_ACTION_FAILED) {
    prices.value = result.data
    total.value = result.total
  }
}

function searchFilterProducts() {
  searchFilterProductsDebounced()
  if (!filterProductQuery.value.trim() && filterProduct.value !== '') {
    filterProduct.value = ''
    applyFilters()
  }
}

function selectFilterProduct(product: Product) {
  filterProduct.value = product.id
  filterProductQuery.value = product.name
  filterProductResults.value = []
  applyFilters()
}

function selectFormProduct(product: Product) {
  formProductObj.value = product
  formProductQuery.value = product.name
  formProductResults.value = []
  // muda o produto genérico — a variante anterior já não é válida
  form.value.variantId = ''
}

onMounted(async () => {
  await Promise.all([
    supermarketsApi.getAll().then((s) => (supermarkets.value = s)),
    loadPrices(),
  ])

  if (route.params.id) {
    try {
      const price = await pricesApi.getById(Number(route.params.id))
      await openEdit(price)
    } catch {
      router.replace({ name: 'prices' })
    }
  }
})

function openCreate() {
  editingPrice.value = null
  form.value = {
    variantId: '',
    supermarketId: '',
    price: '',
    quantity: 1,
    date: today,
    notes: '',
  }
  clearFormProductSearch()
  formProductObj.value = null
  formError.value = ''
  showModal.value = true
}

async function openEdit(price: PriceRecord) {
  editingPrice.value = price
  form.value = {
    variantId: price.variantId,
    supermarketId: price.supermarketId,
    price: price.price,
    quantity: price.quantity,
    date: price.date.substring(0, 10),
    notes: price.notes ?? '',
  }
  formProductResults.value = []
  formProductQuery.value = price.variant?.product?.name ?? ''
  formProductObj.value = null
  formError.value = ''
  showModal.value = true

  const productId = price.variant?.product?.id
  if (productId) {
    formProductObj.value = await productsApi.getById(productId)
  }
}

async function save() {
  if (
    !form.value.variantId ||
    !form.value.supermarketId ||
    form.value.price === ''
  ) {
    formError.value = 'Produto, variante, supermercado e preço são obrigatórios'
    return
  }
  const result = await runSave(async () => {
    const data = {
      variantId: Number(form.value.variantId),
      supermarketId: Number(form.value.supermarketId),
      price: Number(form.value.price),
      quantity: form.value.quantity,
      date: new Date(form.value.date).toISOString(),
      notes: form.value.notes || undefined,
    }
    if (editingPrice.value) {
      await pricesApi.update(editingPrice.value.id, data)
    } else {
      await pricesApi.create(data)
    }
  })
  if (result !== ASYNC_ACTION_FAILED) {
    showModal.value = false
    await loadPrices()
  }
}

function openDeleteConfirm(price: PriceRecord) {
  deleteTarget.value = price
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const target = deleteTarget.value
  const result = await runDelete(() => pricesApi.delete(target.id))
  if (result !== ASYNC_ACTION_FAILED) {
    showDeleteConfirm.value = false
    deleteTarget.value = null
    await loadPrices()
  }
}

function applyFilters() {
  page.value = 0
  loadPrices()
}

function prevPage() {
  page.value--
  loadPrices()
}

function nextPage() {
  page.value++
  loadPrices()
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-PT').format(new Date(date))
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Preços</h1>
        <p class="text-gray-500 mt-1">Registar e gerir preços de produtos</p>
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
        Registar Preço
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3 mb-6">
      <div class="relative w-full sm:max-w-xs">
        <div class="relative">
          <input
            v-model="filterProductQuery"
            type="text"
            class="input pr-9"
            placeholder="Todos os produtos"
            @input="searchFilterProducts"
          />
          <svg
            v-if="filterProductSearchLoading"
            class="animate-spin w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
        <ul
          v-if="filterProductResults.length > 0"
          class="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          <li
            v-for="p in filterProductResults"
            :key="p.id"
            class="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
            @click="selectFilterProduct(p)"
          >
            {{ p.name }}
          </li>
        </ul>
      </div>
      <select
        v-model="filterSupermarket"
        class="input max-w-xs"
        @change="applyFilters"
      >
        <option value="">Todos os supermercados</option>
        <option v-for="s in supermarkets" :key="s.id" :value="s.id">
          {{ s.name }}
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
            <th class="text-left px-6 py-3 font-medium text-gray-500">
              Produto
            </th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">
              Supermercado
            </th>
            <th class="text-right px-6 py-3 font-medium text-gray-500">
              Preço
            </th>
            <th class="text-right px-6 py-3 font-medium text-gray-500">Qtd.</th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">Data</th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">Notas</th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">
              Utilizador
            </th>
            <th class="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-if="prices.length === 0">
            <td colspan="8" class="text-center py-12 text-gray-400">
              Nenhum registo encontrado
            </td>
          </tr>
          <tr
            v-for="price in prices"
            :key="price.id"
            class="hover:bg-gray-50 transition-colors"
          >
            <td class="px-6 py-4">
              <p class="font-medium text-gray-900">
                {{ price.variant?.product?.name }}
              </p>
              <p v-if="price.variant" class="text-xs text-gray-400">
                {{ formatVariant(price.variant) }}
              </p>
            </td>
            <td class="px-6 py-4 text-gray-600">
              {{ price.supermarket?.name }}
            </td>
            <td class="px-6 py-4 text-right font-semibold text-brand-700">
              {{ formatPrice(price.price) }}
            </td>
            <td class="px-6 py-4 text-right text-gray-500">
              {{ price.quantity }}
            </td>
            <td class="px-6 py-4 text-gray-500">
              {{ formatDate(price.date) }}
            </td>
            <td class="px-6 py-4 text-gray-400 text-xs max-w-32 truncate">
              {{ price.notes ?? '—' }}
            </td>
            <td class="px-6 py-4">
              <div v-if="price.createdBy" class="text-xs">
                <span class="text-gray-700 font-medium">{{
                  price.createdBy.name
                }}</span>
                <span
                  v-if="
                    price.updatedBy && price.updatedBy.id !== price.createdBy.id
                  "
                  class="text-gray-400 block"
                >
                  editado por {{ price.updatedBy.name }}
                </span>
              </div>
              <span v-else class="text-gray-300 text-xs">—</span>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end gap-2">
                <button class="btn-secondary btn-sm" @click="openEdit(price)">
                  Editar
                </button>
                <button
                  class="btn-danger btn-sm"
                  @click="openDeleteConfirm(price)"
                >
                  Eliminar
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div
        v-if="totalPages > 1"
        class="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500"
      >
        <span>{{ total }} registos</span>
        <div class="flex items-center gap-2">
          <button
            class="btn-secondary btn-sm"
            :disabled="page === 0"
            @click="prevPage"
          >
            Anterior
          </button>
          <span>{{ page + 1 }} / {{ totalPages }}</span>
          <button
            class="btn-secondary btn-sm"
            :disabled="page + 1 >= totalPages"
            @click="nextPage"
          >
            Seguinte
          </button>
        </div>
      </div>
    </div>

    <FormDialog
      v-model="showModal"
      :title="editingPrice ? 'Editar Preço' : 'Registar Preço'"
      :loading="saving"
      :error="formError"
      size="lg"
      @submit="save"
    >
      <div class="space-y-4">
        <div class="relative">
          <label class="label">Produto *</label>
          <div class="relative">
            <input
              v-model="formProductQuery"
              type="text"
              class="input pr-9"
              placeholder="Pesquisar produto…"
              @input="searchFormProducts"
            />
            <svg
              v-if="formProductSearchLoading"
              class="animate-spin w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
          <ul
            v-if="formProductResults.length > 0"
            class="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          >
            <li
              v-for="p in formProductResults"
              :key="p.id"
              class="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
              @click="selectFormProduct(p)"
            >
              {{ p.name }}
            </li>
          </ul>
        </div>
        <div>
          <label class="label">Variante (marca) *</label>
          <select
            v-model="form.variantId"
            class="input"
            :disabled="!formProductObj"
          >
            <option value="">Selecionar variante…</option>
            <option v-for="v in formVariants" :key="v.id" :value="v.id">
              {{ formatVariant(v) }}
            </option>
          </select>
        </div>
        <div>
          <label class="label">Supermercado *</label>
          <select v-model="form.supermarketId" class="input">
            <option value="">Selecionar supermercado…</option>
            <option v-for="s in supermarkets" :key="s.id" :value="s.id">
              {{ s.name }}
            </option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Preço (€) *</label>
            <input
              v-model="form.price"
              type="number"
              step="0.01"
              min="0"
              class="input"
              placeholder="0.00"
            />
          </div>
          <div>
            <label class="label">Quantidade</label>
            <input
              v-model="form.quantity"
              type="number"
              step="0.1"
              min="0.1"
              class="input"
            />
          </div>
        </div>
        <div>
          <label class="label">Data</label>
          <input v-model="form.date" type="date" class="input" />
        </div>
        <div>
          <label class="label">Notas</label>
          <input
            v-model="form.notes"
            type="text"
            class="input"
            placeholder="Opcional…"
          />
        </div>
      </div>
    </FormDialog>

    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="Eliminar registo de preço"
      message="Tem a certeza que quer eliminar este registo de preço?"
      confirm-label="Eliminar"
      :danger="true"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </div>
</template>
