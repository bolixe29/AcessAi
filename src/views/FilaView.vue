<template>
  <div class="fila-container">
    <h1>FILA DE ATENDIMENTO</h1>
    <p>(Em construção...)</p>

    <!-- Link para navegar de volta ao Totem (útil para testes) -->
    <nav>
      <router-link to="/">Voltar ao Totem</router-link>
    </nav>
  </div>
</template>

<style scoped>
.fila-container {
  padding: 40px;
  text-align: center;
  font-family: Arial, Helvetica, sans-serif;
  width: 100%;
  max-width: 900px;
  /* Espaçamento para não ficar embaixo da barra de acessibilidade */
  margin-top: 100px;
}
nav {
  margin-top: 40px;
  font-size: 1.2em;
  /* Estilo de link padrão do SUS */
  color: #00549f;
  font-weight: bold;
}
</style>
