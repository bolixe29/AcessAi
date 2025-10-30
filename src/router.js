import { createRouter, createWebHashHistory } from 'vue-router'
import TotemView from './views/TotemView.vue'
import FilaView from './views/FilaView.vue' // Vamos criar este arquivo em breve

const routes = [
  {
    path: '/', // A raiz do site
    name: 'Totem',
    component: TotemView,
  },
  {
    path: '/fila', // A nova página da fila
    name: 'Fila',
    component: FilaView,
  },
]

const router = createRouter({
  history: createWebHashHistory(), // Usa o modo '#' (hash)
  routes,
})

export default router
