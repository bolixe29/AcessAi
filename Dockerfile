# Etapa 1: Build - Usa uma imagem Node PADRÃO (não Alpine) para maior compatibilidade
FROM node:20 AS build 

WORKDIR /app

# Copia package.json e package-lock.json PRIMEIRO
COPY package*.json ./

# Usa npm ci para instalação limpa e consistente baseada no lockfile
# Isso é mais robusto que 'npm install' em ambientes CI/Docker
RUN npm ci

# Copia o restante do código-fonte (APÓS npm ci)
COPY . .

# Tenta reconstruir binários nativos se houver (segurança extra)
RUN npm rebuild

# Compila o projeto Vue/Vite, gerando a pasta 'dist'
RUN npm run build


# Etapa 2: Produção - Usa a imagem Node.js Alpine LEVE para servir
FROM node:20-alpine

WORKDIR /app

# Instala o 'serve' globalmente
RUN npm install -g serve

# Copia os arquivos compilados da etapa de build
COPY --from=build /app/dist /usr/src/app

# Comando final: Inicia o servidor 'serve' na porta 80
CMD ["serve", "-s", "/usr/src/app", "-l", "80"]