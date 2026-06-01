FROM node:20.19.6-alpine

WORKDIR /app

# Instalar pnpm globalmente
RUN npm install -g pnpm

# Copiar archivos de configuración
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json ./

# Instalar dependencias con pnpm
RUN pnpm install --frozen-lockfile

# Copiar todo el código
COPY . .

# Compilar TypeScript
RUN pnpm run build

# Limpiar y reinstalar solo producción (opcional pero recomendado)
RUN rm -rf node_modules && \
    pnpm install --prod --frozen-lockfile

EXPOSE 8080

CMD [ "node", "dist/index.js" ]