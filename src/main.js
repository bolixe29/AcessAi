import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // <<< IMPORTE O ROTEADOR
import './main.css'

const app = createApp(App)

app.use(router) // <<< DIGA AO VUE PARA USAR O ROTEADOR

app.mount('#app')
