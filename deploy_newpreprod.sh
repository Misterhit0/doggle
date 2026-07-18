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
VPS_PREPROD_DIR="/var/www/woofyz-newpreprod"
PM2_APP_NAME="woofyz-newpreprod"
TARGET_PORT=3002

echo -e "${BLUE}=== 🎨 PIPELINE DE DÉPLOIEMENT BRANCHE BRANDING (NEW PREPROD) ===${NC}"

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" != "feature/new-branding-identity" ]; then
    echo -e "${RED}Erreur : Vous devez être sur la branche 'feature/new-branding-identity' pour déployer cet environnement.${NC}"
    exit 1
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
echo -e "\n${YELLOW}Tests et build validés. Prêt à déployer sur la nouvelle preprod (Port 3002).${NC}"
read -p "Entrez le message de commit : " COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="design: update styles and branding identity logo"
fi

read -p "Voulez-vous pousser les changements et déployer sur la nouvelle preprod (port 3002) ? (y/n) : " CONFIRM
if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "\n${BLUE}3. Commits et push sur GitHub...${NC}"
    git add .
    git commit -m "$COMMIT_MSG" || echo "Aucun changement à commiter."
    git push -u origin "$CURRENT_BRANCH"

    echo -e "\n${BLUE}4. Déploiement sur le VPS newpreprod (Port 3002)...${NC}"
    ssh "$VPS_HOST" "
        set -e
        
        # Ensure directories exist
        mkdir -p $VPS_PREPROD_DIR
        
        # Clone repo if not present
        if [ ! -d '$VPS_PREPROD_DIR/.git' ]; then
            echo '📦 Cloning repository on VPS...'
            git clone https://github.com/Misterhit0/woofyz.git $VPS_PREPROD_DIR
        fi

        cd $VPS_PREPROD_DIR
        
        echo '🌐 Setting git remote and safe directory...'
        git config --global --add safe.directory $VPS_PREPROD_DIR || true
        git remote set-url origin https://github.com/Misterhit0/woofyz.git

        echo '🧹 Cleaning untracked files...'
        git clean -fd

        echo '📦 Git pull target branch...'
        git fetch origin
        git checkout -f feature/new-branding-identity
        git pull origin feature/new-branding-identity

        echo '📦 Install dependencies...'
        pnpm install --frozen-lockfile

        echo '🗃️  Running database migrations...'
        pnpm db:migrate

        echo '🏗️  Building application...'
        pnpm build

        echo '🔄 Restarting PM2 on Port $TARGET_PORT...'
        PORT=$TARGET_PORT pm2 restart $PM2_APP_NAME || PORT=$TARGET_PORT pm2 start dist/index.js --name $PM2_APP_NAME --update-env

        echo '✅ VPS newpreprod redémarré avec succès'
    " && echo -e "${GREEN}✓ Déploiement VPS newpreprod réussi !${NC}" || {
        echo -e "${RED}❌ Erreur lors du déploiement VPS — vérifiez manuellement.${NC}"
        exit 1
    }

    echo -e "\n${GREEN}🚀 Succès ! Le code a été déployé sur la préproduction alternative.${NC}"
    echo -e "Vérifiez les changements sur : ${BLUE}http://187.55.227.99:3002 ou http://newpreprod.woofyz.fr${NC}"
else
    echo -e "\n${YELLOW}Déploiement annulé.${NC}"
fi
