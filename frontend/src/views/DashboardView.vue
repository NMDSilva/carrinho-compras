<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { pricesApi } from '@/api'
import type { DashboardStats } from '@/types'
import { useAsyncAction } from '@/composables/useAsyncAction'

const stats = ref<DashboardStats | null>(null)
const { loading, error, run: runLoad } = useAsyncAction('Erro ao carregar dashboard', { immediate: true })

onMounted(async () => {
  const result = await runLoad(() => pricesApi.dashboard())
  if (result !== undefined) stats.value = result
})

function formatPrice(price: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(price)
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date))
}
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p class="text-gray-500 mt-1">Visão geral dos preços registados</p>
    </div>

    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
    </div>

    <div v-else-if="error" class="card p-6 text-center text-red-600">{{ error }}</div>

    <div v-else-if="stats">
      <!-- Stats cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div class="card p-6">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p class="text-3xl font-bold text-gray-900">{{ stats.stats.totalProducts }}</p>
              <p class="text-sm text-gray-500 mt-0.5">Produtos</p>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p class="text-3xl font-bold text-gray-900">{{ stats.stats.totalSupermarkets }}</p>
              <p class="text-sm text-gray-500 mt-0.5">Supermercados</p>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <p class="text-3xl font-bold text-gray-900">{{ stats.stats.totalPrices }}</p>
              <p class="text-sm text-gray-500 mt-0.5">Preços Registados</p>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- Preços mais recentes -->
        <div class="card">
          <div class="px-6 py-4 border-b border-gray-100">
            <h2 class="font-semibold text-gray-900">Últimos Registos</h2>
          </div>
          <div v-if="stats.recentPrices.length === 0" class="p-6 text-center text-gray-400 text-sm">
            Nenhum registo ainda
          </div>
          <ul v-else class="divide-y divide-gray-50">
            <li v-for="price in stats.recentPrices" :key="price.id" class="px-6 py-4 flex items-center justify-between gap-4">
              <div class="min-w-0">
                <p class="font-medium text-gray-900 truncate">{{ price.product?.name }}</p>
                <p class="text-xs text-gray-500 mt-0.5">
                  {{ price.supermarket?.name }} · {{ formatDate(price.date) }}
                </p>
              </div>
              <span class="font-semibold text-brand-700 whitespace-nowrap">{{ formatPrice(price.price) }}</span>
            </li>
          </ul>
        </div>

        <!-- Melhores preços -->
        <div class="card">
          <div class="px-6 py-4 border-b border-gray-100">
            <h2 class="font-semibold text-gray-900">Melhores Preços por Produto</h2>
          </div>
          <div v-if="stats.cheapestByProduct.length === 0" class="p-6 text-center text-gray-400 text-sm">
            Nenhum dado disponível
          </div>
          <ul v-else class="divide-y divide-gray-50">
            <li v-for="item in stats.cheapestByProduct" :key="item.productId"
              class="px-6 py-4 flex items-center justify-between gap-4">
              <div class="min-w-0">
                <p class="font-medium text-gray-900 truncate">{{ item.productName }}</p>
                <p class="text-xs text-gray-500 mt-0.5">
                  <span class="badge-green">{{ item.supermarketName }}</span>
                  <span class="ml-2">{{ formatDate(item.date) }}</span>
                </p>
              </div>
              <div class="text-right">
                <p class="font-bold text-brand-700">{{ formatPrice(item.minPrice) }}</p>
                <p class="text-xs text-green-600 font-medium">mais barato</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
