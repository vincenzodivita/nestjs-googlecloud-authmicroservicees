#!/bin/bash

# Script per deploy su Google Cloud Run
# Uso: ./deploy.sh [PROJECT_ID] [REGION] [SERVICE_NAME]

PROJECT_ID=${1:-"your-project-id"}
REGION=${2:-"europe-west1"}
SERVICE_NAME=${3:-"nestjs-microservice"}

echo "🚀 Deploying to Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo ""

# Imposta il progetto
gcloud config set project $PROJECT_ID

# Deploy
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 60 \
  --set-env-vars JWT_SECRET=$(openssl rand -base64 32)

echo ""
echo "✅ Deploy completato!"
echo "Per impostare un JWT_SECRET personalizzato:"
echo "gcloud run services update $SERVICE_NAME --region $REGION --set-env-vars JWT_SECRET=your-secret"
