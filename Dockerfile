# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install    # ← CAMBIA QUI (era npm ci)

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copia solo le dipendenze di produzione
COPY package*.json ./
RUN npm install --only=production && npm cache clean --force    # ← CAMBIA QUI (era npm ci)

# Copia il build dalla fase precedente
COPY --from=builder /app/dist ./dist

# Esponi la porta (Cloud Run la sovrascrive con PORT env var)
EXPOSE 8080

# Utente non root per sicurezza
USER node

# Avvia l'applicazione
CMD ["node", "dist/main"]
