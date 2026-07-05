# ÉduChatBot — Chatbot éducatif SQL & Français

Application web **100% frontend** (aucun backend) construite en **Vue.js 3** permettant d'apprendre :
- les **bases de données** (SQL, modélisation, normalisation, optimisation)
- le **français** (grammaire, conjugaison, orthographe, vocabulaire)

L'application utilise l'API IA de votre choix (OpenAI, Groq, OpenRouter, LM Studio, Ollama, etc.) via un endpoint **OpenAI-compatible**.

## Démarrage rapide

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build de production
npm run build

# Prévisualiser le build
npm run preview
```

L'application est ensuite accessible sur **http://localhost:3000**.

## Configuration

1. Ouvrez la page **Paramètres** (icône engrenage en haut à droite).
2. Configurez vos API IA :
   - **Sélectionnez ou ajoutez une API** dans la liste déroulante
   - Renseignez l'**URL de base de l'API** (ex. `https://api.openai.com/v1`)
   - Votre **clé API**
   - Le **modèle** (ex. `gpt-4o-mini`, `llama-3.3-70b-versatile`, `mistral-large-latest`, etc.)
   - Activez le switch **"Ajouter automatiquement /chat/completions"** si votre endpoint n'inclut pas cette partie
3. Sélectionnez un **profil pédagogique** :
   - **Bases de Données** (mode SQL expert)
   - **Français** (mode langue française)
   - **Mixte** (les deux)
   - **Libre** (prompt personnalisé)
4. Choisissez votre **niveau** : débutant, intermédiaire, avancé.

## Fonctionnalités principales

### Chat
- Streaming des réponses (SSE)
- Rendu Markdown complet (titres, listes, tableaux, blocs de code)
- Coloration syntaxique SQL
- Boutons : copier, régénérer, supprimer, lecture vocale (TTS)
- Dictée vocale (STT) via Web Speech API
- Suggestions de questions par mode
- Annulation de génération en cours
- Retry automatique sur erreurs réseau

### Conversations
- Création, renommage, suppression
- Épinglage et favoris
- Recherche en temps réel
- Export : JSON, Markdown, TXT, PDF (impression)
- Import : JSON
- Stockage **IndexedDB** (grand volume) + LocalStorage (paramètres)

### Exercices interactifs
- **Module SQL** : QCM, requêtes à écrire, JOIN, GROUP BY, sous-requêtes, normalisation, modélisation
- **Module Français** : QCM, conjugaison, dictées, textes à corriger, vocabulaire, homophones
- Génération automatique via l'IA
- Demande de correction / explication
- Suivi de réussite intégré au tableau de bord

### Tableau de bord
- Statistiques globales : conversations, messages, temps passé, exercices, taux de réussite, tokens
- Graphique d'activité des 7 derniers jours
- Progression SQL et Français (réussites vs échecs sur 14 jours)
- Répartition par mode (doughnut)
- Détail par mode (tableau)

### Thèmes & accessibilité
- Thèmes **clair**, **sombre**, **automatique** (suit le système)
- Design responsive (desktop / tablette / mobile)
- Navigation clavier complète
- Focus visible, contrastes WCAG
- `aria-label` sur tous les contrôles
- Mode « réduire les animations »

### Sécurité
- Aucune donnée ne quitte le navigateur (sauf vers l'endpoint IA configuré)
- Clé API stockée localement (LocalStorage), jamais envoyée ailleurs que vers l'endpoint
- HTML désactivé dans le Markdown rendu (protection XSS)
- Liens externes avec `rel="noopener noreferrer"`
- Confirmation avant suppressions

## Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl/⌘ + K` | Ouvrir la barre latérale (recherche) |
| `Ctrl/⌘ + B` | Basculer la barre latérale |
| `Ctrl/⌘ + Shift + N` | Nouvelle conversation |
| `Entrée` | Envoyer le message ( configurable ) |
| `Shift + Entrée` | Saut de ligne |
| `Échap` | Fermer la barre latérale |

## Structure du projet

```
src/
├── components/
│   ├── chat/
│   │   ├── ChatWindow.vue         # Zone d'affichage des messages
│   │   ├── ChatInput.vue          # Saisie + suggestions + dictée
│   │   ├── MessageBubble.vue      # Bulle de message (Markdown, TTS, actions)
│   │   ├── Sidebar.vue            # Liste des conversations
│   │   └── ConversationToolbar.vue # Barre d'outils (export, import, renommer)
│   ├── layout/
│   │   └── AppHeader.vue          # En-tête (mode, niveau, thème, navigation)
│   ├── ui/
│   │   ├── AppIcon.vue            # Bibliothèque d'icônes SVG
│   │   ├── BaseButton.vue
│   │   ├── BaseInput.vue          # Input + textarea + password
│   │   ├── BaseSelect.vue
│   │   ├── BaseSlider.vue
│   │   ├── BaseSwitch.vue
│   │   ├── BaseModal.vue
│   │   └── BaseToast.vue
├── views/
│   ├── ChatView.vue               # Vue principale du chat
│   ├── ExercisesView.vue          # Générateur d'exercices
│   ├── DashboardView.vue          # Statistiques + graphiques Chart.js
│   └── SettingsView.vue           # Paramètres IA, profil, apparence, données
├── composables/
│   ├── useChat.js                 # Logique de chat (envoi, streaming, retry)
│   ├── useMarkdown.js             # Rendu Markdown + highlight SQL
│   ├── useSpeech.js               # TTS + STT (Web Speech API)
│   └── useTheme.js
├── services/
│   ├── aiService.js               # Service IA générique (OpenAI-compatible)
│   ├── storageService.js          # LocalStorage + IndexedDB
│   └── prompts.js                 # Prompts système + templates d'exercices
├── stores/
│   ├── settings.js                # Pinia — paramètres IA + préférences
│   ├── conversations.js           # Pinia — conversations + messages
│   ├── theme.js                   # Pinia — thème clair/sombre/auto
│   └── stats.js                   # Pinia — statistiques pédagogiques
├── router/
│   └── index.js                   # Vue Router (hash history)
├── assets/
│   └── styles/
│       ├── main.css               # Styles globaux + utilitaires
│       ├── themes.css             # Variables de thème (clair/sombre)
│       └── highlight.css          # Coloration syntaxique
├── App.vue
└── main.js
```

## Stack technique

- **Vue.js 3** (Composition API, `<script setup>`)
- **Pinia** (gestion d'état)
- **Vue Router** (hash history, fonctionne sans serveur configuré)
- **Vite** (bundler)
- **Chart.js** (graphiques du tableau de bord)
- **markdown-it** (rendu Markdown)
- **highlight.js** (coloration syntaxique SQL)
- **Web Speech API** (TTS + STT natives du navigateur)
- **IndexedDB** (stockage des conversations)
- **LocalStorage** (paramètres, thème, statistiques)
- **nanoid** (identifiants uniques)

## Endpoints IA compatibles

| Fournisseur | URL de base | Exemple de modèle |
|-------------|-------------|-------------------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| OpenRouter | `https://openrouter.ai/api/v1` | `openai/gpt-4o-mini` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| LM Studio | `http://localhost:1234/v1` | `local-model` |
| Ollama | `http://localhost:11434/v1` | `llama3` |

> **Note** : Activez le switch "Ajouter automatiquement /chat/completions" si votre endpoint ne comprend pas cette partie dans l'URL.

## Avertissement

La clé API est stockée **localement dans votre navigateur** (LocalStorage). Ne l'utilisez pas sur un ordinateur public. Pour révoquer une clé, rendez-vous sur le portail de votre fournisseur d'API.