<script setup>
import { ref, watch } from 'vue'
import api from './services/api.js'

// --- LÓGICA PARA CONTROLE DE FONTE ---
const tamanhoFonteBase = ref(16) // Tamanho inicial em pixels (padrão dos navegadores)

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

const etapa = ref('identificacao')
const cpf = ref('')
const usuario = ref(null)
const consultas = ref([])
const message = ref('')
const altoContraste = ref(false)

// Função de máscara
function formatarCPF(event) {
  let valor = event.target.value.replace(/\D/g, '')
  valor = valor.substring(0, 11)
  if (valor.length > 9) {
    valor = valor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  } else if (valor.length > 6) {
    valor = valor.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3')
  } else if (valor.length > 3) {
    valor = valor.replace(/(\d{3})(\d{3})/, '$1.$2')
  }
  cpf.value = valor
  event.target.value = valor
}

// A VERSÃO FINAL DA FUNÇÃO DE BUSCA
async function buscarConsultas() {
  if (!cpf.value) {
    message.value = 'Por favor, digite seu CPF.'
    return
  }

  try {
    message.value = 'Buscando seus dados...'

    // ETAPA 1: Busca o usuário pelo CPF.
    const responseUsuario = await api.get(`/usuarios/cpf/${cpf.value}`)
    usuario.value = responseUsuario.data
    const usuarioId = usuario.value.id

    message.value = 'Verificando seus agendamentos...'

    // ETAPA 2: Chama o novo endpoint que você criou.
    const responseAgendamentos = await api.get(`/agendamentos/usuario/${usuarioId}`)

    // ETAPA 3: Filtra apenas os agendamentos de hoje (o backend entrega todos do usuário)
    const hoje = new Date().toISOString().split('T')[0]
    const agendamentosDeHoje = responseAgendamentos.data.filter(
      (agendamento) => agendamento.data === hoje,
    )

    if (agendamentosDeHoje.length === 0) {
      message.value = `Olá, ${usuario.value.nome}. Não há agendamentos para você hoje.`
      return
    }

    consultas.value = agendamentosDeHoje.map((consulta) => ({
      id: consulta.id,
      procedimento: consulta.procedimento || consulta.especialidade.nome,
      horario: formatarHorario(consulta.horario),
      status: null,
    }))

    etapa.value = 'confirmacao'
    message.value = ''
  } catch (error) {
    message.value = 'Erro ao processar seus dados. Procure a recepção.'
    console.error('Erro na busca:', error)
  }
}

// A função para confirmar a chegada
async function confirmarChegada(consultaId) {
  try {
    const consulta = consultas.value.find((c) => c.id === consultaId)
    if (!consulta) return // Segurança extra

    consulta.status = 'confirmando' // Feedback visual imediato

    // A CHAMADA CORRETA PARA O ENDPOINT CRIADO:
    await api.post(`/agendamentos/${consultaId}/checkin`)

    // Sucesso!
    consulta.status = 'confirmado'
  } catch (error) {
    const consulta = consultas.value.find((c) => c.id === consultaId)
    if (consulta) consulta.status = 'erro'

    // Mensagem de erro para o usuário
    message.value =
      'Não foi possível confirmar a chegada. Por favor, tente novamente ou procure a recepção.'

    console.error('Erro ao realizar o check-in:', error)
  }
}

// Formatar o horário
function formatarHorario(horarioString) {
  // 1. Verifica se a gente recebeu algum texto. Se não, retorna o padrão.
  if (!horarioString || typeof horarioString !== 'string') {
    return 'Aguardando'
  }

  // A string "13:45:00" quebrada em um array ["13", "45", "00"]
  const partes = horarioString.split(':')

  // Verifica se a quebra deu certo (deve ter pelo menos 2 partes: hora e minuto)
  if (partes.length < 2) {
    return 'Inválido'
  }

  // Concatena novamente as duas partes.
  return `${partes[0]}:${partes[1]}` // O resultado será "13:45"
}

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
) // Executa uma vez na inicialização
</script>

<template>
  <main
    class="checkin-container"
    :style="{ fontSize: tamanhoFonteBase + 'px' }"
    :class="{ 'high-contrast': altoContraste }"
  >
    <!-- BARRA DE ACESSIBILIDADE (FIXA) -->
    <div class="accessibility-bar">
      <span>Tamanho da Fonte:</span>
      <button @click="diminuirFonte" aria-label="Diminuir tamanho da fonte">-A</button>
      <button @click="aumentarFonte" aria-label="Aumentar tamanho da fonte">+A</button>

      <button @click="altoContraste = !altoContraste" aria-label="Ativar/Desativar Alto Contraste">
        <span v-if="!altoContraste">Contraste</span>
        <span v-else>Contraste ON</span>
      </button>
    </div>

    <!-- CABEÇALHO PERMANENTE (LOGO E SAUDAÇÃO) -->
    <header class="main-header">
      <h1><span class="logo-main">Acess</span><span class="logo-slogan">Aí!</span></h1>

      <!-- Parágrafo de instrução que muda de acordo com a etapa -->
      <p v-if="etapa === 'identificacao'">POR FAVOR, DIGITE SEU CPF PARA COMEÇAR.</p>

      <!-- Saudações na etapa de confirmação -->
      <template v-else-if="etapa === 'confirmacao'">
        <h2 class="user-name-display">Olá, {{ usuario.nome }}!</h2>
        <p class="section-title-bold">PROCEDIMENTOS AGENDADOS</p>
      </template>
    </header>

    <!-- CONTEÚDO PRINCIPAL (FORMULÁRIO OU TABELA) -->
    <div v-if="etapa === 'identificacao'" class="main-content">
      <form @submit.prevent="buscarConsultas">
        <div class="input-group">
          <label for="cpf-input">CPF:</label>
          <input
            id="cpf-input"
            type="text"
            placeholder="DIGITE O CPF AQUI"
            aria-required="true"
            :value="cpf"
            @input="formatarCPF"
          />
        </div>

        <div class="status-message" aria-live="polite">{{ message }}</div>

        <button type="submit" class="btn-primary full-width">Buscar Agendamentos</button>
      </form>
    </div>

    <div v-else-if="etapa === 'confirmacao'" class="main-content">
      <table class="consultas-table">
        <thead>
          <tr>
            <th>Procedimento</th>
            <th>Horário</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="consulta in consultas" :key="consulta.id">
            <td>{{ consulta.procedimento }}</td>
            <td>{{ consulta.horario }}</td>
            <td>
              <button
                @click="confirmarChegada(consulta.id)"
                :disabled="consulta.status === 'confirmado'"
                :class="{ 'btn-success': consulta.status === 'confirmado' }"
              >
                <span v-if="!consulta.status">Confirmar Chegada</span>
                <span v-if="consulta.status === 'confirmando'">Confirmando...</span>
                <span v-if="consulta.status === 'confirmado'">Confirmado ✓</span>
                <span v-if="consulta.status === 'erro'">Erro! Tente Novamente</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

<style scoped>
/* 1. ESTRUTURA E LAYOUT GERAL */
.checkin-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 20px 50px;
  font-family: Arial, Helvetica, sans-serif;
  text-align: center;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  color: #333333; /* Cor de texto padrão */
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
  background-color: inherit; /* Garante que herde o fundo do #app */
}

.main-header {
  width: 100%;
  max-width: 700px;
  text-align: center;
  padding-top: 50px;
}

.main-content {
  width: 100%;
  max-width: 700px;
}

/* 2. ESTILOS DE TEXTO E LOGO */
h1 {
  font-size: 3.5em;
  margin-top: 1em;
  margin-bottom: 0.2em;
  color: #1a1a1a;
}

h2 {
  font-size: 2.5em;
  color: #00549f;
  margin-bottom: 0.2em;
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

p {
  font-size: 1.2em;
  color: #555555;
  margin-bottom: 3em;
}

.user-name-display {
  font-size: 2.5em;
  color: #1a1a1a;
  font-weight: 800;
  margin-top: 1em;
}

.section-title-bold {
  font-size: 1.5em;
  font-weight: 800;
  color: #1a1a1a;
  margin-top: 1em;
  margin-bottom: 0.5em;
}

/* 3. ESTILOS DE FORMULÁRIO */
.input-group {
  margin-bottom: 1.5em;
  text-align: left;
}

label {
  display: block;
  font-size: 1.2em;
  margin-bottom: 0.5em;
  font-weight: bold;
}

input {
  width: 100%;
  padding: 1em;
  font-size: 1.5em;
  background-color: #ffffff;
  color: #333333;
  border: 1px solid #cccccc;
  border-radius: 0.5em;
  box-sizing: border-box;
}

/* Foco */
:is(input, button):focus-visible {
  outline: 3px solid #007bff;
  outline-offset: 2px;
}

/* Status */
.status-message {
  min-height: 2em;
  font-size: 1.2em;
  font-weight: bold;
  margin-bottom: 2em;
}

/* Botões */
button {
  width: 100%;
  padding: 1.2em 2em;
  font-size: 1.3em;
  font-weight: bold;
  border: none;
  border-radius: 0.5em;
  cursor: pointer;
  transition:
    transform 0.1s ease,
    background-color 0.3s,
    color 0.3s;
}

button:active {
  transform: scale(0.98);
}

.btn-primary {
  background-color: #00549f;
  color: #ffffff;
}

.full-width {
  width: 100%;
}

/* Tabela */
.consultas-table {
  border-collapse: collapse;
  margin-top: 1em;
  background-color: #ffffff;
  border-radius: 0.5em;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.consultas-table th,
.consultas-table td {
  padding: 1em;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.consultas-table th {
  background-color: #f7f7f7;
  font-weight: bold;
  color: #333333;
}

.consultas-table td button {
  width: 100%;
  padding: 0.8em;
  font-size: 1em;
  background-color: #00549f;
  color: white;
}

.consultas-table td button.btn-success {
  background-color: #28a745;
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
  font-size: 1em;
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
}

.accessibility-bar button span {
  color: inherit;
  font-weight: bold;
}

/* --- ESTILOS DE ALTO CONTRASTE REESCRITOS --- */
/* A classe .high-contrast é aplicada ao <main> */
/* A classe .global-high-contrast é aplicada ao <html> pelo script */

/* Estilo base do container no modo contraste (herdará fundo do HTML) */
.high-contrast {
  background-color: transparent !important; /* <<< CORREÇÃO: Deixa o fundo do main transparente */
  color: yellow !important; /* Cor de texto padrão forçada */
}

/* Força cores específicas nos filhos do high-contrast */
.high-contrast h1,
.high-contrast h2,
.high-contrast p,
.high-contrast label,
.high-contrast .status-message,
.high-contrast .user-name-display,
.high-contrast .section-title-bold {
  color: yellow !important;
}

.high-contrast .logo-main,
.high-contrast .logo-slogan {
  color: white !important;
  border-color: white !important;
}

.high-contrast input {
  background-color: black !important;
  border: 1px solid white !important;
  color: yellow !important;
}

.high-contrast :is(input, button):focus-visible {
  outline-color: yellow !important;
}

/* Todos os botões (exceto os da tabela/barra) */
.high-contrast button.btn-primary, /* Aplica apenas ao botão primário */
.high-contrast button.full-width {
  /* E ao botão Buscar Agendamentos */
  background-color: yellow !important;
  color: black !important;
  border: 2px solid white !important;
}

/* Tabela no modo contraste */
.high-contrast .consultas-table {
  background-color: black !important;
  border: 1px solid white !important;
  box-shadow: none;
}

/* Cabeçalho da tabela (TH) */
.high-contrast .consultas-table th {
  background-color: black !important;
  color: yellow !important;
  border-color: white !important;
}

/* Células da tabela (TD) */
.high-contrast .consultas-table td {
  color: yellow !important;
  border-bottom-color: white !important;
}

/* Botão dentro da tabela */
.high-contrast .consultas-table td button {
  background-color: yellow !important;
  color: black !important;
  border: 2px solid white !important;
}

.high-contrast .consultas-table td button.btn-success {
  background-color: white !important;
  color: black !important;
  border-color: yellow !important;
}

/* Barra de Acessibilidade no modo contraste */
.high-contrast .accessibility-bar {
  background-color: black !important;
  border-color: white !important;
}

.high-contrast .accessibility-bar span {
  color: yellow !important;
}

/* Botões da Barra de Acessibilidade */
.high-contrast .accessibility-bar button {
  background-color: yellow !important;
  color: black !important;
  border: 2px solid white !important;
}

/* Span dentro dos botões da barra */
.high-contrast .accessibility-bar button span {
  color: black !important; /* Garante preto no "Contraste ON" */
}
</style>
