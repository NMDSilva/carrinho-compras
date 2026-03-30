<script setup lang="ts">
import { ref, computed } from 'vue'
import { importApi, supermarketsApi } from '@/api'
import type { ImportPreview, ImportResult, Supermarket } from '@/types'

// ── Estado global do fluxo ────────────────────────────────────────────────────
type Step = 'upload' | 'preview' | 'done'
const step = ref<Step>('upload')
const globalError = ref('')

// ── Upload ────────────────────────────────────────────────────────────────────
const dragOver = ref(false)
const analyzing = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

function onDragOver(e: DragEvent) { e.preventDefault(); dragOver.value = true }
function onDragLeave() { dragOver.value = false }
function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file) analyze(file)
}
function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) analyze(file)
}

async function analyze(file: File) {
  if (!file.name.endsWith('.pdf')) {
    globalError.value = 'Apenas ficheiros PDF são aceites'
    return
  }
  analyzing.value = true
  globalError.value = ''
  try {
    const data = await importApi.preview(file)
    initPreview(data)
    step.value = 'preview'
  } catch {
    globalError.value = 'Não foi possível analisar a fatura. Verifica se é uma fatura do Continente.'
  } finally {
    analyzing.value = false
  }
}

// ── Preview ───────────────────────────────────────────────────────────────────
interface ReviewItem {
  // dados originais (só leitura)
  description: string
  category: string
  ivaCode: string
  // editáveis pelo utilizador
  selected: boolean
  productId: number | null
  productName: string
  productUnit: string
  productCategory: string | null
  unitPrice: number
  quantity: number
  // auxiliares de display
  existingProductName: string | null
}

const preview = ref<ImportPreview | null>(null)
const reviewItems = ref<ReviewItem[]>([])
const supermarketId = ref<number | null>(null)
const supermarketName = ref('')
const supermarketLocation = ref('')
const existingSupermarkets = ref<Supermarket[]>([])
const date = ref('')
const importing = ref(false)

const UNITS = ['un', 'kg', 'g', 'L', 'ml', 'cl', 'cx', 'pac']

async function 
initPreview(data: ImportPreview) {
  preview.value = data
  date.value = data.date

  supermarketId.value = data.existingSupermarketId
  supermarketName.value = data.supermarketName
  supermarketLocation.value = data.supermarketLocation

  existingSupermarkets.value = await supermarketsApi.getAll()

  reviewItems.value = data.items.map((item) => ({
    description: item.description,
    category: item.category,
    ivaCode: item.ivaCode,
    selected: true,
    productId: item.existingProductId,
    productName: item.suggestedName,
    productUnit: item.suggestedUnit,
    productCategory: item.suggestedCategory,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    existingProductName: item.existingProductName,
  }))
}

const selectedCount = computed(() => reviewItems.value.filter((i) => i.selected).length)
const newProductsCount = computed(
  () => reviewItems.value.filter((i) => i.selected && !i.productId).length
)

function toggleAll(val: boolean) {
  reviewItems.value.forEach((i) => (i.selected = val))
}

// ── Confirm ───────────────────────────────────────────────────────────────────
const result = ref<ImportResult | null>(null)

async function confirmImport() {
  importing.value = true
  globalError.value = ''
  try {
    result.value = await importApi.confirm({
      date: date.value,
      supermarketId: supermarketId.value,
      supermarketName: supermarketName.value,
      supermarketLocation: supermarketLocation.value,
      items: reviewItems.value.map((i) => ({
        skip: !i.selected,
        productId: i.productId,
        productName: i.productName,
        productUnit: i.productUnit,
        productCategory: i.productCategory,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
      })),
    })
    step.value = 'done'
  } catch {
    globalError.value = 'Erro ao importar. Verifica os dados e tenta novamente.'
  } finally {
    importing.value = false
  }
}

function reset() {
  step.value = 'upload'
  preview.value = null
  reviewItems.value = []
  result.value = null
  globalError.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n)
}

function formatQty(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/\.?0+$/, '')
}
</script>

<template>
  <div class="max-w-5xl">

    <!-- Cabeçalho -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Importar Fatura</h1>
        <p class="text-sm text-gray-500 mt-1">Carrega uma fatura do Continente para importar os preços automaticamente</p>
      </div>
      <button v-if="step !== 'upload'" @click="reset" class="btn btn-secondary btn-sm">
        Nova fatura
      </button>
    </div>

    <!-- Erro global -->
    <div v-if="globalError" class="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
      {{ globalError }}
    </div>

    <!-- ── PASSO 1: Upload ──────────────────────────────────────────────────── -->
    <div v-if="step === 'upload'">
      <div
        class="border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer"
        :class="dragOver ? 'border-brand-400 bg-brand-50' : 'border-gray-300 hover:border-brand-300 hover:bg-gray-50'"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
        @click="fileInputRef?.click()"
      >
        <div v-if="analyzing" class="flex flex-col items-center gap-3">
          <div class="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full"></div>
          <p class="text-sm text-gray-600">A analisar a fatura…</p>
        </div>
        <div v-else class="flex flex-col items-center gap-3">
          <div class="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
            <svg class="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p class="font-medium text-gray-700">Arrasta o PDF para aqui</p>
            <p class="text-sm text-gray-400 mt-0.5">ou clica para selecionar ficheiro</p>
          </div>
          <p class="text-xs text-gray-400">Faturas Simplificadas do Continente · PDF</p>
        </div>
      </div>
      <input ref="fileInputRef" type="file" accept=".pdf" class="hidden" @change="onFileChange" />
    </div>

    <!-- ── PASSO 2: Revisão ────────────────────────────────────────────────── -->
    <div v-else-if="step === 'preview' && preview">

      <!-- Resumo da fatura -->
      <div class="bg-white rounded-xl border border-gray-200 p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p class="text-xs text-gray-400 mb-1">Loja</p>
          <p class="font-medium text-gray-900">{{ preview.supermarketName }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-400 mb-1">Data</p>
          <input v-model="date" type="date" class="input py-1 text-sm" />
        </div>
        <div>
          <p class="text-xs text-gray-400 mb-1">Fatura</p>
          <p class="text-gray-600 font-mono text-xs">{{ preview.invoiceNumber }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-400 mb-1">Total</p>
          <p class="font-semibold text-brand-700">{{ formatPrice(preview.total) }}</p>
        </div>
      </div>

      <!-- Supermercado -->
      <div class="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <p class="text-sm font-medium text-gray-700 mb-2">Supermercado na aplicação</p>
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="flex-1">
            <label class="label text-xs">Selecionar existente</label>
            <select
              v-model="supermarketId"
              class="input"
              @change="if (supermarketId) { const s = existingSupermarkets.find(x => x.id === supermarketId); if(s) supermarketName = s.name }"
            >
              <option :value="null">— Criar novo —</option>
              <option v-for="s in existingSupermarkets" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <template v-if="!supermarketId">
            <div class="flex-1">
              <label class="label text-xs">Nome</label>
              <input v-model="supermarketName" type="text" class="input" placeholder="ex: Continente Capelas" />
            </div>
            <div class="flex-1">
              <label class="label text-xs">Localização</label>
              <input v-model="supermarketLocation" type="text" class="input" placeholder="ex: Capelas, Açores" />
            </div>
          </template>
        </div>
      </div>

      <!-- Tabela de itens -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <p class="text-sm font-medium text-gray-700">
              {{ selectedCount }} de {{ reviewItems.length }} itens selecionados
              <span v-if="newProductsCount" class="text-gray-400 font-normal">({{ newProductsCount }} produtos novos)</span>
            </p>
          </div>
          <div class="flex gap-2">
            <button @click="toggleAll(true)" class="btn btn-secondary btn-sm">Todos</button>
            <button @click="toggleAll(false)" class="btn btn-secondary btn-sm">Nenhum</button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-100">
              <tr>
                <th class="w-10 px-3 py-2"></th>
                <th class="text-left px-3 py-2 font-medium text-gray-500">Descrição na fatura</th>
                <th class="text-left px-3 py-2 font-medium text-gray-500">Categoria</th>
                <th class="text-right px-3 py-2 font-medium text-gray-500">Preço unit.</th>
                <th class="text-right px-3 py-2 font-medium text-gray-500">Qtd.</th>
                <th class="text-left px-3 py-2 font-medium text-gray-500 min-w-[200px]">Produto na app</th>
                <th class="text-left px-3 py-2 font-medium text-gray-500">Unidade</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr
                v-for="(item, idx) in reviewItems"
                :key="idx"
                :class="item.selected ? '' : 'opacity-40'"
                class="transition-opacity"
              >
                <!-- Checkbox -->
                <td class="px-3 py-2 text-center">
                  <input type="checkbox" v-model="item.selected" class="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                </td>

                <!-- Descrição original -->
                <td class="px-3 py-2">
                  <p class="font-mono text-xs text-gray-500">{{ item.description }}</p>
                  <p class="text-xs text-gray-400">{{ item.category }}</p>
                </td>

                <!-- Categoria -->
                <td class="px-3 py-2">
                  <input
                    v-model="item.productCategory"
                    type="text"
                    class="input py-1 text-xs w-32"
                    :disabled="!item.selected"
                  />
                </td>

                <!-- Preço unitário -->
                <td class="px-3 py-2 text-right">
                  <input
                    v-model.number="item.unitPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    class="input py-1 text-xs text-right w-20"
                    :disabled="!item.selected"
                  />
                </td>

                <!-- Quantidade -->
                <td class="px-3 py-2 text-right">
                  <span class="text-gray-600 text-xs">{{ formatQty(item.quantity) }}</span>
                </td>

                <!-- Produto na app -->
                <td class="px-3 py-2">
                  <div v-if="item.existingProductName && item.productId" class="flex items-center gap-1.5">
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-brand-50 text-brand-700 border border-brand-200">
                      existe
                    </span>
                    <span class="text-xs text-gray-700">{{ item.existingProductName }}</span>
                  </div>
                  <div v-else>
                    <input
                      v-model="item.productName"
                      type="text"
                      class="input py-1 text-xs w-48"
                      placeholder="Nome do produto"
                      :disabled="!item.selected"
                    />
                  </div>
                </td>

                <!-- Unidade -->
                <td class="px-3 py-2">
                  <select
                    v-if="!item.existingProductName || !item.productId"
                    v-model="item.productUnit"
                    class="input py-1 text-xs w-20"
                    :disabled="!item.selected"
                  >
                    <option v-for="u in UNITS" :key="u" :value="u">{{ u }}</option>
                  </select>
                  <span v-else class="text-xs text-gray-400">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Ações -->
      <div class="flex items-center justify-between">
        <p class="text-sm text-gray-500">
          Serão importados <strong>{{ selectedCount }}</strong> registos de preço
          <template v-if="newProductsCount"> e criados <strong>{{ newProductsCount }}</strong> produtos novos</template>
        </p>
        <button
          class="btn btn-primary"
          :disabled="importing || selectedCount === 0"
          @click="confirmImport"
        >
          <svg v-if="importing" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          {{ importing ? 'A importar…' : `Importar ${selectedCount} itens` }}
        </button>
      </div>
    </div>

    <!-- ── PASSO 3: Concluído ──────────────────────────────────────────────── -->
    <div v-else-if="step === 'done' && result" class="text-center py-16">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-brand-100 rounded-full mb-4">
        <svg class="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 class="text-xl font-bold text-gray-900 mb-2">Importação concluída</h2>
      <div class="flex items-center justify-center gap-8 mt-4 mb-8">
        <div class="text-center">
          <p class="text-3xl font-bold text-brand-600">{{ result.pricesCreated }}</p>
          <p class="text-sm text-gray-500 mt-1">registos de preço</p>
        </div>
        <div class="text-center">
          <p class="text-3xl font-bold text-gray-700">{{ result.productsCreated }}</p>
          <p class="text-sm text-gray-500 mt-1">produtos criados</p>
        </div>
      </div>
      <button @click="reset" class="btn btn-secondary">Importar outra fatura</button>
    </div>

  </div>
</template>
