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
    {
      path: '/verificar-email',
      name: 'verify-email',
      component: () => import('@/views/VerifyEmailView.vue'),
      meta: { public: true },
    },
    {
      path: '/recuperar-password',
      name: 'forgot-password',
      component: () => import('@/views/ForgotPasswordView.vue'),
      meta: { public: true },
    },
    {
      path: '/repor-password',
      name: 'reset-password',
      component: () => import('@/views/ResetPasswordView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/produtos',
      name: 'products',
      component: () => import('@/views/ProductsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/produtos/:id/editar',
      name: 'products-edit',
      component: () => import('@/views/ProductsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/produtos/revisao',
      name: 'products-review',
      component: () => import('@/views/ReviewProductsView.vue'),
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
      path: '/precos/:id/editar',
      name: 'prices-edit',
      component: () => import('@/views/PricesView.vue'),
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

  console.log('[router] isAuthenticated:', auth.isAuthenticated, '| user:', auth.user)

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
