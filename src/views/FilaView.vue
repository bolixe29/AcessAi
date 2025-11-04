<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import api from '../services/api.js' // Reutilizando nossa API

// Estado principal: uma lista única com todos que estão aguardando
const pacientesEmEspera = ref([])
const erro = ref(null)

// --- NOVOS REFS PARA DATA E HORA ---
const dataAtual = ref('')
const horaAtual = ref('')
let relogioInterval = null // Variável para guardar o ID do intervalo

// Quando o componente (página) é carregado
onMounted(() => {
  buscarFila()
  // ATUALIZADO: Atualiza a fila a cada 40 segundos
  setInterval(buscarFila, 40000)

  // Inicia o relógio
  atualizarRelogio()
  relogioInterval = setInterval(atualizarRelogio, 1000) // Atualiza o relógio a cada segundo
})

// Limpa o intervalo quando o componente é "desmontado"
onUnmounted(() => {
  clearInterval(relogioInterval)
})

// Função para buscar a fila (lógica inalterada)
async function buscarFila() {
  try {
    erro.value = null
    const hoje = new Date().toISOString().split('T')[0]
    const response = await api.get(`/agendamentos/data?data=${hoje}`)
    const todosAgendamentosDoDia = response.data

    const pacientesDaApi = todosAgendamentosDoDia.filter(
      (agendamento) =>
        agendamento.status &&
        (agendamento.status.startsWith('P') || agendamento.status.startsWith('C')),
    )

    pacientesEmEspera.value = pacientesDaApi.map((p) => ({
      id: p.id,
      nome: p.usuario.nome,
      especialidade: p.especialidade.nome,
      senha: p.status,
    }))
  } catch (err) {
    erro.value = 'Não foi possível carregar a fila.'
    console.error('Erro ao buscar fila:', err)
  }
}

// --- NOVA FUNÇÃO PARA O RELÓGIO ---
function atualizarRelogio() {
  const agora = new Date()
  // Ex: "TERÇA-FEIRA, 4 DE NOVEMBRO DE 2025"
  dataAtual.value = agora.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  // Ex: "17:47"
  horaAtual.value = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// --- FILA ÚNICA COM ORDENAÇÃO JUSTA (1P/3C) ---
const filaUnicaOrdenada = computed(() => {
  // 1. Separa as filas e ordena individualmente
  const preferenciais = pacientesEmEspera.value
    .filter((p) => p.senha && p.senha.startsWith('P'))
    .sort((a, b) => a.senha.localeCompare(b.senha))

  const padroes = pacientesEmEspera.value
    .filter((p) => p.senha && p.senha.startsWith('C'))
    .sort((a, b) => a.senha.localeCompare(b.senha))

  // 2. Implementa o critério de balanceamento (1 Preferencial para 3 Padrão)
  const filaFinal = []
  let pIdx = 0 // Índice da fila preferencial
  let cIdx = 0 // Índice da fila padrão

  // Continua enquanto houver pacientes em qualquer fila
  while (pIdx < preferenciais.length || cIdx < padroes.length) {
    // 1. Adiciona um preferencial (se houver)
    if (pIdx < preferenciais.length) {
      filaFinal.push(preferenciais[pIdx])
      pIdx++
    }

    // 2. Adiciona até três padrões (se houver)
    let countPadrao = 0
    while (cIdx < padroes.length && countPadrao < 3) {
      filaFinal.push(padroes[cIdx])
      cIdx++
      countPadrao++
    }
  }

  return filaFinal
})
</script>

<template>
  <div class="fila-container">
    <!-- CABEÇALHO SUPERIOR (AGORA EM LINHA: LOGO ESQUERDA, RELÓGIO DIREITA) -->
    <header class="fila-top-bar">
      <div class="logo-container">
        <!-- Reutilizando o logo do Totem -->
        <h1><span class="logo-main">Acess</span><span class="logo-slogan">Aí!</span></h1>
      </div>
      <!-- Relógio movido para a direita -->
      <div class="datetime-container">
        <h3 class="hora-atual">{{ horaAtual }}</h3>
        <h4 class="data-atual">{{ dataAtual }}</h4>
      </div>
    </header>

    <div v-if="erro" class="status-message erro">{{ erro }}</div>

    <!-- TABELA ÚNICA CENTRALIZADA -->
    <div class="filas-wrapper">
      <section class="fila-coluna">
        <!-- Título da tabela único e azul -->
        <h2>FILA DE ATENDIMENTO</h2>

        <table class="consultas-table">
          <thead>
            <tr>
              <th>Senha</th>
              <th>Nome</th>
              <th>Especialidade</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filaUnicaOrdenada.length === 0">
              <td colspan="3" class="fila-vazia">Nenhum paciente em espera.</td>
            </tr>
            <!-- Iterando sobre a nova fila balanceada -->
            <tr v-for="paciente in filaUnicaOrdenada" :key="paciente.id">
              <td class="senha-cell">{{ paciente.senha.split('-')[0] }}</td>
              <!-- Mostra só P001/C001 -->
              <td>{{ paciente.nome }}</td>
              <td>{{ paciente.especialidade }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* Estilos da FilaView */
.fila-container {
  padding: 40px;
  width: 100%;
  margin: 0 auto;
  font-family: Arial, Helvetica, sans-serif;
  box-sizing: border-box;
  /* Garante que o conteúdo comece abaixo da barra de acessibilidade global */
  padding-top: 120px;
}

/* CABEÇALHO SUPERIOR (LOGO ESQUERDA, RELÓGIO DIREITA) */
.fila-top-bar {
  display: flex;
  flex-direction: row; /* CORREÇÃO: Volta a ser linha */
  align-items: center; /* Alinha verticalmente */
  justify-content: space-between; /* CORREÇÃO: Separa os itens */
  gap: 20px;
  width: 100%;
  padding-bottom: 20px;
  border-bottom: 2px solid #00549f;
  margin-bottom: 2em;
}

.logo-container h1 {
  font-size: 3em; /* CORREÇÃO: "Grande" */
  margin: 0;
  color: #1a1a1a;
}
.logo-main {
  color: #00549f;
  font-weight: 800;
}
.logo-slogan {
  color: #28a745;
  font-weight: 600;
  border-left: 2px solid #28a745;
  padding-left: 5px;
  display: inline-block;
  transform: rotate(-5deg);
}

/* RELÓGIO (DIREITA E GRANDE) */
.datetime-container {
  text-align: right; /* CORREÇÃO: Alinha texto à direita */
  color: #1a1a1a;
  /* Remove o espaçamento extra se houver */
  flex-shrink: 0;
}
.hora-atual {
  font-size: 4em;
  font-weight: 900;
  margin: 0;
  color: #00549f;
  text-transform: uppercase;
}
.data-atual {
  font-size: 1.5em;
  font-weight: bold;
  margin: 0;
  color: #555;
  text-transform: uppercase;
}
/* FIM DO CABEÇALHO */

.filas-wrapper {
  display: flex;
  gap: 30px;
  justify-content: center;
}

.fila-coluna {
  flex-grow: 0;
  flex-shrink: 0;
  width: 100%;
  max-width: 900px;
}

/* TÍTULO DA TABELA */
.fila-coluna h2 {
  font-size: 2em;
  text-align: center;
  padding: 15px;
  color: white;
  border-radius: 8px 8px 0 0;
  background-color: #00549f;
  text-transform: uppercase;
  font-weight: 900;
}

.fila-vazia {
  padding: 20px;
  text-align: center;
  color: #888;
  font-style: italic;
  font-size: 1.1em;
}

/* Estilos da Tabela */
.consultas-table {
  border-collapse: collapse;
  background-color: #ffffff;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
  width: 100%;
}

.consultas-table th,
.consultas-table td {
  padding: 1em;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

/* CABEÇALHO (TH) DA TABELA */
.consultas-table th {
  background-color: #f7f7f7;
  font-weight: 900;
  color: #333333;
  font-size: 1.4em; /* CORREÇÃO: Aumentado (+4pt) */
  text-transform: uppercase;
}

/* CÉLULAS (TD) DA TABELA */
.consultas-table td {
  font-size: 1.3em; /* CORREÇÃO: Aumentado (+2pt) */
  font-weight: bold;
  text-transform: uppercase;
}

.senha-cell {
  font-weight: 900;
  color: #00549f;
  font-size: 1.4em; /* CORREÇÃO: Aumentado (para ficar maior que o nome) */
}

/* Mensagem de Erro */
.status-message.erro {
  color: red;
  font-weight: bold;
  text-align: center;
  font-size: 1.2em;
}

/* Estilos de Alto Contraste para a Fila */
.high-contrast .fila-top-bar {
  border-bottom-color: yellow !important;
}
.high-contrast .logo-main,
.high-contrast .logo-slogan {
  color: white !important;
  border-color: white !important;
}
.high-contrast .datetime-container {
  color: yellow !important;
}
.high-contrast .hora-atual {
  color: yellow !important;
}
.high-contrast .data-atual {
  color: yellow !important;
  font-weight: bold;
}

.high-contrast .fila-coluna h2 {
  background-color: yellow !important;
  color: black !important;
  border: 2px solid white;
}
.high-contrast .consultas-table {
  background-color: black !important;
  border: 1px solid white !important;
}
.high-contrast .consultas-table th,
.high-contrast .consultas-table td {
  background-color: black !important;
  color: yellow !important;
  border-color: white !important;
}
.high-contrast .fila-vazia {
  color: yellow !important;
}
.high-contrast .senha-cell {
  color: white !important;
}
</style>
