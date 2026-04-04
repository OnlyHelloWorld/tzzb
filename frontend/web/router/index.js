import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import LedgerPage from '../views/LedgerPage.vue'

const routes = [
  {
    path: '/home',
    name: 'Home',
    component: HomePage
  },
  {
    path: '/ledger/:id',
    name: 'Ledger',
    component: LedgerPage,
    props: route => ({ id: route.params.id })
  },
  {
    path: '/',
    redirect: '/home'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router