#!/usr/bin/env bash
# Déploiement / mise à jour d'Almadi Shop sur le serveur.
# Usage : ./deploy.sh
set -e

echo "→ Installation des dépendances API…"
cd backend && npm ci --omit=dev

if [ ! -f .env ]; then
  echo "→ Création du fichier .env"
  cp .env.example .env
  SECRET=$(openssl rand -hex 32)
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$SECRET|" .env
  sed -i "s|^NODE_ENV=.*|NODE_ENV=production|" .env
  echo "  ⚠  Ouvrez backend/.env et renseignez CORS_ORIGIN avec votre nom de domaine."
fi

if [ ! -f data/almadi.db ]; then
  echo "→ Première installation : création de la base…"
  npm run seed
fi

echo "→ Compilation de la boutique…"
cd ../frontend && npm ci && npm run build

echo
echo "✓ Terminé. Démarrez avec :  sudo systemctl restart almadi"
echo "  (ou, pour tester :  cd backend && npm start)"
