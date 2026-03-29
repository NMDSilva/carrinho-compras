<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { pricesApi, productsApi, supermarketsApi } from '@/api'
import type { PriceRecord, Product, Supermarket } from '@/types'

const prices = ref<PriceRecord[]>([])
const products = ref<Product[]>([])
const supermarkets = ref<Supermarket[]>([])
const loading = ref(true)
const total = ref(0)
const page = ref(0)
const PAGE_SIZE = 15

const filterProduct = ref<number | ''>('')
const filterSupermarket = ref<number | ''>('')

const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const editingPrice = ref<PriceRecord | null>(null)

const today = new Date().toISOString().substring(0, 10)
const form = ref({
  productId: '' as number | '',
  supermarketId: '' as number | '',
  price: '' as number | '',
  quantity: 1,
  date: today,
  notes: '',
})

const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE))

async function loadPrices() {
  loading.value = true
  try {
    const result = await pricesApi.getAll({
      productId: filterProduct.value !== '' ? Number(filterProduct.value) : undefined,
      supermarketId: filterSupermarket.value !== '' ? Number(filterSupermarket.value) : undefined,
      limit: PAGE_SIZE,
      offset: page.value * PAGE_SIZE,
    })
    prices.value = result.data
    total.value = result.total
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    productsApi.getAll().then((p) => (products.value = p)),
    supermarketsApi.getAll().then((s) => (supermarkets.value = s)),
    loadPrices(),
  ])
})

function openCreate() {
  editingPrice.value = null
  form.value = { productId: '', supermarketId: '', price: '', quantity: 1, date: today, notes: '' }
  formError.value = ''
  showModal.value = true
}

function openEdit(price: PriceRecord) {
  editingPrice.value = price
  form.value = {
    productId: price.productId,
    supermarketId: price.supermarketId,
    price: price.price,
    quantity: price.quantity,
    date: price.date.substring(0, 10),
    notes: price.notes ?? '',
  }
  formError.value = ''
  showModal.value = true
}

async function save() {
  if (!form.value.productId || !form.value.supermarketId || form.value.price === '') {
    formError.value = 'Produto, supermercado e preço são obrigatórios'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const data = {
      productId: Number(form.value.productId),
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
    showModal.value = false
    await loadPrices()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    formError.value = err.response?.data?.error ?? 'Erro ao guardar'
  } finally {
    saving.value = false
  }
}

async function deletePrice(price: PriceRecord) {
  if (!confirm('Eliminar este registo de preço?')) return
  await pricesApi.delete(price.id)
  await loadPrices()
}

function applyFilters() {
  page.value = 0
  loadPrices()
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(price)
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
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Registar Preço
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3 mb-6">
      <select v-model="filterProduct" @change="applyFilters" class="input max-w-xs">
        <option value="">Todos os produtos</option>
        <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}{{ p.brand ? ` (${p.brand})` : '' }}</option>
      </select>
      <select v-model="filterSupermarket" @change="applyFilters" class="input max-w-xs">
        <option value="">Todos os supermercados</option>
        <option v-for="s in supermarkets" :key="s.id" :value="s.id">{{ s.name }}</option>
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
            <th class="text-left px-6 py-3 font-medium text-gray-500">Produto</th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">Supermercado</th>
            <th class="text-right px-6 py-3 font-medium text-gray-500">Preço</th>
            <th class="text-right px-6 py-3 font-medium text-gray-500">Qtd.</th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">Data</th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">Notas</th>
            <th class="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-if="prices.length === 0">
            <td colspan="7" class="text-center py-12 text-gray-400">Nenhum registo encontrado</td>
          </tr>
          <tr v-for="price in prices" :key="price.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4">
              <p class="font-medium text-gray-900">{{ price.product?.name }}</p>
              <p v-if="price.product?.brand" class="text-xs text-gray-400">{{ price.product.brand }}</p>
            </td>
            <td class="px-6 py-4 text-gray-600">{{ price.supermarket?.name }}</td>
            <td class="px-6 py-4 text-right font-semibold text-brand-700">{{ formatPrice(price.price) }}</td>
            <td class="px-6 py-4 text-right text-gray-500">{{ price.quantity }}</td>
            <td class="px-6 py-4 text-gray-500">{{ formatDate(price.date) }}</td>
            <td class="px-6 py-4 text-gray-400 text-xs max-w-32 truncate">{{ price.notes ?? '—' }}</td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end gap-2">
                <button @click="openEdit(price)" class="btn-secondary btn-sm">Editar</button>
                <button @click="deletePrice(price)" class="btn-danger btn-sm">Eliminar</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
        <span>{{ total }} registos</span>
        <div class="flex items-center gap-2">
          <button class="btn-secondary btn-sm" :disabled="page === 0" @click="page--; loadPrices()">Anterior</button>
          <span>{{ page + 1 }} / {{ totalPages }}</span>
          <button class="btn-secondary btn-sm" :disabled="page + 1 >= totalPages" @click="page++; loadPrices()">Seguinte</button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40" @click="showModal = false"></div>
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-5">
            {{ editingPrice ? 'Editar Preço' : 'Registar Preço' }}
          </h2>
          <div class="space-y-4">
            <div>
              <label class="label">Produto *</label>
              <select v-model="form.productId" class="input">
                <option value="">Selecionar produto…</option>
                <option v-for="p in products" :key="p.id" :value="p.id">
                  {{ p.name }}{{ p.brand ? ` (${p.brand})` : '' }} — {{ p.unit }}
                </option>
              </select>
            </div>
            <div>
              <label class="label">Supermercado *</label>
              <select v-model="form.supermarketId" class="input">
                <option value="">Selecionar supermercado…</option>
                <option v-for="s in supermarkets" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="label">Preço (€) *</label>
                <input v-model="form.price" type="number" step="0.01" min="0" class="input" placeholder="0.00" />
              </div>
              <div>
                <label class="label">Quantidade</label>
                <input v-model="form.quantity" type="number" step="0.1" min="0.1" class="input" />
              </div>
            </div>
            <div>
              <label class="label">Data</label>
              <input v-model="form.date" type="date" class="input" />
            </div>
            <div>
              <label class="label">Notas</label>
              <input v-model="form.notes" type="text" class="input" placeholder="Opcional…" />
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
