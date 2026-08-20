# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copiar solo archivos necesarios
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/uploads ./uploads

# Instalar solo dependencias de producción
RUN npm ci --omit=dev

EXPOSE 3001
CMD ["node", "dist/index.js"]