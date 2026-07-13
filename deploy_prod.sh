#!/bin/bash
set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# VPS Config
VPS_HOST="root@187.55.227.99"
VPS_PROD_DIR="/var/www/woofyz"
PM2_APP_NAME="woofyz"

echo -e "${RED}=== 🚀 PIPELINE DE DÉPLOIEMENT PRODUCTION (WOOFYZ) ===${NC}"
echo -e "${YELLOW}⚠️  ATTENTION : Ce script déploie sur PRODUCTION. Procédez avec précaution.${NC}"

# Safety check: must be on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ Erreur : Vous devez être sur la branche 'main' pour déployer en production.${NC}"
    echo -e "   Branche actuelle : $CURRENT_BRANCH"
    exit 1
fi

echo -e "Branche : ${GREEN}main${NC}"

# Step 1: Run local tests
echo -e "\n${BLUE}1. Exécution des tests unitaires...${NC}"
if pnpm test --run; then
    echo -e "${GREEN}✓ Tous les tests unitaires ont réussi !${NC}"
else
    echo -e "${RED}❌ Les tests unitaires ont échoué. Déploiement annulé.${NC}"
    exit 1
fi

# Step 2: Run build validation
echo -e "\n${BLUE}2. Validation du build de production...${NC}"
if pnpm build; then
    echo -e "${GREEN}✓ Le build compile avec succès !${NC}"
else
    echo -e "${RED}❌ Échec de la compilation / build.${NC}"
    exit 1
fi

# Step 3: Confirmation
echo -e "\n${RED}⚠️  Vous êtes sur le point de déployer en PRODUCTION.${NC}"
read -p "Confirmez en tapant 'PROD' : " CONFIRM
if [ "$CONFIRM" != "PROD" ]; then
    echo -e "\n${YELLOW}Déploiement annulé.${NC}"
    exit 0
fi

echo -e "\n${BLUE}3. Push sur GitHub main...${NC}"
git push origin main

echo -e "\n${BLUE}4. Déploiement sur le VPS production...${NC}"
ssh "$VPS_HOST" "
    set -e
    cd $VPS_PROD_DIR

    echo '📦 Git pull...'
    git pull origin main

    echo '📦 Install dependencies...'
    pnpm install --frozen-lockfile

    echo '🗃️  Running database migrations...'
    pnpm db:migrate

    echo '🏗️  Building application...'
    pnpm build

    echo '🔄 Restarting PM2...'
    pm2 restart $PM2_APP_NAME || pm2 start dist/index.js --name $PM2_APP_NAME

    echo '✅ VPS production redémarré avec succès'
" && echo -e "${GREEN}✓ Déploiement VPS production réussi !${NC}" || {
    echo -e "${RED}❌ Erreur lors du déploiement VPS — vérifiez manuellement.${NC}"
    exit 1
}

echo -e "\n${GREEN}🚀 Succès ! Le code a été déployé en production.${NC}"
echo -e "Vérifiez les changements sur : ${BLUE}https://woofyz.com${NC}"
