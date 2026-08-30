<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PackageIcon, StoreIcon, TagIcon } from '@lucide/vue'
import { pricesApi } from '@/api'
import type { DashboardStats } from '@/types'
import { useAsyncAction, ASYNC_ACTION_FAILED } from '@/composables/useAsyncAction'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'

const stats = ref<DashboardStats | null>(null)
const {
  loading,
  error,
  run: runLoad,
} = useAsyncAction('Erro ao carregar dashboard', { immediate: true })

onMounted(async () => {
  const result = await runLoad(() => pricesApi.dashboard())
  if (result !== ASYNC_ACTION_FAILED) stats.value = result
})

function formatPrice(price: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p class="mt-1 text-gray-500">Visão geral dos preços registados</p>
    </div>

    <div v-if="loading" class="flex h-64 items-center justify-center">
      <Spinner class="size-10 text-brand-600" data-testid="loading-spinner" />
    </div>

    <Alert v-else-if="error" variant="destructive">
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <div v-else-if="stats">
      <!-- Stats cards -->
      <div class="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card class="p-6">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100">
              <PackageIcon class="size-6 text-brand-600" />
            </div>
            <div>
              <p class="text-3xl font-bold text-gray-900">
                {{ stats.stats.totalProducts }}
              </p>
              <p class="mt-0.5 text-sm text-gray-500">Produtos</p>
            </div>
          </div>
        </Card>

        <Card class="p-6">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
              <StoreIcon class="size-6 text-blue-600" />
            </div>
            <div>
              <p class="text-3xl font-bold text-gray-900">
                {{ stats.stats.totalSupermarkets }}
              </p>
              <p class="mt-0.5 text-sm text-gray-500">Supermercados</p>
            </div>
          </div>
        </Card>

        <Card class="p-6">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
              <TagIcon class="size-6 text-purple-600" />
            </div>
            <div>
              <p class="text-3xl font-bold text-gray-900">
                {{ stats.stats.totalPrices }}
              </p>
              <p class="mt-0.5 text-sm text-gray-500">Preços Registados</p>
            </div>
          </div>
        </Card>
      </div>

      <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <!-- Preços mais recentes -->
        <Card class="py-0">
          <div class="border-b border-gray-100 px-6 py-4">
            <h2 class="font-semibold text-gray-900">Últimos Registos</h2>
          </div>
          <div v-if="stats.recentPrices.length === 0" class="p-6 text-center text-sm text-gray-400">
            Nenhum registo ainda
          </div>
          <ul v-else class="divide-y divide-gray-50">
            <li
              v-for="price in stats.recentPrices"
              :key="price.id"
              class="flex items-center justify-between gap-4 px-6 py-4"
            >
              <div class="min-w-0">
                <p class="truncate font-medium text-gray-900">
                  {{ price.variant?.product?.name }}
                  <span v-if="price.variant?.brand" class="font-normal text-gray-400"
                    >· {{ price.variant.brand }}</span
                  >
                </p>
                <p class="mt-0.5 text-xs text-gray-500">
                  {{ price.supermarket?.name }} · {{ formatDate(price.date) }}
                </p>
              </div>
              <span class="whitespace-nowrap font-semibold text-brand-700">{{
                formatPrice(price.price)
              }}</span>
            </li>
          </ul>
        </Card>

        <!-- Melhores preços -->
        <Card class="py-0">
          <div class="border-b border-gray-100 px-6 py-4">
            <h2 class="font-semibold text-gray-900">Melhores Preços por Produto</h2>
          </div>
          <div v-if="stats.cheapestByProduct.length === 0" class="p-6 text-center text-sm text-gray-400">
            Nenhum dado disponível
          </div>
          <ul v-else class="divide-y divide-gray-50">
            <li
              v-for="item in stats.cheapestByProduct"
              :key="item.productId"
              class="flex items-center justify-between gap-4 px-6 py-4"
            >
              <div class="min-w-0">
                <p class="truncate font-medium text-gray-900">
                  {{ item.productName }}
                  <span v-if="item.variantBrand" class="font-normal text-gray-400"
                    >· {{ item.variantBrand }}</span
                  >
                </p>
                <p class="mt-0.5 text-xs text-gray-500">
                  <Badge variant="outline" class="border-brand-200 bg-brand-100 text-brand-800">
                    {{ item.supermarketName }}
                  </Badge>
                  <span class="ml-2">{{ formatDate(item.date) }}</span>
                </p>
              </div>
              <div class="text-right">
                <p class="font-bold text-brand-700">
                  {{ formatPrice(item.minPrice) }}
                </p>
                <p class="text-xs font-medium text-green-600">mais barato</p>
              </div>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  </div>
</template>
