import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import LedgerPage from '../views/LedgerPage.vue'
import LoginPage from '../components/LoginPage.vue'
import { isLoggedIn } from '../lib/api.js'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginPage
  },
  {
    path: '/home',
    name: 'Home',
    component: HomePage
  },
  {
    path: '/ledger/:id',
    name: 'Ledger',
    component: LedgerPage,
    props: true
  },
  {
    path: '/',
    redirect: isLoggedIn() ? '/home' : '/login'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const loggedIn = isLoggedIn()
  if (to.path !== '/login' && !loggedIn) {
    next('/login')
  } else if (to.path === '/login' && loggedIn) {
    next('/home')
  } else {
    next()
  }
})

export default router