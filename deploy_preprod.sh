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
VPS_PREPROD_DIR="/var/www/woofyz-preprod"
PM2_APP_NAME="woofyz-preprod"

echo -e "${BLUE}=== 🧪 PIPELINE DE DÉPLOIEMENT PRÉPRODUCTION (WOOFYZ) ===${NC}"

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

# Verify if we are on main or preprod — force creation of a feature branch
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "preprod" ]; then
    echo -e "${YELLOW}Attention : Vous êtes sur la branche '$CURRENT_BRANCH'.${NC}"
    read -p "Entrez le nom d'une nouvelle branche de feature à créer (ex: feature/nom-tache) : " NEW_BRANCH
    if [ -z "$NEW_BRANCH" ]; then
        echo -e "${RED}Erreur : Le nom de la branche ne peut pas être vide.${NC}"
        exit 1
    fi
    git checkout preprod
    git pull origin preprod
    git checkout -b "$NEW_BRANCH"
    CURRENT_BRANCH=$NEW_BRANCH
fi

echo -e "Branche active : ${GREEN}$CURRENT_BRANCH${NC}"

# Step 1: Run local tests
echo -e "\n${BLUE}1. Exécution des tests unitaires...${NC}"
if pnpm test --run; then
    echo -e "${GREEN}✓ Tous les tests unitaires ont réussi !${NC}"
else
    echo -e "${RED}❌ Les tests unitaires ont échoué. Corrigez les erreurs avant de déployer.${NC}"
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

# Step 3: Prompt for commit and deploy
echo -e "\n${YELLOW}Tests et build validés. Prêt à déployer en préproduction.${NC}"
read -p "Entrez le message de commit : " COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="feat: evolution on $CURRENT_BRANCH"
fi

read -p "Voulez-vous pousser les changements et déployer sur preprod.woofyz.fr ? (y/n) : " CONFIRM
if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "\n${BLUE}3. Commits et push sur GitHub...${NC}"
    git add .
    git commit -m "$COMMIT_MSG" || echo "Aucun changement à commiter."
    git push -u origin "$CURRENT_BRANCH"

    echo -e "\n${BLUE}4. Fusion sur la branche preprod...${NC}"
    git checkout preprod
    git pull origin preprod
    git merge "$CURRENT_BRANCH"
    git push origin preprod

    echo -e "\n${BLUE}5. Déploiement sur le VPS preprod...${NC}"
    ssh "$VPS_HOST" "
        set -e
        cd $VPS_PREPROD_DIR

        echo '🧹 Cleaning untracked files...'
        git clean -fd

        echo '📦 Git pull...'
        git pull origin preprod

        echo '📦 Install dependencies...'
        pnpm install --frozen-lockfile

        echo '🗃️  Running database migrations...'
        pnpm db:migrate

        echo '🏗️  Building application...'
        pnpm build

        echo '🔄 Restarting PM2...'
        pm2 restart $PM2_APP_NAME || pm2 start dist/index.js --name $PM2_APP_NAME

        echo '✅ VPS preprod redémarré avec succès'
    " && echo -e "${GREEN}✓ Déploiement VPS preprod réussi !${NC}" || {
        echo -e "${RED}❌ Erreur lors du déploiement VPS — vérifiez manuellement.${NC}"
        git checkout "$CURRENT_BRANCH"
        exit 1
    }

    # Switch back to working branch
    git checkout "$CURRENT_BRANCH"

    echo -e "\n${GREEN}🚀 Succès ! Le code a été déployé sur la préproduction.${NC}"
    echo -e "Vérifiez les changements sur : ${BLUE}https://preprod.woofyz.fr${NC}"
else
    echo -e "\n${YELLOW}Déploiement annulé.${NC}"
fi
