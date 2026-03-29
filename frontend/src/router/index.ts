import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView },
    {
      path: '/produtos',
      name: 'products',
      component: () => import('@/views/ProductsView.vue'),
    },
    {
      path: '/supermercados',
      name: 'supermarkets',
      component: () => import('@/views/SupermarketsView.vue'),
    },
    {
      path: '/precos',
      name: 'prices',
      component: () => import('@/views/PricesView.vue'),
    },
    {
      path: '/comparar',
      name: 'compare',
      component: () => import('@/views/CompareView.vue'),
    },
  ],
})

export default router
