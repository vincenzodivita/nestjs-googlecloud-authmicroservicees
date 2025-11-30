# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copia solo le dipendenze di produzione
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copia il build dalla fase precedente
COPY --from=builder /app/dist ./dist

# Esponi la porta (Cloud Run la sovrascrive con PORT env var)
EXPOSE 8080

# Utente non root per sicurezza
USER node

# Avvia l'applicazione
CMD ["node", "dist/main"]
