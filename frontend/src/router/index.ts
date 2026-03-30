import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import DashboardView from '@/views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    { path: '/', name: 'dashboard', component: DashboardView, meta: { requiresAuth: true } },
    {
      path: '/produtos',
      name: 'products',
      component: () => import('@/views/ProductsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/supermercados',
      name: 'supermarkets',
      component: () => import('@/views/SupermarketsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/precos',
      name: 'prices',
      component: () => import('@/views/PricesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/importar',
      name: 'import',
      component: () => import('@/views/ImportView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/comparar',
      name: 'compare',
      component: () => import('@/views/CompareView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/perfil',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/utilizadores',
      name: 'admin-users',
      component: () => import('@/views/UsersView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()

  // Verificar se o token ainda é válido (1x por sessão)
  if (auth.token && !auth.user) {
    await auth.fetchMe()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return next({ name: 'dashboard' })
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return next({ name: 'dashboard' })
  }

  next()
})

export default router
