<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ScaleIcon } from '@lucide/vue'
import { pricesApi, productsApi, supermarketsApi } from '@/api'
import type { Product, Supermarket, CompareResult, PriceHistory } from '@/types'
import {
  useAsyncAction,
  ASYNC_ACTION_FAILED,
} from '@/composables/useAsyncAction'
import ProductCombobox from '@/components/ProductCombobox.vue'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'

const supermarkets = ref<Supermarket[]>([])
const selectedProductObj = ref<Product | null>(null)
const selectedVariant = ref<number | undefined>(undefined)
const selectedSupermarkets = ref<number[]>([])

async function searchProducts(query: string) {
  return (await productsApi.getAll({ search: query })).data
}

function toggleSupermarket(id: number, checked: boolean | 'indeterminate') {
  selectedSupermarkets.value = checked
    ? [...selectedSupermarkets.value, id]
    : selectedSupermarkets.value.filter((x) => x !== id)
}

// Variantes do produto selecionado — já vêm incluídas em productsApi.getAll().
const variantsOfSelected = computed(
  () => selectedProductObj.value?.variants ?? []
)

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

const compareResult = ref<CompareResult | null>(null)
const historyResult = ref<PriceHistory | null>(null)
const {
  loading,
  error: compareError,
  run: runCompare,
} = useAsyncAction('Erro ao comparar preços')
const {
  loading: loadingHistory,
  error: historyError,
  run: runHistory,
} = useAsyncAction('Erro ao carregar o histórico de preços')
const activeTab = ref<'compare' | 'history'>('compare')

onMounted(async () => {
  supermarkets.value = await supermarketsApi.getAll()
})

async function loadCompare() {
  if (!selectedProductObj.value) return
  const result = await runCompare(() =>
    pricesApi.compare(selectedProductObj.value!.id)
  )
  if (result !== ASYNC_ACTION_FAILED) compareResult.value = result
}

async function loadHistory() {
  if (!selectedVariant.value) return
  const result = await runHistory(() =>
    pricesApi.history(
      selectedVariant.value!,
      selectedSupermarkets.value.length ? selectedSupermarkets.value : undefined
    )
  )
  if (result !== ASYNC_ACTION_FAILED) historyResult.value = result
}

watch(selectedProductObj, () => {
  compareResult.value = null
  historyResult.value = null
  selectedVariant.value = undefined
  selectedSupermarkets.value = []
  compareError.value = ''
  historyError.value = ''
  if (selectedProductObj.value) loadCompare()
})

watch(selectedVariant, () => {
  historyResult.value = null
  historyError.value = ''
  if (selectedVariant.value) loadHistory()
})

watch(selectedSupermarkets, () => {
  if (selectedVariant.value) loadHistory()
})

function formatPrice(price: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
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

// Paleta categórica do tema (`--chart-1..5` em `style.css`), com tons próprios
// para claro/escuro — não usar cores Tailwind fixas aqui, ficariam ilegíveis
// num dos dois temas.
const COLORS = [
  'text-chart-1',
  'text-chart-2',
  'text-chart-3',
  'text-chart-4',
  'text-chart-5',
]
const BG_COLORS = [
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
]
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-foreground">Comparar Preços</h1>
      <p class="mt-1 text-muted-foreground">
        Compare preços de um produto entre marcas/supermercados e veja a
        evolução
      </p>
    </div>

    <!-- Product selector -->
    <Card class="mb-6 p-6">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <Label>Produto</Label>
          <ProductCombobox
            v-model="selectedProductObj"
            :search="searchProducts"
            :item-label="(p) => p.name"
            placeholder="Pesquisar produto…"
          />
        </div>
        <div v-if="selectedProductObj" class="space-y-1.5">
          <Label>Variante (para o histórico)</Label>
          <Select v-model="selectedVariant">
            <SelectTrigger class="w-full" data-testid="variant-select-trigger">
              <SelectValue placeholder="Selecionar variante…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="v in variantsOfSelected"
                :key="v.id"
                :value="v.id"
                :data-testid="`variant-option-${v.id}`"
              >
                {{ formatVariant(v) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div v-if="selectedVariant" class="mt-4 space-y-1.5">
        <Label>Filtrar supermercados (histórico)</Label>
        <div class="flex flex-wrap gap-4">
          <Label
            v-for="s in supermarkets"
            :key="s.id"
            class="cursor-pointer gap-1.5 text-sm font-normal"
          >
            <Checkbox
              :model-value="selectedSupermarkets.includes(s.id)"
              @update:model-value="toggleSupermarket(s.id, $event)"
            />
            {{ s.name }}
          </Label>
        </div>
      </div>
    </Card>

    <Alert v-if="compareError || historyError" variant="destructive" class="mb-6">
      <AlertDescription>{{ compareError || historyError }}</AlertDescription>
    </Alert>

    <Card v-if="!selectedProductObj" class="p-16 text-center text-muted-foreground">
      <ScaleIcon class="mx-auto mb-3 size-12 opacity-30" stroke-width="1.5" />
      <p>Seleciona um produto para comparar preços</p>
    </Card>

    <Tabs v-else v-model="activeTab">
      <TabsList class="mb-6">
        <TabsTrigger value="compare">Comparação Atual</TabsTrigger>
        <TabsTrigger value="history">Histórico de Preços</TabsTrigger>
      </TabsList>

      <!-- Compare tab -->
      <TabsContent value="compare">
        <div v-if="loading" class="flex h-40 items-center justify-center">
          <Spinner class="size-8 text-primary" />
        </div>
        <div v-else-if="compareResult">
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-foreground">
              {{ compareResult.product.name }}
            </h2>
            <p class="text-sm text-muted-foreground">
              Melhor preço por supermercado/marca — o mais barato primeiro
            </p>
          </div>

          <Card v-if="compareResult.prices.length === 0" class="p-10 text-center text-muted-foreground">
            Nenhum preço registado para este produto
          </Card>

          <div v-else class="space-y-3">
            <Card
              v-for="(price, index) in compareResult.prices"
              :key="price.id"
              class="flex-row items-center justify-between gap-6 p-5"
              :class="index === 0 ? 'ring-2 ring-primary' : ''"
            >
              <div class="flex items-center gap-4">
                <div
                  class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  :class="
                    index === 0
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  "
                >
                  {{ index + 1 }}
                </div>
                <div>
                  <p class="font-semibold text-foreground">
                    {{ price.supermarket?.name }}
                  </p>
                  <p v-if="price.variant" class="text-xs text-muted-foreground">
                    {{ formatVariant(price.variant) }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    Registado em {{ formatDate(price.date) }}
                  </p>
                  <p v-if="price.notes" class="text-xs text-muted-foreground">
                    {{ price.notes }}
                  </p>
                </div>
              </div>
              <div class="text-right">
                <p
                  class="text-2xl font-bold"
                  :class="index === 0 ? 'text-primary' : 'text-foreground'"
                >
                  {{ formatPrice(price.price) }}
                </p>
                <p
                  v-if="index === 0"
                  class="mt-0.5 text-xs font-medium text-primary"
                >
                  mais barato
                </p>
                <p v-else class="mt-0.5 text-xs text-destructive">
                  +{{
                    formatPrice(price.price - compareResult!.prices[0].price)
                  }}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </TabsContent>

      <!-- History tab -->
      <TabsContent value="history">
        <Card v-if="!selectedVariant" class="p-10 text-center text-muted-foreground">
          Seleciona uma variante para ver o histórico de preços
        </Card>
        <div v-else-if="loadingHistory" class="flex h-40 items-center justify-center">
          <Spinner class="size-8 text-primary" />
        </div>
        <div v-else-if="historyResult">
          <Card v-if="historyResult.history.length === 0" class="p-10 text-center text-muted-foreground">
            Nenhum histórico disponível
          </Card>
          <div v-else class="space-y-6">
            <Card
              v-for="(group, gi) in historyResult.history"
              :key="group.supermarket.id"
              class="py-0"
            >
              <div class="flex items-center gap-3 border-b px-6 py-4">
                <div
                  class="h-3 w-3 rounded-full"
                  :class="BG_COLORS[gi % BG_COLORS.length]"
                ></div>
                <h3 class="font-semibold text-foreground">
                  {{ group.supermarket.name }}
                </h3>
                <span class="text-sm text-muted-foreground"
                  >{{ group.records.length }} registos</span
                >
              </div>
              <div class="space-y-2 p-4">
                <div
                  v-for="record in [...group.records].reverse()"
                  :key="record.date"
                  class="flex items-center gap-4"
                >
                  <span class="w-24 flex-shrink-0 text-xs text-muted-foreground">{{
                    formatDate(record.date)
                  }}</span>
                  <div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      class="h-2 rounded-full transition-all"
                      :class="BG_COLORS[gi % BG_COLORS.length]"
                      :style="{
                        width:
                          getPriceBarWidth(
                            record.price,
                            group.records.map((r) => r.price)
                          ) + '%',
                      }"
                    ></div>
                  </div>
                  <span
                    class="w-16 text-right text-sm font-semibold"
                    :class="COLORS[gi % COLORS.length]"
                  >
                    {{ formatPrice(record.price) }}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</template>
