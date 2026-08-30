<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { productsApi, variantsApi } from '@/api'
import { useRoute, useRouter } from 'vue-router'
import { ChevronRightIcon, PlusIcon, XIcon } from '@lucide/vue'
import type { Product, ProductVariant } from '@/types'
import { FormDialog, ConfirmDialog } from '@/components/dialogs'
import ProductCombobox from '@/components/ProductCombobox.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import {
  useAsyncAction,
  ASYNC_ACTION_FAILED,
} from '@/composables/useAsyncAction'
import { Badge } from '@/components/ui/badge'
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

const products = ref<Product[]>([])
const categories = ref<string[]>([])
const search = ref('')
const filterCategory = ref<string | undefined>(undefined)
const expanded = ref<Set<number>>(new Set())
const total = ref(0)
const page = ref(0)
const PAGE_SIZE = 20
const {
  loading,
  error,
  run: runLoad,
} = useAsyncAction('Erro ao carregar produtos', { immediate: true })

function applyFilters() {
  page.value = 0
  loadProducts()
}

function clearCategoryFilter() {
  filterCategory.value = undefined
  applyFilters()
}

let searchDebounce: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(applyFilters, 300)
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
const variantForm = ref({
  brand: '',
  packageSize: '',
  packCount: '',
  unit: 'un',
})
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
const reassignTarget = ref<Product | null>(null)
const {
  loading: reassigning,
  error: reassignError,
  run: runReassign,
} = useAsyncAction('Erro ao mover variante')

async function searchReassignTarget(query: string) {
  const { data } = await productsApi.getAll({ search: query })
  // não faz sentido mover a variante para o mesmo produto onde já está
  return data.filter((p) => p.id !== reassignSource.value?.productId)
}

const route = useRoute()
const router = useRouter()

const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE))

async function loadProducts() {
  const result = await runLoad(() =>
    productsApi.getAll({
      search: search.value || undefined,
      category: filterCategory.value,
      limit: PAGE_SIZE,
      offset: page.value * PAGE_SIZE,
    })
  )
  if (result !== ASYNC_ACTION_FAILED) {
    products.value = result.data
    total.value = result.total
  }
}

function goToPage(newPage: number) {
  page.value = newPage
  loadProducts()
}

async function loadCategories() {
  categories.value = await productsApi.getCategories()
}

onMounted(async () => {
  await Promise.all([loadProducts(), loadCategories()])

  if (route.params.id) {
    try {
      const product = await productsApi.getById(Number(route.params.id))
      openEdit(product)
    } catch {
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
      packCount: variantForm.value.packCount
        ? Number(variantForm.value.packCount)
        : null,
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
  reassignTarget.value = null
  reassignError.value = ''
  showReassignModal.value = true
}

async function confirmReassign() {
  if (!reassignSource.value || !reassignTarget.value) {
    reassignError.value = 'Escolhe o produto de destino'
    return
  }
  const source = reassignSource.value
  const target = reassignTarget.value
  const result = await runReassign(() =>
    variantsApi.reassign(source.id, target.id)
  )
  if (result !== ASYNC_ACTION_FAILED) {
    showReassignModal.value = false
    await loadProducts()
  }
}
</script>

<template>
  <div>
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Produtos</h1>
        <p class="mt-1 text-gray-500">
          Gerir produtos e as suas variantes (marca/embalagem)
        </p>
      </div>
      <Button @click="openCreate">
        <PlusIcon class="size-4" />
        Novo Produto
      </Button>
    </div>

    <!-- Filters -->
    <div class="mb-6 flex flex-col gap-3 sm:flex-row">
      <Input
        v-model="search"
        type="text"
        placeholder="Pesquisar produto..."
        class="max-w-xs"
      />
      <div class="flex w-full max-w-xs items-center gap-1">
        <Select v-model="filterCategory" @update:model-value="applyFilters">
          <SelectTrigger class="w-full">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="cat in categories" :key="cat" :value="cat">
              {{ cat }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          v-if="filterCategory !== undefined"
          variant="ghost"
          size="icon-sm"
          title="Limpar filtro de categoria"
          @click="clearCategoryFilter"
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
            <TableHead class="w-8" />
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead class="text-right">Variantes</TableHead>
            <TableHead>Registado por</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="products.length === 0">
            <TableCell colspan="6" class="py-12 text-center text-gray-400">
              Nenhum produto encontrado
            </TableCell>
          </TableRow>
          <template v-for="product in products" :key="product.id">
            <TableRow class="cursor-pointer" @click="toggleExpanded(product.id)">
              <TableCell class="pl-6 text-gray-400">
                <ChevronRightIcon
                  class="size-4 transition-transform"
                  :class="{ 'rotate-90': expanded.has(product.id) }"
                />
              </TableCell>
              <TableCell class="font-medium text-gray-900">
                {{ product.name }}
                <Badge
                  v-if="product.needsReview"
                  variant="outline"
                  class="ml-2 border-yellow-200 bg-yellow-100 text-yellow-800"
                >
                  Por rever
                </Badge>
              </TableCell>
              <TableCell class="text-gray-500">
                {{ product.category ?? '—' }}
              </TableCell>
              <TableCell class="text-right text-gray-500">
                {{ product.variants?.length ?? 0 }}
              </TableCell>
              <TableCell>
                <div v-if="product.createdBy" class="text-xs">
                  <span class="font-medium text-gray-700">{{
                    product.createdBy.name
                  }}</span>
                  <span
                    v-if="
                      product.updatedBy &&
                      product.updatedBy.id !== product.createdBy.id
                    "
                    class="block text-gray-400"
                  >
                    editado por {{ product.updatedBy.name }}
                  </span>
                </div>
                <span v-else class="text-xs text-gray-300">—</span>
              </TableCell>
              <TableCell @click.stop>
                <div class="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" @click="openEdit(product)">
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    data-testid="delete-product"
                    @click="openDeleteConfirm(product)"
                  >
                    Eliminar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="expanded.has(product.id)">
              <TableCell colspan="6" class="bg-gray-50">
                <div class="mb-3 flex items-center justify-between">
                  <h3 class="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                    Variantes
                  </h3>
                  <Button variant="outline" size="sm" @click="openCreateVariant(product.id)">
                    Nova variante
                  </Button>
                </div>
                <Table
                  v-if="product.variants && product.variants.length > 0"
                  class="rounded-lg border border-gray-100 bg-white"
                >
                  <TableHeader>
                    <TableRow class="bg-gray-50">
                      <TableHead>Marca</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead class="text-right">Preços</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="variant in product.variants" :key="variant.id">
                      <TableCell class="text-gray-900">
                        {{ variant.brand ?? '—' }}
                      </TableCell>
                      <TableCell class="text-gray-500">
                        <span v-if="variant.packageSize == null">—</span>
                        <span v-else-if="variant.packCount"
                          >{{ variant.packCount }} ×
                          {{ variant.packageSize }}</span
                        >
                        <span v-else>{{ variant.packageSize }}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" class="border-blue-200 bg-blue-100 text-blue-800">
                          {{ variant.unit }}
                        </Badge>
                      </TableCell>
                      <TableCell class="text-right text-gray-500">
                        {{ variant._count?.prices ?? 0 }}
                      </TableCell>
                      <TableCell>
                        <div class="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            @click="openEditVariant(product.id, variant)"
                          >
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" @click="openReassign(variant)">
                            Mover
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            @click="openVariantDeleteConfirm(variant)"
                          >
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <p v-else class="text-sm text-gray-400">
                  Ainda sem variantes — cria a primeira acima.
                </p>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>

      <PaginationControls
        v-if="totalPages > 1"
        :page="page"
        :total-pages="totalPages"
        :total="total"
        item-label="produtos"
        @update:page="goToPage"
      />
    </Card>

    <FormDialog
      v-model="showModal"
      :title="editingProduct ? 'Editar Produto' : 'Novo Produto'"
      :loading="saving"
      :error="formError"
      @submit="saveProduct"
    >
      <div class="space-y-4">
        <div class="space-y-1.5">
          <Label>Nome *</Label>
          <Input v-model="form.name" type="text" placeholder="ex: Açúcar branco" />
        </div>
        <div class="space-y-1.5">
          <Label>Categoria</Label>
          <Input v-model="form.category" type="text" list="cats" placeholder="ex: Mercearia" />
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
        <div class="space-y-1.5">
          <Label>Marca</Label>
          <Input v-model="variantForm.brand" type="text" placeholder="ex: Sidul" />
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div class="space-y-1.5">
            <Label>Embalagens</Label>
            <Input
              v-model="variantForm.packCount"
              type="number"
              step="1"
              min="1"
              placeholder="ex: 3"
            />
          </div>
          <div class="space-y-1.5">
            <Label>Tamanho</Label>
            <Input
              v-model="variantForm.packageSize"
              type="number"
              step="0.01"
              placeholder="ex: 1"
            />
          </div>
          <div class="space-y-1.5">
            <Label>Unidade *</Label>
            <Select v-model="variantForm.unit">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="unit in UNITS" :key="unit" :value="unit">
                  {{ unit }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </FormDialog>

    <ConfirmDialog
      v-model="showVariantDeleteConfirm"
      title="Eliminar variante"
      message="Eliminar esta variante? Todos os preços associados serão removidos."
      confirm-label="Eliminar"
      :danger="true"
      :loading="deletingVariant"
      @confirm="confirmDeleteVariant"
    />
    <Alert v-if="variantDeleteError" variant="destructive" class="mt-2">
      <AlertDescription>{{ variantDeleteError }}</AlertDescription>
    </Alert>

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
          <b class="text-gray-900">{{ reassignSource?.brand ?? 'Genérico' }}</b>
          vai passar a pertencer a outro produto. Se o produto de origem ficar
          sem mais nenhuma variante, é eliminado automaticamente.
        </p>
        <div class="space-y-1.5">
          <Label>Produto de destino</Label>
          <ProductCombobox
            v-model="reassignTarget"
            :search="searchReassignTarget"
            :item-label="(p) => p.name"
            placeholder="Pesquisar produto de destino..."
          />
        </div>
        <p v-if="reassignTarget" class="text-sm text-brand-700">
          Destino selecionado: <b>{{ reassignTarget.name }}</b>
        </p>
      </div>
    </FormDialog>
  </div>
</template>
