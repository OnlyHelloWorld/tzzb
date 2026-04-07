import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import LedgerPage from '../views/LedgerPage.vue'
import AllLedgersDetailPage from '../views/AllLedgersDetailPage.vue'
import LoginPage from '../components/LoginPage.vue'
import { isLoggedIn, getMe } from '../lib/api.js'

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
    path: '/all-ledgers-detail',
    name: 'AllLedgersDetail',
    component: AllLedgersDetailPage
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

router.beforeEach(async (to, from, next) => {
  const loggedIn = isLoggedIn()
  if (to.path !== '/login' && !loggedIn) {
    next('/login')
  } else if (to.path === '/login' && loggedIn) {
    next('/home')
  } else if (to.path !== '/login' && loggedIn) {
    try {
      await getMe()
    } catch (error) {
      console.error('验证用户失败:', error)
      next('/login')
      return
    }
    next()
  } else {
    next()
  }
})

export default router