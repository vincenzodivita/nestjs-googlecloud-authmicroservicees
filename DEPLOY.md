# 🚀 Deploy Rapido su Cloud Run da GitHub

## Prerequisiti

1. **Account Google Cloud** con Firestore abilitato
2. **Google Cloud SDK** installato ([Download](https://cloud.google.com/sdk/docs/install))
3. **Account GitHub**

---

## 📋 Step 1: Preparazione Google Cloud

### 1.1 Login e configurazione

```bash
# Login su Google Cloud
gcloud auth login

# Imposta il progetto (sostituisci YOUR_PROJECT_ID)
gcloud config set project YOUR_PROJECT_ID

# Verifica che Firestore sia abilitato
# Vai su: https://console.cloud.google.com/firestore
# Se non attivo, clicca "Select Native Mode"
```

### 1.2 Abilita le API necessarie

```bash
# Abilita Cloud Run API
gcloud services enable run.googleapis.com

# Abilita Container Registry API
gcloud services enable containerregistry.googleapis.com

# Abilita Cloud Build API (per deploy da sorgente)
gcloud services enable cloudbuild.googleapis.com
```

---

## 📦 Step 2: Push su GitHub

### 2.1 Crea un nuovo repository su GitHub

1. Vai su [github.com/new](https://github.com/new)
2. Nome: `nestjs-microservice` (o quello che preferisci)
3. Visibilità: **Private** o Public
4. **NON** inizializzare con README
5. Clicca "Create repository"

### 2.2 Push del codice

```bash
# Entra nella cartella del progetto
cd nestjs-microservice

# Inizializza git (se non già fatto)
git init

# Aggiungi tutti i file
git add .

# Commit iniziale
git commit -m "Initial commit: NestJS microservice with Firestore auth"

# Aggiungi il remote (sostituisci USERNAME e REPO_NAME)
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# Push su GitHub
git push -u origin main
```

Se ti chiede le credenziali, usa un **Personal Access Token** invece della password:
- Vai su GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
- Generate new token > Seleziona `repo` scope
- Copia il token e usalo come password

---

## 🚀 Step 3: Deploy su Cloud Run

### Opzione A: Deploy Diretto (Consigliato)

```bash
# Deploy automatico con script
./deploy.sh YOUR_PROJECT_ID europe-west1 nestjs-microservice
```

### Opzione B: Deploy Manuale

```bash
# Deploy da sorgente locale
gcloud run deploy nestjs-microservice \
  --source . \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars JWT_SECRET=$(openssl rand -base64 32)
```

### Opzione C: Deploy da GitHub (CI/CD)

1. **Autorizza Cloud Build ad accedere a GitHub:**
   ```bash
   # Apri la console Cloud Build
   open "https://console.cloud.google.com/cloud-build/triggers"
   
   # Connetti il repository GitHub
   # Clicca "Connect Repository" e segui le istruzioni
   ```

2. **Crea un trigger Cloud Build:**
   - Vai su Cloud Build > Triggers
   - "Create Trigger"
   - Nome: `deploy-nestjs-microservice`
   - Event: Push to branch
   - Branch: `^main$`
   - Configuration: Cloud Build configuration file
   - Location: Repository
   - Cloud Build configuration file: `cloudbuild.yaml`

3. **Crea il file cloudbuild.yaml** (già incluso nel progetto)

Ora ad ogni push su `main`, il servizio viene deployato automaticamente!

---

## 🔧 Step 4: Configurazione Post-Deploy

### 4.1 Imposta JWT_SECRET personalizzato

```bash
# Genera un secret sicuro
JWT_SECRET=$(openssl rand -base64 32)

# Aggiornalo su Cloud Run
gcloud run services update nestjs-microservice \
  --region europe-west1 \
  --set-env-vars JWT_SECRET=$JWT_SECRET

# Salva il secret in un posto sicuro!
echo "JWT_SECRET=$JWT_SECRET" >> .env.production
```

### 4.2 Ottieni l'URL del servizio

```bash
# Mostra i dettagli del servizio
gcloud run services describe nestjs-microservice --region europe-west1

# Oppure solo l'URL
gcloud run services describe nestjs-microservice \
  --region europe-west1 \
  --format='value(status.url)'
```

---

## 🧪 Step 5: Testa l'API

### 5.1 Health Check

```bash
# Salva l'URL
SERVICE_URL=$(gcloud run services describe nestjs-microservice \
  --region europe-west1 \
  --format='value(status.url)')

# Test health check
curl $SERVICE_URL/auth/health
```

### 5.2 Test Register

```bash
# Register nuovo utente
curl -X POST $SERVICE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

Dovresti ricevere:
```json
{
  "user": {
    "id": "...",
    "email": "test@example.com",
    "name": "Test User",
    "createdAt": "..."
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 5.3 Test Login

```bash
# Login
curl -X POST $SERVICE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 5.4 Test Profile (Endpoint Protetto)

```bash
# Salva il token dalla risposta precedente
TOKEN="your-jwt-token-here"

# Accedi al profilo
curl -X GET $SERVICE_URL/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Step 6: Monitoring

### Visualizza i logs

```bash
# Logs in tempo reale
gcloud run services logs tail nestjs-microservice --region europe-west1

# Oppure vai su Cloud Console
open "https://console.cloud.google.com/run/detail/europe-west1/nestjs-microservice/logs"
```

### Visualizza le metriche

```bash
# Apri la dashboard Cloud Run
open "https://console.cloud.google.com/run/detail/europe-west1/nestjs-microservice/metrics"
```

### Visualizza i dati su Firestore

```bash
# Apri Firestore Console
open "https://console.cloud.google.com/firestore/data"

# Dovresti vedere la collection 'users' con i dati registrati
```

---

## 🔒 Step 7: Sicurezza (Opzionale ma Consigliato)

### 7.1 Usa Secret Manager per JWT_SECRET

```bash
# Crea un secret
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create jwt-secret --data-file=-

# Dai accesso al service account di Cloud Run
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding jwt-secret \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Aggiorna Cloud Run per usare il secret
gcloud run services update nestjs-microservice \
  --region europe-west1 \
  --update-secrets=JWT_SECRET=jwt-secret:latest
```

### 7.2 Abilita autenticazione (solo utenti autorizzati)

```bash
# Rimuovi accesso pubblico
gcloud run services update nestjs-microservice \
  --region europe-west1 \
  --no-allow-unauthenticated

# Per testare dovrai usare un identity token
gcloud auth print-identity-token
```

---

## 🎯 Comandi Utili

```bash
# Aggiorna il servizio dopo modifiche
gcloud run services update nestjs-microservice --region europe-west1

# Elimina il servizio
gcloud run services delete nestjs-microservice --region europe-west1

# Lista tutti i servizi
gcloud run services list

# Descrivi il servizio
gcloud run services describe nestjs-microservice --region europe-west1
```

---

## 🐛 Troubleshooting

### Errore: "Permission denied"
```bash
# Verifica i permessi del service account
gcloud projects get-iam-policy YOUR_PROJECT_ID

# Aggiungi ruolo Firestore User se mancante
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/datastore.user"
```

### Errore: "Build failed"
```bash
# Verifica che Cloud Build sia abilitato
gcloud services enable cloudbuild.googleapis.com

# Controlla i logs di build
gcloud builds list --limit=5
gcloud builds log [BUILD_ID]
```

### Servizio non risponde
```bash
# Controlla i logs
gcloud run services logs read nestjs-microservice --region europe-west1 --limit=50

# Verifica lo stato
gcloud run services describe nestjs-microservice --region europe-west1
```

---

## ✅ Checklist Finale

- [ ] Firestore abilitato su Google Cloud
- [ ] API abilitate (run, cloudbuild, containerregistry)
- [ ] Codice pushato su GitHub
- [ ] Deploy su Cloud Run completato
- [ ] JWT_SECRET configurato
- [ ] Endpoint testati (health, register, login, profile)
- [ ] Dati visibili su Firestore
- [ ] Logs controllati
- [ ] (Opzionale) Secret Manager configurato
- [ ] (Opzionale) CI/CD configurato con Cloud Build

---

## 🎉 Fatto!

Il tuo microservizio è ora live su Cloud Run!

URL del servizio: Recuperalo con
```bash
gcloud run services describe nestjs-microservice --region europe-west1 --format='value(status.url)'
```

Per modifiche future:
1. Modifica il codice
2. Commit e push su GitHub
3. Rideploy con `./deploy.sh YOUR_PROJECT_ID` o attendi il CI/CD

Buon coding! 🚀
