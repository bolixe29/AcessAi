<script setup>
//import { ref, watch, computed } from 'vue'
import { ref } from 'vue'
import api from '../services/api.js'

// Variáveis de estado existentes
const etapa = ref('identificacao')
const cpf = ref('')
const usuario = ref(null)
const consultas = ref([])
const message = ref('')

// --- VARIÁVEIS DO MODAL E SENHA ---
const isModalVisivel = ref(false)
const consultaParaCheckin = ref(null)
const ultimaSenhaGerada = ref(null)

// Função de máscara (sem alteração)
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

// Função de busca (com a correção do status)
async function buscarConsultas() {
  if (!cpf.value) {
    message.value = 'Por favor, digite seu CPF.'
    return
  }
  try {
    message.value = 'Buscando seus dados...'
    const responseUsuario = await api.get(`/usuarios/cpf/${cpf.value}`)
    usuario.value = responseUsuario.data
    const usuarioId = usuario.value.id
    message.value = 'Verificando seus agendamentos...'
    const responseAgendamentos = await api.get(`/agendamentos/usuario/${usuarioId}`)
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
      procedimento: consulta.especialidade.nome,
      horario: formatarHorario(consulta.horario),
      status: consulta.status, // Lendo o status real do banco
    }))
    etapa.value = 'confirmacao'
    message.value = ''
    ultimaSenhaGerada.value = null
  } catch (error) {
    message.value = 'Erro ao processar seus dados. Procure a recepção.'
    console.error('Erro na busca:', error)
  }
}

// Lógica do Check-in (sem alteração)
function abrirModalCheckin(consulta) {
  if (consulta.status !== 'AGENDADO') return
  consultaParaCheckin.value = consulta
  isModalVisivel.value = true
}

async function executarCheckin(tipoAtendimento) {
  if (!consultaParaCheckin.value) return
  const consulta = consultaParaCheckin.value
  consultas.value = consultas.value.map((c) =>
    c.id === consulta.id ? { ...c, status: 'confirmando' } : c,
  )
  isModalVisivel.value = false
  try {
    const response = await api.post(`/agendamentos/${consulta.id}/checkin`, {
      tipo: tipoAtendimento,
    })
    const senhaGerada = response.data.status
    consultas.value = consultas.value.map((c) =>
      c.id === consulta.id ? { ...c, status: senhaGerada } : c,
    )
    ultimaSenhaGerada.value = senhaGerada
  } catch (error) {
    consultas.value = consultas.value.map((c) =>
      c.id === consulta.id ? { ...c, status: 'erro' } : c,
    )
    message.value = 'Erro ao realizar o check-in. Tente novamente.'
    console.error('Erro ao realizar o check-in:', error)
  }
}

// Formatar o horário (sem alteração)
function formatarHorario(horarioString) {
  if (!horarioString || typeof horarioString !== 'string') {
    return 'Aguardando'
  }
  const partes = horarioString.split(':')
  if (partes.length < 2) {
    return 'Inválido'
  }
  return `${partes[0]}:${partes[1]}`
}

// --- NOVA FUNÇÃO PARA LIMPAR O TOTEM ---
function resetarTotem() {
  etapa.value = 'identificacao'
  cpf.value = ''
  usuario.value = null
  consultas.value = []
  message.value = ''
  ultimaSenhaGerada.value = null
}
</script>

<template>
  <div class="checkin-container">
    <!-- Cabeçalho (Sem alteração) -->
    <header class="main-header">
      <h1><span class="logo-main">Acess</span><span class="logo-slogan">Aí!</span></h1>
      <p v-if="etapa === 'identificacao'">POR FAVOR, DIGITE SEU CPF PARA COMEÇAR.</p>
      <template v-else-if="etapa === 'confirmacao'">
        <h2 class="user-name-display">Olá, {{ usuario.nome }}!</h2>
        <p class="section-title-bold">PROCEDIMENTOS AGENDADOS</p>
      </template>
    </header>

    <!-- Conteúdo Principal (Formulário) (Sem alteração) -->
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

    <!-- Tabela e Senha (Botão SAIR adicionado) -->
    <div v-else-if="etapa === 'confirmacao'" class="main-content">
      <table class="consultas-table">
        <thead>
          <tr>
            <th>Especialidade</th>
            <th>Horário</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="consulta in consultas" :key="consulta.id">
            <td>{{ consulta.procedimento }}</td>
            <td>{{ consulta.horario }}</td>
            <td>
              <div v-if="consulta.status !== 'AGENDADO'" class="status-confirmado">
                <span v-if="consulta.status === 'confirmando'">Processando...</span>
                <span v-else-if="consulta.status === 'erro'">Erro!</span>
                <span v-else>Confirmado ✓</span>
              </div>
              <button v-else @click="abrirModalCheckin(consulta)" class="btn-confirmar-chegada">
                <span>Confirmar Chegada</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Div da senha (agora só mostra a última senha gerada) -->
      <div v-if="ultimaSenhaGerada" class="senha-display-global">
        SENHA DE ATENDIMENTO: <strong>{{ ultimaSenhaGerada }}</strong>
      </div>

      <!-- NOVO BOTÃO DE SAIR/LIMPAR -->
      <div class="botao-sair-container">
        <button @click="resetarTotem" class="btn-secondary full-width">SAIR (NOVA CONSULTA)</button>
      </div>
    </div>
  </div>

  <!-- MODAL DE AUTODECLARAÇÃO (Sem alteração) -->
  <div v-if="isModalVisivel" class="modal-overlay">
    <div class="modal-content">
      <h2>ATENDIMENTO PREFERENCIAL?</h2>
      <p>Selecione uma opção para gerar sua senha de atendimento.</p>
      <div class="modal-botoes">
        <button
          class="btn-preferencial"
          @click="executarCheckin('PREFERENCIAL')"
          aria-label="Sim, sou preferencial"
        >
          <img src="/iconPrefSIM.ico" alt="Atendimento Preferencial" class="btn-icon" />
        </button>
        <button class="btn-padrao" @click="executarCheckin('PADRAO')">
          <strong>NÃO SOU PREFERENCIAL</strong>
        </button>
      </div>
      <button class="btn-cancelar" @click="isModalVisivel = false">Cancelar</button>
    </div>
  </div>
</template>

<style scoped>
/* Estilos 1, 2, 3 (Container, Texto, Formulário) - Sem alteração */
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
  color: #333333;
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
  background-color: inherit;
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
:is(input, button):focus-visible {
  outline: 3px solid #007bff;
  outline-offset: 2px;
}
.status-message {
  min-height: 2em;
  font-size: 1.2em;
  font-weight: bold;
  margin-bottom: 2em;
}
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

/* NOVO: Estilo para o botão Secundário (Sair) */
.btn-secondary {
  background-color: #6c757d; /* Um cinza neutro */
  color: #ffffff;
}
.btn-secondary:hover {
  background-color: #5a6268;
}

.full-width {
  width: 100%;
}

/* 4. ESTILOS DA TABELA (Nova Classe .status-confirmado) */
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
  vertical-align: middle;
}
.consultas-table th {
  background-color: #f7f7f7;
  font-weight: bold;
  color: #333333;
}
.btn-confirmar-chegada {
  width: 100%;
  padding: 0.8em;
  font-size: 1em;
  background-color: #00549f;
  color: white;
}
.status-confirmado {
  font-size: 1.1em;
  font-weight: bold;
  color: #28a745;
  text-align: center;
  padding: 0.8em;
}
.status-confirmado span {
  color: inherit;
}

/* NOVO: Container do botão de Sair */
.botao-sair-container {
  margin-top: 2em;
}

/* 5. ESTILOS DE ALTO CONTRASTE (Corrigido para .status-confirmado e .btn-secondary) */
.senha-display-global {
  font-size: 2em;
  font-weight: bold;
  color: #1a1a1a;
  text-align: center;
  padding: 1em;
  margin-top: 1em;
  background-color: #f0f2f5;
  border-radius: 8px;
  border: 2px dashed #00549f;
}
.senha-display-global strong {
  color: #00549f;
  font-size: 1.5em;
  display: block;
}
.high-contrast {
  color: yellow !important;
}
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
.high-contrast button.btn-primary,
.high-contrast button.full-width {
  background-color: yellow !important;
  color: black !important;
  border: 2px solid white !important;
}
/* NOVO: Estilo do botão Sair no contraste */
.high-contrast button.btn-secondary {
  background-color: #333 !important; /* Cinza escuro */
  color: white !important;
  border: 2px solid white !important;
}
.high-contrast .consultas-table {
  background-color: black !important;
  border: 1px solid white !important;
  box-shadow: none;
}
.high-contrast .consultas-table th {
  background-color: black !important;
  color: yellow !important;
  border-color: white !important;
}
.high-contrast .consultas-table td {
  color: yellow !important;
  border-bottom-color: white !important;
}
.high-contrast .consultas-table td button.btn-confirmar-chegada {
  background-color: yellow !important;
  color: black !important;
  border: 2px solid white !important;
}
.high-contrast .status-confirmado span,
.high-contrast .status-confirmado {
  color: white !important;
}
.high-contrast .senha-display-global {
  background-color: #111;
  color: yellow;
  border-color: yellow;
}
.high-contrast .senha-display-global strong {
  color: white;
}

/* MODAL E SEUS ESTILOS (Sem alteração) */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}
.modal-content {
  background-color: white;
  padding: 2.5em;
  border-radius: 1em;
  text-align: center;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}
.modal-content h2 {
  font-size: 2em;
  color: #1a1a1a;
  margin-top: 0;
  margin-bottom: 0.5em;
}
.modal-content p {
  font-size: 1.2em;
  color: #555;
  margin-bottom: 2em;
}
.modal-botoes {
  display: flex;
  justify-content: center;
  gap: 1.5em;
  margin-bottom: 2em;
}
.modal-botoes button {
  width: 200px;
  height: 150px;
  font-weight: bold;
  border-radius: 1em;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
  box-sizing: border-box;
}
.btn-preferencial {
  background-color: #294887;
  color: white;
}
.btn-preferencial .btn-icon {
  width: 128px;
  height: 128px;
  object-fit: contain;
}
.btn-padrao {
  background-color: #28a745;
  color: white;
  flex-direction: column;
}
.btn-cancelar {
  width: auto;
  padding: 0.8em 1.5em;
  font-size: 1em;
  font-weight: normal;
  color: #777;
  background-color: transparent;
  border: none;
  text-decoration: underline;
}
.high-contrast .modal-content {
  background-color: black !important;
  border: 2px solid white;
  color: yellow !important;
}
.high-contrast .modal-content h2,
.high-contrast .modal-content p {
  color: yellow !important;
}
.high-contrast .modal-botoes button {
  background-color: yellow !important;
  color: black !important;
  border: 2px solid white;
}
.high-contrast .btn-cancelar {
  color: yellow !important;
  background-color: transparent !important;
  border: none !important;
}
</style>
