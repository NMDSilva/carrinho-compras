<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { pricesApi, productsApi, supermarketsApi } from '@/api'
import type { Product, Supermarket, CompareResult, PriceHistory } from '@/types'
import { extractApiError } from '@/utils/errors'

const products = ref<Product[]>([])
const supermarkets = ref<Supermarket[]>([])
const selectedProduct = ref<number | ''>('')
const selectedSupermarkets = ref<number[]>([])

const compareResult = ref<CompareResult | null>(null)
const historyResult = ref<PriceHistory | null>(null)
const loading = ref(false)
const loadingHistory = ref(false)
const error = ref('')
const activeTab = ref<'compare' | 'history'>('compare')

onMounted(async () => {
  await Promise.all([
    productsApi.getAll().then((p) => (products.value = p)),
    supermarketsApi.getAll().then((s) => (supermarkets.value = s)),
  ])
})

async function loadCompare() {
  if (!selectedProduct.value) return
  loading.value = true
  try {
    compareResult.value = await pricesApi.compare(Number(selectedProduct.value))
  } catch (e: unknown) {
    error.value = extractApiError(e, 'Erro ao comparar preços')
  } finally {
    loading.value = false
  }
}

async function loadHistory() {
  if (!selectedProduct.value) return
  loadingHistory.value = true
  try {
    historyResult.value = await pricesApi.history(
      Number(selectedProduct.value),
      selectedSupermarkets.value.length ? selectedSupermarkets.value : undefined
    )
  } catch (e: unknown) {
    error.value = extractApiError(e, 'Erro ao carregar o histórico de preços')
  } finally {
    loadingHistory.value = false
  }
}

watch(selectedProduct, () => {
  compareResult.value = null
  historyResult.value = null
  selectedSupermarkets.value = []
  error.value = ''
  if (selectedProduct.value) {
    loadCompare()
    loadHistory()
  }
})

watch(selectedSupermarkets, () => {
  if (selectedProduct.value) loadHistory()
})

function formatPrice(price: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(price)
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-PT').format(new Date(date))
}

// Simple sparkline-like bar chart for price history
function getPriceBarWidth(price: number, allPrices: number[]) {
  const min = Math.min(...allPrices)
  const max = Math.max(...allPrices)
  if (max === min) return 50
  return Math.round(((price - min) / (max - min)) * 60 + 20)
}

const COLORS = ['text-brand-600', 'text-blue-600', 'text-purple-600', 'text-orange-600', 'text-red-600']
const BG_COLORS = ['bg-brand-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500']
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Comparar Preços</h1>
      <p class="text-gray-500 mt-1">Compare preços de um produto entre supermercados e veja a evolução</p>
    </div>

    <!-- Product selector -->
    <div class="card p-6 mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="label">Produto</label>
          <select v-model="selectedProduct" class="input">
            <option value="">Selecionar produto…</option>
            <option v-for="p in products" :key="p.id" :value="p.id">
              {{ p.name }}{{ p.brand ? ` (${p.brand})` : '' }} — {{ p.unit }}
            </option>
          </select>
        </div>
        <div v-if="selectedProduct">
          <label class="label">Filtrar supermercados (histórico)</label>
          <div class="flex flex-wrap gap-2 mt-1">
            <label
              v-for="s in supermarkets"
              :key="s.id"
              class="inline-flex items-center gap-1.5 cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                :value="s.id"
                v-model="selectedSupermarkets"
                class="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              {{ s.name }}
            </label>
          </div>
        </div>
      </div>
    </div>

    <div v-if="error" class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
      {{ error }}
    </div>

    <div v-if="!selectedProduct" class="card p-16 text-center text-gray-400">
      <svg class="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
      <p>Seleciona um produto para comparar preços</p>
    </div>

    <div v-else>
      <!-- Tabs -->
      <div class="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        <button
          @click="activeTab = 'compare'"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          :class="activeTab === 'compare' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
        >
          Comparação Atual
        </button>
        <button
          @click="activeTab = 'history'"
          class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          :class="activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
        >
          Histórico de Preços
        </button>
      </div>

      <!-- Compare tab -->
      <div v-if="activeTab === 'compare'">
        <div v-if="loading" class="flex items-center justify-center h-40">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
        <div v-else-if="compareResult">
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-gray-900">
              {{ compareResult.product.name }}
              <span v-if="compareResult.product.brand" class="text-gray-400 font-normal">· {{ compareResult.product.brand }}</span>
            </h2>
            <p class="text-sm text-gray-500">Último preço registado por supermercado</p>
          </div>

          <div v-if="compareResult.prices.length === 0" class="card p-10 text-center text-gray-400">
            Nenhum preço registado para este produto
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="(price, index) in compareResult.prices"
              :key="price.id"
              class="card p-5 flex items-center justify-between gap-6"
              :class="index === 0 ? 'ring-2 ring-brand-500' : ''"
            >
              <div class="flex items-center gap-4">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  :class="index === 0 ? 'bg-brand-500' : index === 1 ? 'bg-gray-300' : 'bg-gray-200'"
                >
                  {{ index + 1 }}
                </div>
                <div>
                  <p class="font-semibold text-gray-900">{{ price.supermarket?.name }}</p>
                  <p class="text-xs text-gray-400">Registado em {{ formatDate(price.date) }}</p>
                  <p v-if="price.notes" class="text-xs text-gray-400">{{ price.notes }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-2xl font-bold" :class="index === 0 ? 'text-brand-600' : 'text-gray-700'">
                  {{ formatPrice(price.price) }}
                </p>
                <p v-if="index === 0" class="text-xs font-medium text-brand-600 mt-0.5">mais barato</p>
                <p v-else class="text-xs text-red-500 mt-0.5">
                  +{{ formatPrice(price.price - compareResult!.prices[0].price) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- History tab -->
      <div v-if="activeTab === 'history'">
        <div v-if="loadingHistory" class="flex items-center justify-center h-40">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
        <div v-else-if="historyResult">
          <div v-if="historyResult.history.length === 0" class="card p-10 text-center text-gray-400">
            Nenhum histórico disponível
          </div>
          <div v-else class="space-y-6">
            <div
              v-for="(group, gi) in historyResult.history"
              :key="group.supermarket.id"
              class="card overflow-hidden"
            >
              <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div class="w-3 h-3 rounded-full" :class="BG_COLORS[gi % BG_COLORS.length]"></div>
                <h3 class="font-semibold text-gray-900">{{ group.supermarket.name }}</h3>
                <span class="text-sm text-gray-400">{{ group.records.length }} registos</span>
              </div>
              <div class="p-4 space-y-2">
                <div
                  v-for="record in [...group.records].reverse()"
                  :key="record.date"
                  class="flex items-center gap-4"
                >
                  <span class="text-xs text-gray-400 w-24 flex-shrink-0">{{ formatDate(record.date) }}</span>
                  <div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      class="h-2 rounded-full transition-all"
                      :class="BG_COLORS[gi % BG_COLORS.length]"
                      :style="{ width: getPriceBarWidth(record.price, group.records.map(r => r.price)) + '%' }"
                    ></div>
                  </div>
                  <span class="text-sm font-semibold w-16 text-right" :class="COLORS[gi % COLORS.length]">
                    {{ formatPrice(record.price) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
