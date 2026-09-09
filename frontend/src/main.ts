import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'
import { inicializarSentry } from './lib/sentry'

const app = createApp(App)
inicializarSentry(app)
app.use(createPinia())
app.use(router)
app.mount('#app')
