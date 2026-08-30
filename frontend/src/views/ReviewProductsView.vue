<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { productsApi, variantsApi } from '@/api'
import type { Product } from '@/types'
import {
  useAsyncAction,
  ASYNC_ACTION_FAILED,
} from '@/composables/useAsyncAction'

const products = ref<Product[]>([])
const {
  loading,
  error,
  run: runLoad,
} = useAsyncAction('Erro ao carregar produtos por rever', { immediate: true })

// Pesquisa de produto destino, por linha (chave = id do produto placeholder)
const reassignQuery = ref<Record<number, string>>({})
const reassignResults = ref<Record<number, Product[]>>({})
const reassignTarget = ref<Record<number, Product | null>>({})
const { error: reassignError, run: runReassign } = useAsyncAction(
  'Erro ao reatribuir variante'
)
const { error: reviewError, run: runMarkReviewed } = useAsyncAction(
  'Erro ao marcar como revisto'
)

let searchDebounce: ReturnType<typeof setTimeout> | undefined

async function loadProducts() {
  const result = await runLoad(() => productsApi.getAll({ needsReview: true }))
  if (result !== ASYNC_ACTION_FAILED) products.value = result.data
}

onMounted(loadProducts)

function searchTarget(productId: number) {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(async () => {
    const query = reassignQuery.value[productId]?.trim()
    if (!query) {
      reassignResults.value = { ...reassignResults.value, [productId]: [] }
      return
    }
    const { data } = await productsApi.getAll({ search: query })
    // não faz sentido reatribuir um placeholder para si próprio
    reassignResults.value = {
      ...reassignResults.value,
      [productId]: data.filter((p) => p.id !== productId),
    }
  }, 300)
}

function selectTarget(productId: number, target: Product) {
  reassignTarget.value = { ...reassignTarget.value, [productId]: target }
  reassignQuery.value = { ...reassignQuery.value, [productId]: target.name }
  reassignResults.value = { ...reassignResults.value, [productId]: [] }
}

async function reassign(product: Product) {
  const target = reassignTarget.value[product.id]
  const variant = product.variants?.[0]
  if (!target || !variant) return

  const result = await runReassign(() =>
    variantsApi.reassign(variant.id, target.id)
  )
  if (result !== ASYNC_ACTION_FAILED) {
    await loadProducts()
  }
}

async function markReviewed(product: Product) {
  const result = await runMarkReviewed(() =>
    productsApi.markReviewed(product.id)
  )
  if (result !== ASYNC_ACTION_FAILED) {
    await loadProducts()
  }
}

function formatVariant(product: Product) {
  const variant = product.variants?.[0]
  if (!variant) return '—'
  const size = variant.packageSize
    ? `${variant.packageSize}${variant.unit}`
    : variant.unit
  const label = variant.packCount ? `${variant.packCount}×${size}` : size
  return variant.brand ? `${variant.brand} ${label}` : `Genérico ${label}`
}
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Produtos por rever</h1>
      <p class="text-gray-500 mt-1">
        Produtos criados automaticamente pela importação de faturas — reatribui
        a variante para um produto já existente ou marca como revisto se o nome
        já estiver correto.
      </p>
    </div>

    <div class="card overflow-hidden">
      <div v-if="loading" class="flex items-center justify-center h-40">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"
        ></div>
      </div>
      <div
        v-else-if="error"
        class="bg-red-50 border border-red-200 rounded-lg p-4 m-6 text-red-700 text-sm"
      >
        {{ error }}
      </div>
      <div
        v-else-if="products.length === 0"
        class="text-center py-12 text-gray-400"
      >
        Não há produtos por rever de momento.
      </div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="text-left px-6 py-3 font-medium text-gray-500">
              Nome (texto da fatura)
            </th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">
              Variante
            </th>
            <th class="text-left px-6 py-3 font-medium text-gray-500">
              Reatribuir para
            </th>
            <th class="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="product in products" :key="product.id">
            <td class="px-6 py-4 font-medium text-gray-900">
              {{ product.name }}
            </td>
            <td class="px-6 py-4 text-gray-500">
              {{ formatVariant(product) }}
            </td>
            <td class="px-6 py-4 relative">
              <input
                v-model="reassignQuery[product.id]"
                type="text"
                class="input"
                placeholder="Pesquisar produto existente..."
                @input="searchTarget(product.id)"
              />
              <ul
                v-if="reassignResults[product.id]?.length"
                class="absolute z-10 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
              >
                <li
                  v-for="candidate in reassignResults[product.id]"
                  :key="candidate.id"
                  class="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                  @click="selectTarget(product.id, candidate)"
                >
                  {{ candidate.name }}
                </li>
              </ul>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end gap-2">
                <button
                  class="btn-secondary btn-sm"
                  :disabled="!reassignTarget[product.id]"
                  @click="reassign(product)"
                >
                  Reatribuir
                </button>
                <button
                  class="btn-primary btn-sm"
                  @click="markReviewed(product)"
                >
                  Marcar como revisto
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="reassignError || reviewError" class="text-sm text-red-600 mt-4">
      {{ reassignError || reviewError }}
    </p>
  </div>
</template>
