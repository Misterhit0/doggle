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

echo -e "${BLUE}=== 🚀 PIPELINE DE DÉPLOIEMENT PRODUCTION (DOGGLE) ===${NC}"

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

# Verify if we are on preprod
if [ "$CURRENT_BRANCH" != "preprod" ]; then
    echo -e "${YELLOW}Vous n'êtes pas sur la branche preprod (branche actuelle : $CURRENT_BRANCH).${NC}"
    read -p "Voulez-vous basculer sur preprod ? (y/n) : " SWITCH_PREPROD
    if [[ "$SWITCH_PREPROD" =~ ^[Yy]$ ]]; then
        git checkout preprod
        git pull origin preprod
    else
        echo -e "${RED}Erreur : Vous devez être sur la branche preprod pour déployer en production.${NC}"
        exit 1
    fi
fi

# Step 1: Double check tests on preprod
echo -e "\n${BLUE}1. Vérification finale des tests sur preprod...${NC}"
if pnpm test --run && pnpm build; then
    echo -e "${GREEN}✓ Les tests et le build sont parfaits !${NC}"
else
    echo -e "${RED}❌ Les tests ou le build échouent. Annulation.${NC}"
    exit 1
fi

# Step 2: Push changes from preprod to origin preprod
echo -e "\n${BLUE}2. Mise à jour de la branche preprod distante...${NC}"
git push origin preprod

# Step 3: Create Pull Request
read -p "Voulez-vous créer une Pull Request vers main ? (y/n) : " CREATE_PR
if [[ "$CREATE_PR" =~ ^[Yy]$ ]]; then
    if command -v gh &> /dev/null; then
        echo -e "${BLUE}Création de la Pull Request sur GitHub...${NC}"
        gh pr create --base main --head preprod \
            --title "Release: preprod → main $(date '+%Y-%m-%d')" \
            --body "Production release from preprod. All tests pass and changes validated on preprod.doggle.cloud." \
            || echo "La PR existe peut-être déjà."
    else
        echo -e "${YELLOW}Avertissement : gh CLI non installé. Ouvrez GitHub manuellement pour créer la PR.${NC}"
        echo -e "URL : https://github.com/Misterhit0/doggle/compare/main...preprod"
    fi
fi

read -p "Voulez-vous fusionner preprod vers main et déployer en PRODUCTION ? (y/n) : " MERGE_CONFIRM
if [[ "$MERGE_CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "\n${BLUE}3. Fusion locale et push de main...${NC}"
    git checkout main
    git pull origin main
    git merge preprod
    git push origin main

    echo -e "\n${BLUE}4. Déploiement sur le VPS production via git pull...${NC}"
    ssh "$VPS_HOST" "
        set -e
        cd $VPS_PROD_DIR
        git pull origin main
        pnpm install --frozen-lockfile
        pnpm db:migrate
        pnpm build
        pm2 restart $PM2_APP_NAME || pm2 start dist/index.js --name $PM2_APP_NAME
        echo '✅ VPS production redémarré avec succès'
    " && echo -e "${GREEN}✓ Déploiement VPS production réussi !${NC}" || echo -e "${RED}❌ Erreur lors du déploiement VPS prod — vérifiez manuellement.${NC}"

    # Return to preprod
    git checkout preprod

    echo -e "\n${GREEN}🎉 Succès ! Le code a été fusionné et déployé en PRODUCTION.${NC}"
    echo -e "Vérifiez les changements sur : ${BLUE}https://doggle.cloud${NC}"
else
    echo -e "\n${YELLOW}Fusion de production annulée. Resté sur la branche preprod.${NC}"
fi
