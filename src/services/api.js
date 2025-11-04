// src/services/api.js
import axios from 'axios'

// Cria instância do Axios com a URL base da API Java.
// Use o IP do seu homelab que é acessível pela sua rede.
const api = axios.create({
  baseURL: 'http://100.105.137.90:8080', // Pode ser alterado para o IP público, se necessário.
  //baseURL: 'http://169.254.216.225:8080', // Pode ser alterado para o IP público, se necessário.
})

// Exporte a instância para uso em outros arquivos.
export default api
