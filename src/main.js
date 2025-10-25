// src/main.js

import { createApp, watch } from 'vue' // <<< ADICIONAMOS 'watch'
import App from './App.vue'
import './main.css'

const app = createApp(App)
app.mount('#app')

// LÓGICA DE CLASSE GLOBAL (O Novo Superpoder)
const root = document.documentElement // Pega a tag <html>
watch(
  () => app.config.globalProperties.altoContraste,
  (isHighContrast) => {
    if (isHighContrast) {
      root.classList.add('global-high-contrast')
    } else {
      root.classList.remove('global-high-contrast')
    }
  },
)
