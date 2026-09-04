<script setup lang="ts">
import { ref, watch } from 'vue'
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
import { aplicarTema } from '@/lib/theme'

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

// Sincroniza o tema do utilizador com o `<html>` e com o localStorage assim que
// a sessão fica disponível (login, fetchMe, ou mudança em /perfil).
//
// O `if (!theme) return` é essencial: sem sessão — ecrã de login, recuperação de
// password, ou logout — não se toca no tema. Antes fazia-se
// `toggle('dark', theme === 'dark')` sem esta guarda, o que forçava o tema claro
// nessas páginas e desfazia o que o `public/theme.js` já tinha aplicado a partir
// do localStorage.
watch(
  () => auth.user?.theme,
  (theme) => {
    if (!theme) return
    aplicarTema(theme)
  },
  { immediate: true }
)

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <!-- Rotas públicas (login, verificar/recuperar/repor password) não têm sessão
       iniciada, logo não faz sentido mostrarem a navegação nem o bloco de
       utilizador. A condição segue o `meta.public` do router e não uma lista de
       nomes: com `route.name === 'login'` as outras três apareciam com a barra
       lateral, e qualquer rota pública nova voltaria a cair no mesmo erro. -->
  <RouterView v-if="route.meta.public" />

  <div v-else class="min-h-screen bg-background">
    <!-- Sidebar (desktop) -->
    <aside class="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div class="flex flex-col flex-1 min-h-0 bg-card border-r">
        <!-- Logo -->
        <div class="flex items-center h-16 px-6 border-b">
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"
            >
              <ShoppingCartIcon class="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p class="text-sm font-bold text-foreground">Carrinho de</p>
              <p class="text-xs font-semibold text-primary -mt-0.5">Compras</p>
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
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            "
          >
            <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
            {{ item.label }}
          </RouterLink>

          <!-- Secção Admin -->
          <template v-if="auth.isAdmin">
            <div class="pt-4 pb-1">
              <p
                class="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
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
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              "
            >
              <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
              {{ item.label }}
            </RouterLink>
          </template>
        </nav>

        <!-- User info + logout (sidebar) -->
        <div v-if="auth.user" class="px-4 py-4 border-t">
          <div class="flex items-center gap-3">
            <RouterLink
              to="/perfil"
              class="flex items-center gap-3 min-w-0 flex-1 group"
            >
              <div
                class="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors"
              >
                <span class="text-primary font-semibold text-sm">{{
                  auth.user.name.charAt(0).toUpperCase()
                }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p
                  class="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors"
                >
                  {{ auth.user.name }}
                </p>
                <p class="text-xs text-muted-foreground truncate">
                  {{ auth.user.email }}
                </p>
              </div>
            </RouterLink>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Sair"
              class="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              @click="logout"
            >
              <LogOutIcon class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Mobile header -->
    <div class="lg:hidden sticky top-0 z-10 bg-card border-b">
      <div class="flex items-center justify-between h-14 px-4">
        <div class="flex items-center gap-2">
          <div
            class="w-7 h-7 bg-primary rounded-lg flex items-center justify-center"
          >
            <ShoppingCartIcon class="w-4 h-4 text-primary-foreground" />
          </div>
          <span class="font-bold text-foreground text-sm"
            >Carrinho de Compras</span
          >
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          class="text-muted-foreground"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <MenuIcon v-if="!mobileMenuOpen" class="w-5 h-5" />
          <XIcon v-else class="w-5 h-5" />
        </Button>
      </div>

      <!-- Mobile menu -->
      <div
        v-if="mobileMenuOpen"
        class="border-t py-2 px-4 space-y-1"
      >
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="block px-3 py-2 rounded-lg text-sm font-medium"
          :class="
            route.path === item.to
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          "
          @click="mobileMenuOpen = false"
        >
          {{ item.label }}
        </RouterLink>
        <template v-if="auth.isAdmin">
          <p
            class="px-3 pt-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
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
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            "
            @click="mobileMenuOpen = false"
          >
            {{ item.label }}
          </RouterLink>
        </template>
        <div
          v-if="auth.user"
          class="pt-2 mt-2 border-t flex items-center justify-between"
        >
          <span class="text-xs text-muted-foreground">{{ auth.user.name }}</span>
          <button
            class="text-xs text-destructive font-medium hover:underline"
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
