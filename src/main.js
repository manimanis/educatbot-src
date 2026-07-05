import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Styles globaux
import './assets/styles/main.css'
import './assets/styles/highlight.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
