import { createApp } from 'vue'
import App from './App.vue'
import { registerSW } from 'virtual:pwa-register'

const app = createApp(App)
app.mount('#app')

// 注册 Service Worker，检测到更新立即刷新
registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // 每小时检查一次更新
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)
    }
  },
  onNeedRefresh() {
    // 有新版本，立即刷新
    if (confirm('发现新版本，是否立即更新？')) {
      window.location.reload()
    }
  }
})
