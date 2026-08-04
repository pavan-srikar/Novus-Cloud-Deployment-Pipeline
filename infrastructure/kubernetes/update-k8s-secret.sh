#!/bin/bash

set -e

KUBECTL="sudo k3s kubectl"

echo "Updating Kubernetes Secret..."

$KUBECTL delete secret novus-secret \
  -n novus \
  --ignore-not-found

$KUBECTL create secret generic novus-secret \
  -n novus \
  --from-literal=POSTGRES_USER="$POSTGRES_USER" \
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  --from-literal=POSTGRES_DB="$POSTGRES_DB" \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=GEMINI_API_KEY="$GEMINI_API_KEY" \
  --from-literal=GROQ_API_KEY="$GROQ_API_KEY" \
  --from-literal=OPENROUTER_API_KEY="$OPENROUTER_API_KEY" \
  --from-literal=DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY"

echo "Restarting backend..."

$KUBECTL rollout restart deployment/backend -n novus

$KUBECTL rollout status deployment/backend -n novus

echo "✅ Kubernetes Secret updated successfully."