#!/bin/bash

# Setup rapido per deploy su Cloud Run
# Questo script configura tutto il necessario per il primo deploy

echo "🔧 Setup Google Cloud Run - NestJS Microservice"
echo "================================================"
echo ""

# Chiedi il Project ID se non fornito
read -p "Inserisci il tuo Google Cloud Project ID: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID è richiesto!"
    exit 1
fi

echo ""
echo "📋 Configurazione in corso..."
echo ""

# Imposta il progetto
echo "1️⃣  Impostando il progetto..."
gcloud config set project $PROJECT_ID

# Abilita le API
echo "2️⃣  Abilitando le API necessarie..."
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable firestore.googleapis.com

# Verifica Firestore
echo ""
echo "3️⃣  Verifica Firestore..."
echo "   ⚠️  Assicurati che Firestore sia abilitato in modalità Native:"
echo "   👉 https://console.cloud.google.com/firestore/data?project=$PROJECT_ID"
echo ""
read -p "   Premi INVIO quando Firestore è pronto..."

# Genera JWT Secret
echo ""
echo "4️⃣  Generando JWT Secret..."
JWT_SECRET=$(openssl rand -base64 32)
echo "   JWT_SECRET generato: $JWT_SECRET"
echo "   💾 Salvato in .env.production"
echo "JWT_SECRET=$JWT_SECRET" > .env.production

echo ""
echo "✅ Setup completato!"
echo ""
echo "📝 Prossimi passi:"
echo ""
echo "1. Push su GitHub:"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'Initial commit'"
echo "   git remote add origin https://github.com/USERNAME/REPO.git"
echo "   git push -u origin main"
echo ""
echo "2. Deploy su Cloud Run:"
echo "   ./deploy.sh $PROJECT_ID"
echo ""
echo "Oppure segui la guida completa in DEPLOY.md"
echo ""
