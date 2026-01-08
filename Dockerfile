FROM node:18-alpine

WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias
RUN npm ci

# Copiar todo el código
COPY . .

# Compilar TypeScript
RUN npm run build

# Limpiar node_modules y reinstalar solo producción (opcional)
RUN rm -rf node_modules && \
    npm ci --only=production

EXPOSE 8080

CMD [ "node", "dist/index.js" ]