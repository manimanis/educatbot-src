# Solution CORS pour les API IA

## Problème

L'application frontend ne peut pas accéder directement à certaines API IA (ex: NVIDIA, OpenAI, Groq) en raison de la politique de sécurité Same-Origin qui bloque les requêtes cross-origin (CORS).

**Erreur observée :**
```
Blocage d'une requête multiorigine (Cross-Origin Request) : la politèque « Same Origin » 
ne permet pas de consulter la ressource distante.
Raison : échec de la requête CORS. Code d'état : (null).
```

## Solution

Mise en place d'un **serveur proxy backend** (Node.js/Express) qui fait office d'intermédiaire entre le frontend et les API IA.

### Architecture

```
Frontend (Vue.js) → Proxy Local (localhost:3001) → API IA (OpenAI, Groq, etc.)
```

### Fichiers modifiés/créés

1. **`server/proxy.js`** (nouveau) - Serveur proxy Express
2. **`src/services/aiService.js`** (modifié) - Utilise le proxy au lieu d'appeler directement l'API
3. **`package.json`** (modifié) - Ajout des scripts et dépendances

### Dépendances installées

- `express` - Framework web pour le proxy
- `cors` - Gestion des en-têtes CORS
- `concurrently` - Exécution simultanée du frontend et du proxy

## Utilisation

### Démarrage de l'application

```bash
# Démarrer à la fois le frontend (port 3000) et le proxy (port 3001)
npm start
```

Ou séparément :

```bash
# Terminal 1 : Démarrer le proxy
npm run server

# Terminal 2 : Démarrer le frontend
npm run dev
```

### Accès à l'application

- **Frontend** : http://localhost:3000
- **Proxy** : http://localhost:3001
- **Health check** : http://localhost:3001/api/health

## Configuration

### Dans l'interface de l'application

Configurez vos endpoints API dans la page **Paramètres** :

1. **Sélectionnez ou ajoutez une API** dans la liste déroulante
2. Renseignez :
   - l'**URL de base de l'API** (ex. `https://api.openai.com/v1`)
   - votre **clé API**
   - le **modèle** (ex. `gpt-4o-mini`, `llama-3.3-70b-versatile`, etc.)
3. Activez le switch **"Ajouter automatiquement /chat/completions"** si votre endpoint n'inclut pas cette partie
4. Testez la connexion avec le bouton **"Tester la connexion"**

## Comment ça marche

1. Le frontend envoie une requête POST à `http://localhost:3001/api/chat/completions`
2. Le proxy reçoit la requête avec :
   - `endpoint` : l'URL de base de l'API
   - `apiKey` : la clé API
   - `body` : le corps de la requête OpenAI
3. Le proxy ajoute automatiquement `/chat/completions` si nécessaire et transmet la requête vers l'API
4. La réponse est renvoyée au frontend avec les en-têtes CORS appropriés

## Avantages

- ✅ Résout le problème CORS
- ✅ La clé API n'est jamais exposée dans le frontend (elle passe par le proxy)
- ✅ Compatible avec tous les endpoints OpenAI-compatibles
- ✅ Supporte le streaming SSE
- ✅ Gestion des timeouts et retries
- ✅ Configuration de plusieurs API possibles

## Dépannage

### Le proxy ne démarre pas

Vérifiez que le port 3001 n'est pas déjà utilisé :
```bash
# Windows
netstat -ano | findstr :3001

# Tuer le processus si nécessaire
taskkill /F /PID <process_id>
```

### Erreur de connexion

Vérifiez que le proxy fonctionne :
```bash
curl http://localhost:3001/api/health
```

Réponse attendue :
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Le frontend ne trouve pas le proxy

Assurez-vous que :
1. Le proxy est démarré sur le port 3001
2. Le frontend est démarré sur le port 3000
3. Les deux serveurs sont en cours d'exécution

## Scripts disponibles

```bash
npm run dev      # Démarre uniquement le frontend Vite
npm run server   # Démarre uniquement le proxy
npm run start    # Démarre les deux simultanément
npm run build    # Build le frontend pour la production
npm run preview  # Prévisualise le build de production
```

## Notes techniques

- Le proxy utilise `http` et `https` natifs de Node.js pour éviter les dépendances supplémentaires
- Les réponses en streaming sont correctement gérées avec `pipe()`
- Les en-têtes CORS sont ajoutés pour permettre l'accès depuis n'importe quelle origine
- La clé API est transmise via le header `Authorization: Bearer <apiKey>`