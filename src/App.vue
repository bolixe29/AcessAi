<script setup>
import { ref, watch } from 'vue'

// --- LÓGICA DE ACESSIBILIDADE GLOBAL ---
// Esta lógica agora vive no App.vue para afetar todas as páginas

// --- CONTROLE DE FONTE ---
const tamanhoFonteBase = ref(16) // Tamanho inicial

function aumentarFonte() {
  if (tamanhoFonteBase.value < 24) {
    tamanhoFonteBase.value += 2
  }
}

function diminuirFonte() {
  if (tamanhoFonteBase.value > 12) {
    tamanhoFonteBase.value -= 2
  }
}

// --- CONTROLE DE CONTRASTE ---
const altoContraste = ref(false)

// Aplica/Remove classe global no <html> para o contraste
watch(
  altoContraste,
  (newValue) => {
    if (newValue) {
      document.documentElement.classList.add('global-high-contrast')
    } else {
      document.documentElement.classList.remove('global-high-contrast')
    }
  },
  { immediate: true },
)
</script>

<template>
  <!-- 
    A "CASCA" DO APP
    Aplica as classes de acessibilidade (fonte e contraste) no container principal.
    Todo o conteúdo das rotas (<router-view>) será carregado dentro deste main.
  -->
  <main
    class="app-container"
    :style="{ fontSize: tamanhoFonteBase + 'px' }"
    :class="{ 'high-contrast': altoContraste }"
  >
    <!-- BARRA DE ACESSIBILIDADE (FIXA E GLOBAL) -->
    <div class="accessibility-bar">
      <span>Tamanho da Fonte:</span>
      <button @click="diminuirFonte" aria-label="Diminuir tamanho da fonte">-A</button>
      <button @click="aumentarFonte" aria-label="Aumentar tamanho da fonte">+A</button>

      <button @click="altoContraste = !altoContraste" aria-label="Ativar/Desativar Alto Contraste">
        <span v-if="!altoContraste">Contraste</span>
        <span v-else>Contraste ON</span>
      </button>
    </div>

    <!-- 
      O PONTO DE INJEÇÃO
      Aqui é onde o Vue Router vai carregar o TotemView.vue ou o FilaView.vue 
      dependendo da URL ( / ou /#/fila )
    -->
    <router-view />
  </main>
</template>

<style scoped>
/* ESTILOS GLOBAIS DA "CASCA"
  Estes estilos se aplicam ao container principal e à barra de acessibilidade.
  Os estilos específicos do Totem (logo, formulário, tabela) estão agora em TotemView.vue
*/

.app-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  color: #333333;
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
  background-color: inherit; /* Herda o fundo do #app (via main.css) */
}

/* BARRA DE ACESSIBILIDADE */
.accessibility-bar {
  position: absolute;
  top: 40px;
  right: 40px;
  display: flex;
  align-items: center;
  gap: 1em;
  background-color: #ffffff;
  padding: 10px 15px;
  border-radius: 0.5em;
  border: 1px solid #cccccc;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 1em; /* Tamanho fixo, não muda com o zoom */
  z-index: 1000;
  transition:
    background-color 0.3s ease,
    color 0.3s ease,
    border-color 0.3s ease;
}

.accessibility-bar span {
  font-size: 1em;
  color: #333;
  transition: color 0.3s ease;
}

.accessibility-bar button {
  width: auto;
  padding: 8px 15px;
  font-size: 1em;
  font-weight: bold;
  border-radius: 0.5em;
  background-color: #00549f;
  color: #ffffff;
  border: none;
  cursor: pointer;
  transition:
    background-color 0.3s,
    color 0.3s;
}

.accessibility-bar button span {
  color: inherit;
  font-weight: bold;
}

/* ESTILOS DE ALTO CONTRASTE PARA A "CASCA" */

.high-contrast {
  color: yellow !important;
}

.high-contrast .accessibility-bar {
  background-color: black !important;
  border-color: white !important;
}

.high-contrast .accessibility-bar span {
  color: yellow !important;
}

.high-contrast .accessibility-bar button {
  background-color: yellow !important;
  color: black !important;
  border: 2px solid white !important;
}

.high-contrast .accessibility-bar button span {
  color: black !important;
}
</style>
