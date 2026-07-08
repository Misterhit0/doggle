# Guide de Conversion en App Mobile - Compagnon

## Vue d'ensemble

Ce guide couvre la conversion de l'application web Compagnon en applications mobiles natives pour iOS et Android en utilisant **Capacitor**.

## Prérequis

### Comptes développeur

#### Apple Developer Program
- **Coût** : 99 USD/an
- **Durée d'activation** : 24-48h
- **Accès requis** :
  - App Store Connect
  - Apple Developer Portal
  - Xcode (gratuit)
  - TestFlight pour les bêta tests

#### Google Play Developer
- **Coût** : 25 USD (une fois)
- **Durée d'activation** : Immédiate
- **Accès requis** :
  - Google Play Console
  - Android Studio (gratuit)
  - Google Play Internal Testing Track

### Certificats et Provisioning

#### iOS
- **Certificate Signing Request (CSR)** : Généré via Keychain Access
- **Distribution Certificate** : Créé via Apple Developer Portal
- **Provisioning Profile** : Spécifique à l'app ID
- **Durée de validité** : 1 an (à renouveler annuellement)

#### Android
- **Keystore** : Fichier de clés de signature (généré une fois, conservé)
- **Clé de signature** : Alias dans le keystore
- **Durée de validité** : 25+ ans (recommandé)

### Outils requis

| Outil | Version | Plateforme | Gratuit |
|-------|---------|-----------|--------|
| Node.js | 18+ | Tous | ✅ |
| npm/pnpm | 8+ | Tous | ✅ |
| Capacitor | 5+ | Tous | ✅ |
| Xcode | 14+ | macOS | ✅ |
| Android Studio | 2022+ | macOS/Windows/Linux | ✅ |
| CocoaPods | 1.11+ | macOS | ✅ |

## Architecture Capacitor

### Structure du projet

```
compagnon/
├── client/                    # Code React (web)
│   ├── src/
│   ├── dist/                 # Build web (généré)
│   └── package.json
├── server/                    # Backend Node.js
├── capacitor.config.ts       # Configuration Capacitor
├── ios/                      # Projet Xcode (généré)
└── android/                  # Projet Android Studio (généré)
```

### Flux de build

```
React Source → npm run build → dist/ → Capacitor → iOS/Android
```

## Étapes de mise en place

### 1. Installation de Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npx cap init compagnon com.compagnon.app
```

### 2. Configuration (capacitor.config.ts)

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.compagnon.app',
  appName: 'Compagnon',
  webDir: 'client/dist',
  server: {
    androidScheme: 'https',
    cleartext: true,  // Développement uniquement
  },
  plugins: {
    Geolocation: {
      permissions: ['location'],
    },
  },
};

export default config;
```

### 3. Build web

```bash
npm run build
```

### 4. Ajouter les plateformes

```bash
npx cap add ios
npx cap add android
```

### 5. Synchroniser les assets

```bash
npx cap sync
```

## Développement iOS

### Prérequis
- macOS 12+
- Xcode 14+
- Apple Developer Account

### Étapes

1. **Ouvrir le projet Xcode**
   ```bash
   npx cap open ios
   ```

2. **Configurer l'identité de signature**
   - Sélectionner le target "App"
   - Onglet "Signing & Capabilities"
   - Choisir votre Team ID
   - Xcode gère automatiquement le provisioning

3. **Configurer les permissions**
   - Info.plist : Ajouter les clés de permission requises
   - Geolocation : `NSLocationWhenInUseUsageDescription`
   - Photos : `NSPhotoLibraryUsageDescription`
   - Caméra : `NSCameraUsageDescription`

4. **Build et test**
   ```bash
   # Simulator
   npx cap open ios
   # Puis Cmd+R dans Xcode

   # Device (nécessite provisioning)
   # Connecter l'appareil et sélectionner dans Xcode
   ```

### Certificats de distribution

1. **Créer un Distribution Certificate**
   - Apple Developer Portal → Certificates
   - Sélectionner "App Store and Ad Hoc"
   - Télécharger et installer dans Keychain

2. **Créer un Provisioning Profile**
   - Sélectionner "App Store"
   - Associer à votre app ID
   - Télécharger et installer

3. **Archive et soumission**
   ```bash
   # Dans Xcode : Product → Archive
   # Puis Distribute App → App Store Connect
   ```

## Développement Android

### Prérequis
- Android Studio 2022+
- JDK 11+
- Google Play Developer Account

### Étapes

1. **Ouvrir le projet Android**
   ```bash
   npx cap open android
   ```

2. **Configurer les permissions**
   - AndroidManifest.xml : Ajouter les permissions requises
   - Geolocation : `android.permission.ACCESS_FINE_LOCATION`
   - Photos : `android.permission.READ_EXTERNAL_STORAGE`
   - Caméra : `android.permission.CAMERA`

3. **Générer la clé de signature**
   ```bash
   keytool -genkey -v -keystore compagnon.keystore \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -alias compagnon
   ```

4. **Build et test**
   ```bash
   # Emulator
   npx cap open android
   # Puis Run → Run 'app'

   # Device
   # Connecter l'appareil en mode debug
   # Puis Run → Run 'app'
   ```

5. **Build de release**
   ```bash
   # Build signed APK
   ./gradlew bundleRelease
   # Fichier généré : app/release/app-release.aab
   ```

## Soumission App Store

### Checklist iOS

- [ ] **Compte Apple Developer** actif et à jour
- [ ] **Certificat de distribution** valide
- [ ] **Provisioning Profile** App Store valide
- [ ] **App ID** créé dans Apple Developer Portal
- [ ] **App Store Connect** : Créer nouvelle app
- [ ] **Informations de l'app** :
  - [ ] Nom (60 caractères max)
  - [ ] Sous-titre (30 caractères max)
  - [ ] Description (4000 caractères max)
  - [ ] Mots-clés (100 caractères max)
  - [ ] Support URL
  - [ ] Privacy Policy URL
- [ ] **Captures d'écran** (5-10 par device)
  - [ ] iPhone 6.7" (1284x2778)
  - [ ] iPad 12.9" (2048x2732)
- [ ] **Icône d'app** (1024x1024, sans transparence)
- [ ] **Âge** : Sélectionner la catégorie appropriée
- [ ] **Informations de contact** et **support**
- [ ] **Paramètres de prix** et **disponibilité**
- [ ] **Informations de version** :
  - [ ] Version number (ex: 1.0.0)
  - [ ] Build number (ex: 1)
  - [ ] Notes de version
- [ ] **Archive Xcode** générée et validée
- [ ] **TestFlight** : Tester avec au moins 10 testeurs externes
- [ ] **Soumettre pour examen**

### Checklist Google Play

- [ ] **Compte Google Play Developer** actif
- [ ] **Keystore** généré et sécurisé
- [ ] **App Signing** configuré dans Google Play Console
- [ ] **Informations de l'app** :
  - [ ] Titre (50 caractères max)
  - [ ] Description courte (80 caractères max)
  - [ ] Description complète (4000 caractères max)
- [ ] **Captures d'écran** (2-8 par device)
  - [ ] Téléphone (1080x1920)
  - [ ] Tablette (1200x1920)
- [ ] **Icône d'app** (512x512)
- [ ] **Bannière de fonctionnalité** (1024x500)
- [ ] **Classification du contenu** complétée
- [ ] **Politique de confidentialité** URL
- [ ] **Catégorie** et **type d'app**
- [ ] **Paramètres de prix** et **distribution**
- [ ] **APK/AAB** signé généré
- [ ] **Tester sur Google Play Console** (Internal Testing)
- [ ] **Soumettre pour examen**

### Durée d'examen

| Plateforme | Durée | Rejet courant |
|-----------|-------|--------------|
| **App Store** | 24-48h | Crash, UX confuse, politique |
| **Google Play** | 2-4h | Permissions excessives, crash |

## Estimation des coûts et délais

### Coûts initiaux

| Élément | Coût | Fréquence |
|---------|------|-----------|
| Apple Developer | 99 USD | Annuel |
| Google Play | 25 USD | Une fois |
| **Total** | **124 USD** | **Première année** |

### Coûts récurrents

| Élément | Coût | Fréquence |
|---------|------|-----------|
| Apple Developer | 99 USD | Annuel |
| **Total** | **99 USD** | **Chaque année** |

### Délais de mise en production

| Phase | Durée |
|-------|-------|
| Configuration Capacitor | 2-4h |
| Build iOS | 1-2h |
| Build Android | 1-2h |
| Préparation assets (screenshots, icônes) | 4-8h |
| Soumission App Store | 24-48h |
| Soumission Google Play | 2-4h |
| **Total** | **35-70h** |

### Timeline recommandée

```
Semaine 1 : Configuration + Build (8h)
Semaine 2 : Préparation assets (8h)
Semaine 3 : Soumission + Attente (24-48h)
Semaine 4 : Corrections si rejet (2-8h)
```

## Maintenance et mises à jour

### Cycle de mise à jour

1. **Code** : Modifier le code React/Node.js
2. **Build web** : `npm run build`
3. **Sync** : `npx cap sync`
4. **Test** : Tester sur device/simulator
5. **Build natif** : Xcode (iOS) ou Android Studio (Android)
6. **Soumettre** : App Store Connect ou Google Play Console

### Versioning

- **Version app** : Sémantique (ex: 1.2.3)
- **Build number** : Incrémenter à chaque soumission
- **iOS** : Version et Build dans Xcode
- **Android** : versionCode et versionName dans build.gradle

## Ressources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Apple App Store Connect](https://appstoreconnect.apple.com)
- [Google Play Console](https://play.google.com/console)
- [Capacitor iOS Guide](https://capacitorjs.com/docs/ios)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)

## Support

Pour toute question :
- Consulter la documentation Capacitor
- Vérifier les logs Xcode/Android Studio
- Tester sur device réel avant soumission
- Contacter le support Apple/Google si rejet
