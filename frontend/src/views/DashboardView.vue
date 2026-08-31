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
      <h1 class="text-2xl font-bold text-foreground">Dashboard</h1>
      <p class="mt-1 text-muted-foreground">Visão geral dos preços registados</p>
    </div>

    <div v-if="loading" class="flex h-64 items-center justify-center">
      <Spinner class="size-10 text-primary" data-testid="loading-spinner" />
    </div>

    <Alert v-else-if="error" variant="destructive">
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <div v-else-if="stats">
      <!-- Stats cards -->
      <div class="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card class="p-6">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-1/10">
              <PackageIcon class="size-6 text-chart-1" />
            </div>
            <div>
              <p class="text-3xl font-bold text-foreground">
                {{ stats.stats.totalProducts }}
              </p>
              <p class="mt-0.5 text-sm text-muted-foreground">Produtos</p>
            </div>
          </div>
        </Card>

        <Card class="p-6">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-2/10">
              <StoreIcon class="size-6 text-chart-2" />
            </div>
            <div>
              <p class="text-3xl font-bold text-foreground">
                {{ stats.stats.totalSupermarkets }}
              </p>
              <p class="mt-0.5 text-sm text-muted-foreground">Supermercados</p>
            </div>
          </div>
        </Card>

        <Card class="p-6">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-3/10">
              <TagIcon class="size-6 text-chart-3" />
            </div>
            <div>
              <p class="text-3xl font-bold text-foreground">
                {{ stats.stats.totalPrices }}
              </p>
              <p class="mt-0.5 text-sm text-muted-foreground">Preços Registados</p>
            </div>
          </div>
        </Card>
      </div>

      <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <!-- Preços mais recentes -->
        <Card class="py-0">
          <div class="border-b px-6 py-4">
            <h2 class="font-semibold text-foreground">Últimos Registos</h2>
          </div>
          <div v-if="stats.recentPrices.length === 0" class="p-6 text-center text-sm text-muted-foreground">
            Nenhum registo ainda
          </div>
          <ul v-else class="divide-y divide-border">
            <li
              v-for="price in stats.recentPrices"
              :key="price.id"
              class="flex items-center justify-between gap-4 px-6 py-4"
            >
              <div class="min-w-0">
                <p class="truncate font-medium text-foreground">
                  {{ price.variant?.product?.name }}
                  <span v-if="price.variant?.brand" class="font-normal text-muted-foreground"
                    >· {{ price.variant.brand }}</span
                  >
                </p>
                <p class="mt-0.5 text-xs text-muted-foreground">
                  {{ price.supermarket?.name }} · {{ formatDate(price.date) }}
                </p>
              </div>
              <span class="whitespace-nowrap font-semibold text-primary">{{
                formatPrice(price.price)
              }}</span>
            </li>
          </ul>
        </Card>

        <!-- Melhores preços -->
        <Card class="py-0">
          <div class="border-b px-6 py-4">
            <h2 class="font-semibold text-foreground">Melhores Preços por Produto</h2>
          </div>
          <div v-if="stats.cheapestByProduct.length === 0" class="p-6 text-center text-sm text-muted-foreground">
            Nenhum dado disponível
          </div>
          <ul v-else class="divide-y divide-border">
            <li
              v-for="item in stats.cheapestByProduct"
              :key="item.productId"
              class="flex items-center justify-between gap-4 px-6 py-4"
            >
              <div class="min-w-0">
                <p class="truncate font-medium text-foreground">
                  {{ item.productName }}
                  <span v-if="item.variantBrand" class="font-normal text-muted-foreground"
                    >· {{ item.variantBrand }}</span
                  >
                </p>
                <p class="mt-0.5 text-xs text-muted-foreground">
                  <Badge variant="outline" class="border-primary/20 bg-primary/10 text-primary">
                    {{ item.supermarketName }}
                  </Badge>
                  <span class="ml-2">{{ formatDate(item.date) }}</span>
                </p>
              </div>
              <div class="text-right">
                <p class="font-bold text-primary">
                  {{ formatPrice(item.minPrice) }}
                </p>
                <p class="text-xs font-medium text-success">mais barato</p>
              </div>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  </div>
</template>
