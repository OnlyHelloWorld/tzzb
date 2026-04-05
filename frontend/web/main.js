import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setRouter } from './lib/api.js'

const app = createApp(App)
app.use(createPinia())
app.use(router)

setRouter(router)

app.mount('#app')