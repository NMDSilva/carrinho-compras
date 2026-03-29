<script setup lang="ts">
import { ref } from 'vue'
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const mobileMenuOpen = ref(false)

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'home' },
  { to: '/produtos', label: 'Produtos', icon: 'package' },
  { to: '/supermercados', label: 'Supermercados', icon: 'store' },
  { to: '/precos', label: 'Preços', icon: 'tag' },
  { to: '/comparar', label: 'Comparar', icon: 'scale' },
]

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <!-- Página de login: sem sidebar -->
  <RouterView v-if="route.name === 'login'" />

  <div v-else class="min-h-screen bg-gray-50">
    <!-- Sidebar (desktop) -->
    <aside class="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div class="flex flex-col flex-1 min-h-0 bg-white border-r border-gray-200">
        <!-- Logo -->
        <div class="flex items-center h-16 px-6 border-b border-gray-200">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-bold text-gray-900">Carrinho de</p>
              <p class="text-xs font-semibold text-brand-600 -mt-0.5">Compras</p>
            </div>
          </div>
        </div>

        <!-- Nav -->
        <nav class="flex-1 px-4 py-6 space-y-1">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="route.path === item.to
              ? 'bg-brand-50 text-brand-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
          >
            <!-- Home icon -->
            <svg v-if="item.icon === 'home'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <!-- Package icon -->
            <svg v-if="item.icon === 'package'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <!-- Store icon -->
            <svg v-if="item.icon === 'store'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <!-- Tag icon -->
            <svg v-if="item.icon === 'tag'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <!-- Scale icon -->
            <svg v-if="item.icon === 'scale'" class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            {{ item.label }}
          </RouterLink>
        </nav>

        <!-- User info + logout (sidebar) -->
        <div v-if="auth.user" class="px-4 py-4 border-t border-gray-100">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span class="text-brand-700 font-semibold text-sm">{{ auth.user.name.charAt(0).toUpperCase() }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 truncate">{{ auth.user.name }}</p>
              <p class="text-xs text-gray-400 truncate">{{ auth.user.email }}</p>
            </div>
            <button @click="logout" title="Sair" class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Mobile header -->
    <div class="lg:hidden sticky top-0 z-10 bg-white border-b border-gray-200">
      <div class="flex items-center justify-between h-14 px-4">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span class="font-bold text-gray-900 text-sm">Carrinho de Compras</span>
        </div>
        <button @click="mobileMenuOpen = !mobileMenuOpen" class="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <svg v-if="!mobileMenuOpen" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Mobile menu -->
      <div v-if="mobileMenuOpen" class="border-t border-gray-200 py-2 px-4 space-y-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          @click="mobileMenuOpen = false"
          class="block px-3 py-2 rounded-lg text-sm font-medium"
          :class="route.path === item.to
            ? 'bg-brand-50 text-brand-700'
            : 'text-gray-600 hover:bg-gray-50'"
        >
          {{ item.label }}
        </RouterLink>
        <div v-if="auth.user" class="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between">
          <span class="text-xs text-gray-400">{{ auth.user.name }}</span>
          <button @click="logout" class="text-xs text-red-500 font-medium hover:underline">Sair</button>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <main class="lg:pl-64">
      <div class="max-w-7xl mx-auto p-6">
        <RouterView />
      </div>
    </main>
  </div>
</template>

