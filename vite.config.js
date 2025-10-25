import { fileURLToPath, URL } from 'node:url' // <<< LINHA ADICIONADA/CORRIGIDA

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // Agora o fileURLToPath será reconhecido aqui
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // O bloco 'build' permanece como estava (geralmente não é necessário para axios)
  build: {
    rollupOptions: {
      external: [
        // 'axios' // Manter comentado a menos que o erro volte
      ],
      output: {
        globals: {
          // axios: 'axios' // Manter comentado
        },
      },
    },
  },
})
