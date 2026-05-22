# Multi-stage Dockerfile para Next.js en producción
FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production

# Copiar listas de dependencias e instalar (incluye dev para build)
COPY package*.json ./
RUN npm ci

# Copiar el resto y construir la app
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Instalar solo dependencias de producción
COPY package*.json ./
RUN npm ci --production

# Copiar artefactos de build y activos estáticos
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "start"]
