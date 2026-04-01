import { createApp } from 'vue'
import App from './App.vue'
import { registerSW } from 'virtual:pwa-register'

const app = createApp(App)
app.mount('#app')

// 注册 Service Worker
registerSW({ immediate: true })
