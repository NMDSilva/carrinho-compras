<script setup lang="ts">
import { ref } from 'vue'
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router'
import {
  FlagIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  PackageIcon,
  ScaleIcon,
  ShoppingCartIcon,
  StoreIcon,
  TagIcon,
  UsersIcon,
  XIcon,
} from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const mobileMenuOpen = ref(false)

const navItems = [
  { to: '/', label: 'Dashboard', icon: HomeIcon },
  { to: '/produtos', label: 'Produtos', icon: PackageIcon },
  { to: '/produtos/revisao', label: 'Produtos por rever', icon: FlagIcon },
  { to: '/supermercados', label: 'Supermercados', icon: StoreIcon },
  { to: '/precos', label: 'Preços', icon: TagIcon },
  { to: '/comparar', label: 'Comparar', icon: ScaleIcon },
]

const adminItems = [
  { to: '/admin/utilizadores', label: 'Utilizadores', icon: UsersIcon },
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
      <div
        class="flex flex-col flex-1 min-h-0 bg-white border-r border-gray-200"
      >
        <!-- Logo -->
        <div class="flex items-center h-16 px-6 border-b border-gray-200">
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center"
            >
              <ShoppingCartIcon class="w-5 h-5 text-white" />
            </div>
            <div>
              <p class="text-sm font-bold text-gray-900">Carrinho de</p>
              <p class="text-xs font-semibold text-brand-600 -mt-0.5">
                Compras
              </p>
            </div>
          </div>
        </div>

        <!-- Nav -->
        <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="
              route.path === item.to
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            "
          >
            <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
            {{ item.label }}
          </RouterLink>

          <!-- Secção Admin -->
          <template v-if="auth.isAdmin">
            <div class="pt-4 pb-1">
              <p
                class="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider"
              >
                Administração
              </p>
            </div>
            <RouterLink
              v-for="item in adminItems"
              :key="item.to"
              :to="item.to"
              class="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              :class="
                route.path === item.to
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              "
            >
              <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
              {{ item.label }}
            </RouterLink>
          </template>
        </nav>

        <!-- User info + logout (sidebar) -->
        <div v-if="auth.user" class="px-4 py-4 border-t border-gray-100">
          <div class="flex items-center gap-3">
            <RouterLink
              to="/perfil"
              class="flex items-center gap-3 min-w-0 flex-1 group"
            >
              <div
                class="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-brand-200 transition-colors"
              >
                <span class="text-brand-700 font-semibold text-sm">{{
                  auth.user.name.charAt(0).toUpperCase()
                }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p
                  class="text-sm font-medium text-gray-900 truncate group-hover:text-brand-700 transition-colors"
                >
                  {{ auth.user.name }}
                </p>
                <p class="text-xs text-gray-400 truncate">
                  {{ auth.user.email }}
                </p>
              </div>
            </RouterLink>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Sair"
              class="text-gray-400 hover:bg-red-50 hover:text-red-500"
              @click="logout"
            >
              <LogOutIcon class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Mobile header -->
    <div class="lg:hidden sticky top-0 z-10 bg-white border-b border-gray-200">
      <div class="flex items-center justify-between h-14 px-4">
        <div class="flex items-center gap-2">
          <div
            class="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center"
          >
            <ShoppingCartIcon class="w-4 h-4 text-white" />
          </div>
          <span class="font-bold text-gray-900 text-sm"
            >Carrinho de Compras</span
          >
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          class="text-gray-500"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <MenuIcon v-if="!mobileMenuOpen" class="w-5 h-5" />
          <XIcon v-else class="w-5 h-5" />
        </Button>
      </div>

      <!-- Mobile menu -->
      <div
        v-if="mobileMenuOpen"
        class="border-t border-gray-200 py-2 px-4 space-y-1"
      >
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="block px-3 py-2 rounded-lg text-sm font-medium"
          :class="
            route.path === item.to
              ? 'bg-brand-50 text-brand-700'
              : 'text-gray-600 hover:bg-gray-50'
          "
          @click="mobileMenuOpen = false"
        >
          {{ item.label }}
        </RouterLink>
        <template v-if="auth.isAdmin">
          <p
            class="px-3 pt-3 text-xs font-semibold text-gray-400 uppercase tracking-wider"
          >
            Administração
          </p>
          <RouterLink
            v-for="item in adminItems"
            :key="item.to"
            :to="item.to"
            class="block px-3 py-2 rounded-lg text-sm font-medium"
            :class="
              route.path === item.to
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-50'
            "
            @click="mobileMenuOpen = false"
          >
            {{ item.label }}
          </RouterLink>
        </template>
        <div
          v-if="auth.user"
          class="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between"
        >
          <span class="text-xs text-gray-400">{{ auth.user.name }}</span>
          <button
            class="text-xs text-red-500 font-medium hover:underline"
            @click="logout"
          >
            Sair
          </button>
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

  <Toaster position="top-right" rich-colors />
</template>
