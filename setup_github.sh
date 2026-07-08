#!/bin/bash

echo "=========================================================="
echo "😺 CONFIGURATION DU DEPOT GITHUB DOGGLE & CI/CD"
echo "=========================================================="

# 1. Connexion à GitHub
if ! gh auth status &>/dev/null; then
    echo "🔑 Connexion à GitHub requise..."
    echo "Veuillez vous connecter à votre compte (gregoirebenjamin13@gmail.com) :"
    gh auth login -h github.com -p https -w
fi

# Récupération du login
USER_LOGIN=$(gh api user -q .login)
if [ -z "$USER_LOGIN" ]; then
    echo "❌ Erreur : Connexion GitHub échouée."
    exit 1
fi
echo "✅ Connecté avec succès en tant que : $USER_LOGIN"

# 2. Initialisation du dépôt local
if [ ! -d ".git" ]; then
    echo "🗂️ Initialisation du dépôt Git local..."
    git init
    git branch -M main
fi

# 3. Premier commit
echo "📝 Création du premier commit local..."
git add .
git commit -m "Initial commit - Doggle with N8n & CI/CD"

# 4. Création du dépôt distant sur GitHub et push
echo "🌐 Création du dépôt public sur GitHub..."
gh repo create doggle --public --source=. --remote=origin --push

# 5. Configuration de la clé SSH pour le déploiement automatique (CI/CD)
echo "🔒 Ajout de la clé SSH du VPS dans les secrets GitHub pour le CI/CD..."
if [ -f "$HOME/.ssh/id_rsa" ]; then
    gh secret set VPS_SSH_KEY < "$HOME/.ssh/id_rsa"
    echo "✅ Secret VPS_SSH_KEY configuré avec succès dans le dépôt !"
else
    echo "⚠️ Attention : Fichier de clé $HOME/.ssh/id_rsa introuvable. Vous devrez configurer manuellement le secret 'VPS_SSH_KEY' dans GitHub pour que le déploiement automatique fonctionne."
fi

echo "=========================================================="
echo "🎉 CONFIGURATION TERMINEE AVEC SUCCES !"
echo "Votre dépôt GitHub est disponible ici :"
echo "https://github.com/$USER_LOGIN/doggle"
echo "=========================================================="
