<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PlusIcon, XIcon } from '@lucide/vue'
import { pricesApi, productsApi, supermarketsApi } from '@/api'
import type { PriceRecord, Product, Supermarket } from '@/types'
import { FormDialog, ConfirmDialog } from '@/components/dialogs'
import ProductCombobox from '@/components/ProductCombobox.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import {
  useAsyncAction,
  ASYNC_ACTION_FAILED,
} from '@/composables/useAsyncAction'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

const filterProductObj = ref<Product | null>(null)
const filterSupermarket = ref<number | undefined>(undefined)

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
  supermarketId: '' as number | undefined,
  price: '' as number | '',
  quantity: 1,
  date: today,
  notes: '',
})

const formProductObj = ref<Product | null>(null)

async function searchFormProducts(query: string) {
  return (await productsApi.getAll({ search: query })).data
}

function onFormProductChange() {
  // muda o produto genérico — a variante anterior já não é válida
  form.value.variantId = ''
}

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
      productId: filterProductObj.value?.id,
      supermarketId: filterSupermarket.value,
      limit: PAGE_SIZE,
      offset: page.value * PAGE_SIZE,
    })
  )
  if (result !== ASYNC_ACTION_FAILED) {
    prices.value = result.data
    total.value = result.total
  }
}

async function searchFilterProducts(query: string) {
  return (await productsApi.getAll({ search: query })).data
}

function onFilterProductClear() {
  filterProductObj.value = null
  applyFilters()
}

function clearSupermarketFilter() {
  filterSupermarket.value = undefined
  applyFilters()
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
    supermarketId: undefined,
    price: '',
    quantity: 1,
    date: today,
    notes: '',
  }
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

function goToPage(newPage: number) {
  page.value = newPage
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
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Preços</h1>
        <p class="mt-1 text-gray-500">Registar e gerir preços de produtos</p>
      </div>
      <Button @click="openCreate">
        <PlusIcon class="size-4" />
        Registar Preço
      </Button>
    </div>

    <!-- Filters -->
    <div class="mb-6 flex flex-col gap-3 sm:flex-row">
      <div class="w-full sm:max-w-xs">
        <ProductCombobox
          v-model="filterProductObj"
          :search="searchFilterProducts"
          :item-label="(p) => p.name"
          placeholder="Todos os produtos"
          @update:model-value="applyFilters"
          @clear="onFilterProductClear"
        />
      </div>
      <div class="flex w-full max-w-xs items-center gap-1">
        <Select v-model="filterSupermarket" @update:model-value="applyFilters">
          <SelectTrigger class="w-full">
            <SelectValue placeholder="Todos os supermercados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="s in supermarkets" :key="s.id" :value="s.id">
              {{ s.name }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          v-if="filterSupermarket !== undefined"
          variant="ghost"
          size="icon-sm"
          title="Limpar filtro de supermercado"
          @click="clearSupermarketFilter"
        >
          <XIcon class="size-4" />
        </Button>
      </div>
    </div>

    <!-- Table -->
    <Card class="py-0">
      <div v-if="loading" class="flex h-40 items-center justify-center">
        <Spinner class="size-8 text-brand-600" />
      </div>
      <Alert v-else-if="error || deleteError" variant="destructive" class="m-6">
        <AlertDescription>{{ error || deleteError }}</AlertDescription>
      </Alert>
      <Table v-else>
        <TableHeader>
          <TableRow class="bg-gray-50">
            <TableHead>Produto</TableHead>
            <TableHead>Supermercado</TableHead>
            <TableHead class="text-right">Preço</TableHead>
            <TableHead class="text-right">Qtd.</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Notas</TableHead>
            <TableHead>Utilizador</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="prices.length === 0">
            <TableCell colspan="8" class="py-12 text-center text-gray-400">
              Nenhum registo encontrado
            </TableCell>
          </TableRow>
          <TableRow v-for="price in prices" :key="price.id">
            <TableCell>
              <p class="font-medium text-gray-900">
                {{ price.variant?.product?.name }}
              </p>
              <p v-if="price.variant" class="text-xs text-gray-400">
                {{ formatVariant(price.variant) }}
              </p>
            </TableCell>
            <TableCell class="text-gray-600">
              {{ price.supermarket?.name }}
            </TableCell>
            <TableCell class="text-right font-semibold text-brand-700">
              {{ formatPrice(price.price) }}
            </TableCell>
            <TableCell class="text-right text-gray-500">
              {{ price.quantity }}
            </TableCell>
            <TableCell class="text-gray-500">
              {{ formatDate(price.date) }}
            </TableCell>
            <TableCell class="max-w-32 truncate text-xs text-gray-400">
              {{ price.notes ?? '—' }}
            </TableCell>
            <TableCell>
              <div v-if="price.createdBy" class="text-xs">
                <span class="font-medium text-gray-700">{{
                  price.createdBy.name
                }}</span>
                <span
                  v-if="
                    price.updatedBy && price.updatedBy.id !== price.createdBy.id
                  "
                  class="block text-gray-400"
                >
                  editado por {{ price.updatedBy.name }}
                </span>
              </div>
              <span v-else class="text-xs text-gray-300">—</span>
            </TableCell>
            <TableCell>
              <div class="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" @click="openEdit(price)">Editar</Button>
                <Button
                  variant="destructive"
                  size="sm"
                  data-testid="delete-price"
                  @click="openDeleteConfirm(price)"
                >
                  Eliminar
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <PaginationControls
        v-if="totalPages > 1"
        :page="page"
        :total-pages="totalPages"
        :total="total"
        @update:page="goToPage"
      />
    </Card>

    <FormDialog
      v-model="showModal"
      :title="editingPrice ? 'Editar Preço' : 'Registar Preço'"
      :loading="saving"
      :error="formError"
      size="lg"
      @submit="save"
    >
      <div class="space-y-4">
        <div class="space-y-1.5">
          <Label>Produto *</Label>
          <ProductCombobox
            v-model="formProductObj"
            :search="searchFormProducts"
            :item-label="(p) => p.name"
            placeholder="Pesquisar produto…"
            @update:model-value="onFormProductChange"
          />
        </div>
        <div class="space-y-1.5">
          <Label>Variante (marca) *</Label>
          <Select v-model="form.variantId" :disabled="!formProductObj">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Selecionar variante…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="v in formVariants" :key="v.id" :value="v.id">
                {{ formatVariant(v) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1.5">
          <Label>Supermercado *</Label>
          <Select v-model="form.supermarketId">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Selecionar supermercado…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="s in supermarkets" :key="s.id" :value="s.id">
                {{ s.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <Label>Preço (€) *</Label>
            <Input
              v-model="form.price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </div>
          <div class="space-y-1.5">
            <Label>Quantidade</Label>
            <Input v-model="form.quantity" type="number" step="0.1" min="0.1" />
          </div>
        </div>
        <div class="space-y-1.5">
          <Label>Data</Label>
          <Input v-model="form.date" type="date" />
        </div>
        <div class="space-y-1.5">
          <Label>Notas</Label>
          <Input v-model="form.notes" type="text" placeholder="Opcional…" />
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
