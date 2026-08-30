<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { productsApi, variantsApi } from '@/api'
import type { Product } from '@/types'
import {
  useAsyncAction,
  ASYNC_ACTION_FAILED,
} from '@/composables/useAsyncAction'
import ProductCombobox from '@/components/ProductCombobox.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const products = ref<Product[]>([])
const {
  loading,
  error,
  run: runLoad,
} = useAsyncAction('Erro ao carregar produtos por rever', { immediate: true })

// Alvo de reatribuição, por linha (chave = id do produto placeholder) — cada
// linha tem o seu próprio ProductCombobox, com o seu próprio estado de
// pesquisa/debounce independente.
const reassignTarget = ref<Record<number, Product | null>>({})
const { error: reassignError, run: runReassign } = useAsyncAction(
  'Erro ao reatribuir variante'
)
const { error: reviewError, run: runMarkReviewed } = useAsyncAction(
  'Erro ao marcar como revisto'
)

async function loadProducts() {
  const result = await runLoad(() => productsApi.getAll({ needsReview: true }))
  if (result !== ASYNC_ACTION_FAILED) products.value = result.data
}

onMounted(loadProducts)

async function searchTarget(productId: number, query: string) {
  const { data } = await productsApi.getAll({ search: query })
  // não faz sentido reatribuir um placeholder para si próprio
  return data.filter((p) => p.id !== productId)
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
      <p class="mt-1 text-gray-500">
        Produtos criados automaticamente pela importação de faturas — reatribui
        a variante para um produto já existente ou marca como revisto se o nome
        já estiver correto.
      </p>
    </div>

    <Card class="py-0">
      <div v-if="loading" class="flex h-40 items-center justify-center">
        <Spinner class="size-8 text-brand-600" />
      </div>
      <Alert v-else-if="error" variant="destructive" class="m-6">
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>
      <div v-else-if="products.length === 0" class="py-12 text-center text-gray-400">
        Não há produtos por rever de momento.
      </div>
      <Table v-else>
        <TableHeader>
          <TableRow class="bg-gray-50">
            <TableHead>Nome (texto da fatura)</TableHead>
            <TableHead>Variante</TableHead>
            <TableHead>Reatribuir para</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="product in products" :key="product.id">
            <TableCell class="font-medium text-gray-900">
              {{ product.name }}
            </TableCell>
            <TableCell class="text-gray-500">
              {{ formatVariant(product) }}
            </TableCell>
            <TableCell>
              <div class="w-64">
                <ProductCombobox
                  v-model="reassignTarget[product.id]"
                  :search="(q) => searchTarget(product.id, q)"
                  :item-label="(p) => p.name"
                  placeholder="Pesquisar produto existente..."
                />
              </div>
            </TableCell>
            <TableCell>
              <div class="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="reassign-button"
                  :disabled="!reassignTarget[product.id]"
                  @click="reassign(product)"
                >
                  Reatribuir
                </Button>
                <Button size="sm" data-testid="mark-reviewed-button" @click="markReviewed(product)">
                  Marcar como revisto
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>

    <Alert v-if="reassignError || reviewError" variant="destructive" class="mt-4">
      <AlertDescription>{{ reassignError || reviewError }}</AlertDescription>
    </Alert>
  </div>
</template>
