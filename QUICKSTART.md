# 🚀 Deploy Immediato su Cloud Run

## Setup Rapido (3 minuti)

### 1️⃣ Setup Google Cloud

```bash
# Esegui lo script di setup
./setup.sh
```

Lo script farà:
- ✅ Configurare il progetto GCP
- ✅ Abilitare tutte le API necessarie
- ✅ Generare il JWT_SECRET
- ✅ Verificare Firestore

### 2️⃣ Push su GitHub

```bash
# Inizializza git
git init
git add .
git commit -m "Initial commit: NestJS microservice"

# Aggiungi il tuo repo GitHub (sostituisci USERNAME e REPO)
git remote add origin https://github.com/USERNAME/REPO.git
git branch -M main
git push -u origin main
```

### 3️⃣ Deploy!

```bash
# Deploy automatico su Cloud Run
./deploy.sh YOUR_PROJECT_ID
```

### 4️⃣ Testa

```bash
# Ottieni l'URL del servizio
SERVICE_URL=$(gcloud run services describe nestjs-microservice \
  --region europe-west1 \
  --format='value(status.url)')

# Test
curl $SERVICE_URL/auth/health

# Register
curl -X POST $SERVICE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test"}'
```

---

## 📚 Documentazione Completa

Per la guida dettagliata: vedi [DEPLOY.md](DEPLOY.md)

---

## 🎯 Comandi Essenziali

```bash
# Redeploy dopo modifiche
./deploy.sh YOUR_PROJECT_ID

# Vedi logs
gcloud run services logs tail nestjs-microservice --region europe-west1

# Ottieni URL
gcloud run services describe nestjs-microservice \
  --region europe-west1 \
  --format='value(status.url)'
```

---

## 🔧 Troubleshooting

**Errore Firestore?**
- Vai su https://console.cloud.google.com/firestore
- Seleziona "Native Mode"

**Errore permessi?**
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

**Deploy fallito?**
```bash
# Vedi i logs di build
gcloud builds list --limit=5
```

---

Fatto! Il tuo microservizio è live 🎉
