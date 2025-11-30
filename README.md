# NestJS Microservice con Firestore e JWT Auth

Microservizio modulare in NestJS con autenticazione JWT e Firestore DB, pronto per il deploy su Google Cloud Run.

## 🚀 Features

- ✅ Architettura modulare NestJS
- ✅ Autenticazione JWT
- ✅ Integrazione con Firestore
- ✅ Endpoints Register e Login
- ✅ Password hashing con bcrypt
- ✅ Validation con class-validator
- ✅ Pronto per Google Cloud Run

## 📁 Struttura del Progetto

```
├── src/
│   ├── auth/
│   │   ├── dto/
│   │   │   └── auth.dto.ts          # DTOs per register/login
│   │   ├── entities/
│   │   │   └── user.entity.ts       # User entity
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts    # JWT Guard
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts      # JWT Strategy
│   │   ├── auth.controller.ts       # Auth endpoints
│   │   ├── auth.service.ts          # Auth logic
│   │   └── auth.module.ts
│   ├── firestore/
│   │   ├── firestore.service.ts     # Firestore operations
│   │   └── firestore.module.ts
│   ├── app.module.ts
│   └── main.ts
├── Dockerfile
├── package.json
└── tsconfig.json
```

## 🛠️ Setup Locale

### Prerequisiti

- Node.js 20+
- Account Google Cloud
- Firestore abilitato nel progetto GCP

### Installazione

```bash
# Installa le dipendenze
npm install

# Copia il file .env.example
cp .env.example .env

# Modifica il file .env con il tuo JWT_SECRET
```

### Sviluppo Locale

Per lo sviluppo locale, hai bisogno di un service account:

1. Vai su Google Cloud Console
2. IAM & Admin > Service Accounts
3. Crea un nuovo service account con ruolo "Cloud Datastore User"
4. Scarica la chiave JSON
5. Imposta la variabile d'ambiente:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account.json"
```

Oppure usa l'emulatore Firestore:

```bash
# Installa Firebase CLI
npm install -g firebase-tools

# Avvia l'emulatore
firebase emulators:start --only firestore

# Nel tuo codice, connettiti all'emulatore
# (aggiungi questa logica in firestore.service.ts se necessario)
```

### Avvia il Server

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

Il server sarà disponibile su `http://localhost:8080`

## 🔐 API Endpoints

### Register

```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "Mario Rossi"
}
```

Response:
```json
{
  "user": {
    "id": "abc123",
    "email": "user@example.com",
    "name": "Mario Rossi",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response: (stesso formato del register)

### Get Profile (Protetto)

```bash
GET /auth/profile
Authorization: Bearer <your-jwt-token>
```

Response:
```json
{
  "id": "abc123",
  "email": "user@example.com",
  "name": "Mario Rossi",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Health Check

```bash
GET /auth/health
```

## 🚢 Deploy su Google Cloud Run

### Prerequisiti

```bash
# Installa Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login

# Imposta il progetto
gcloud config set project YOUR_PROJECT_ID
```

### Deploy Automatico

```bash
# Build e deploy in un solo comando
gcloud run deploy nestjs-microservice \
  --source . \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars JWT_SECRET=your-super-secret-key
```

### Deploy con Docker (Manuale)

```bash
# 1. Build l'immagine
docker build -t gcr.io/YOUR_PROJECT_ID/nestjs-microservice .

# 2. Push su Google Container Registry
docker push gcr.io/YOUR_PROJECT_ID/nestjs-microservice

# 3. Deploy su Cloud Run
gcloud run deploy nestjs-microservice \
  --image gcr.io/YOUR_PROJECT_ID/nestjs-microservice \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars JWT_SECRET=your-super-secret-key
```

### Configurare le Variabili d'Ambiente

Tramite Console:
1. Vai su Cloud Run
2. Seleziona il servizio
3. Edit & Deploy New Revision
4. Variables & Secrets
5. Aggiungi `JWT_SECRET`

Tramite CLI:
```bash
gcloud run services update nestjs-microservice \
  --update-env-vars JWT_SECRET=your-secret-key \
  --region europe-west1
```

### Permessi Firestore

Il servizio su Cloud Run ha automaticamente accesso a Firestore se:
- Firestore è abilitato nello stesso progetto
- Il service account di default ha i permessi necessari

Se necessario, aggiungi il ruolo:
```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/datastore.user"
```

## 🧪 Test dell'API

```bash
# Test Register
curl -X POST https://your-service-url/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# Test Login
curl -X POST https://your-service-url/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Test Profile (sostituisci TOKEN)
curl -X GET https://your-service-url/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📝 Struttura Firestore

```
users/
  {userId}/
    - email: string
    - password: string (hashed)
    - name: string
    - createdAt: timestamp
    - updatedAt: timestamp
```

## 🔒 Sicurezza

- ✅ Password hashate con bcrypt (10 rounds)
- ✅ JWT con scadenza 24h
- ✅ Validation automatica degli input
- ✅ CORS abilitato
- ✅ Container eseguito come utente non-root

**IMPORTANTE**: In produzione:
- Cambia `JWT_SECRET` con una chiave sicura
- Usa Secret Manager per le credenziali
- Configura CORS in modo restrittivo se necessario
- Abilita HTTPS (Cloud Run lo fa automaticamente)

## 🎯 Prossimi Passi

Per espandere il microservizio:

1. Aggiungi nuovi moduli (es. `nest g module products`)
2. Usa `FirestoreService` in altri moduli
3. Aggiungi refresh token
4. Implementa ruoli e permessi
5. Aggiungi rate limiting
6. Configura monitoring e logging

## 📚 Risorse

- [NestJS Documentation](https://docs.nestjs.com)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

## 📄 Licenza

MIT
