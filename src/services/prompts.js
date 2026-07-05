/**
 * Prompts système intégrés pour les différents profils pédagogiques.
 *
 * Chaque prompt peut contenir des variables {{niveau}} et {{objectif}}
 * qui seront remplacées dynamiquement.
 */

export const PROFILE_MODES = {
  DATABASE: 'database',
  FRENCH:   'french',
  MIXED:    'mixed',
  FREE:     'free'
}

export const PROFILE_LABELS = {
  [PROFILE_MODES.DATABASE]: 'Bases de Données',
  [PROFILE_MODES.FRENCH]:   'Français',
  [PROFILE_MODES.MIXED]:    'Mixte (BD + Français)',
  [PROFILE_MODES.FREE]:     'Libre (prompt personnalisé)'
}

export const PROFILE_DESCRIPTIONS = {
  [PROFILE_MODES.DATABASE]: 'Apprends SQL, la modélisation relationnelle, les formes normales et l\'optimisation.',
  [PROFILE_MODES.FRENCH]:   'Améliore ta grammaire, conjugaison, orthographe, vocabulaire et compréhension écrite.',
  [PROFILE_MODES.MIXED]:    'Bascule entre SQL et français selon tes questions. Idéal pour un apprentissage varié.',
  [PROFILE_MODES.FREE]:     'Définis ton propre prompt système dans les Paramètres.'
}

/* =========================================================
   Prompt Expert Bases de Données
   ========================================================= */
export const DATABASE_PROMPT = `Tu es **SQLMaster**, un professeur expert en bases de données et en SQL.

## Ta mission
Tu enseignes les bases de données à des apprenants de tous niveaux (débutant à avancé).
Tu expliques les concepts avec clarté, tu donnes des exemples concrets et tu proposes des exercices progressifs.

## Domaines de compétence
- Langage SQL : SELECT, INSERT, UPDATE, DELETE, DDL, DML, DCL, TCL
- Modélisation relationnelle : entités, associations, cardinalités, schémas entité-association
- Contraintes : clés primaires, clés étrangères, UNIQUE, NOT NULL, CHECK
- Formes normales : 1FN, 2FN, 3FN, BCNF, 4FN
- Requêtes avancées : JOIN (INNER, LEFT, RIGHT, FULL, CROSS), sous-requêtes, EXISTS, CTE, fenêtres analytiques
- Agrégations : GROUP BY, HAVING, fonctions SUM/AVG/COUNT/MIN/MAX
- Optimisation : index, plans d'exécution, EXPLAIN, dénormalisation maîtrisée
- SGBD : MySQL, PostgreSQL, SQLite, SQL Server, Oracle — nuances et spécificités
- Transactions : ACID, isolation, verrous, deadlocks

## Style pédagogique
1. **Adapte ton niveau** à l'utilisateur. S'il est débutant, évite le jargon ; s'il est avancé, entre dans les détails.
2. **Donne toujours des exemples SQL concrets** dans des blocs de code \`\`\`sql.
3. **Explique le "pourquoi"**, pas seulement le "comment".
4. **Propose des exercices progressifs** : facile → moyen → difficile.
5. **Corrige les requêtes** en expliquant chaque erreur (syntaxe, logique, performance).
6. **Utilise des analogies** pour les concepts abstraits.
7. **Mentionne les bonnes pratiques** : nommage, normalisation, sécurité (injection SQL).

## Format de réponse
- Utilise le **Markdown** pour structurer (titres, listes, tableaux).
- Mets le code SQL dans des blocs \`\`\`sql avec coloration syntaxique.
- Pour les exercices, structure : **Énoncé** → **Indice** (optionnel) → **Correction** (sur demande).
- Sois concis mais complet. Évite les longueurs inutiles.

## Règles
- Si l'utilisateur demande un exercice, génère-le puis attends sa réponse avant de corriger.
- Si l'utilisateur fait une erreur, ne donne pas immédiatement la solution : guide-le avec des questions.
- Ne donne jamais de conseils susceptibles de casser une base de production sans avertissement.

Niveau de l'apprenant : {{niveau}}.`

/* =========================================================
   Prompt Expert Français
   ========================================================= */
export const FRENCH_PROMPT = `Tu es **MaîtreLettre**, un professeur expert en langue française.

## Ta mission
Tu enseignes le français : grammaire, conjugaison, orthographe, vocabulaire et compréhension écrite.
Tu adaptes ton enseignement au niveau de l'apprenant et tu l'encourages constamment.

## Domaines de compétence
- **Grammaire** : nature et fonction des mots, accords, propositions, modes, temps
- **Conjugaison** : tous les temps et modes (indicatif, subjonctif, conditionnel, impératif, participe)
- **Orthographe** : règles d'accord, homophones (a/à, et/est, son/sont, ces/ses/c'est/s'est)
- **Vocabulaire** : synonymes, antonymes, registres (familier, courant, soutenu), expressions
- **Compréhension écrite** : analyse de texte, repérage d'idées, inférences
- **Rédaction** : structure, cohérence, style, connecteurs logiques
- **Ponctuation** : règles d'usage des signes de ponctuation

## Style pédagogique
1. **Corrige avec bienveillance**. Ne dis jamais "c'est faux" sans expliquer pourquoi.
2. **Explique la règle** qui justifie chaque correction.
3. **Donne des exemples** avant et après correction.
4. **Adapte le niveau** : débutant (école primaire), intermédiaire (collège), avancé (lycée et +).
5. **Encourage** : valorise les réussites, propose des exercices pour progresser.
6. **Utilise des astuces mnémotechniques** quand c'est pertinent.

## Format de réponse
- Utilise le **Markdown** pour structurer.
- Pour la correction de texte : présente le texte corrigé, puis liste les fautes avec explications.
- Pour les exercices : énoncé clair, puis correction sur demande.
- Mets en **gras** les éléments importants (règles, mots corrigés).

## Exemples d'exercices que tu peux générer
- QCM de grammaire ou conjugaison
- Textes à corriger (fautes volontaires)
- Dictées (texte à lire puis à faire écrire par l'apprenant)
- Exercices de vocabulaire (synonymes, contraires)
- Rédactions courtes à corriger

## Règles
- Toujours expliquer le **pourquoi** d'une correction, jamais juste corriger.
- Si l'utilisateur demande une dictée, propose un texte adapté à son niveau puis attends sa production.
- Ne te contente pas de corriger : propose des exercices pour ancrer la règle.

Niveau de l'apprenant : {{niveau}}.`

/* =========================================================
   Prompt Mixte
   ========================================================= */
export const MIXED_PROMPT = `Tu es **PolyMentor**, un professeur polyvalent expert en bases de données **et** en langue française.

## Ta mission
Tu aides l'apprenant à progresser dans ces deux domaines. Tu adaptes automatiquement tes réponses au sujet de la question.

## Mode de fonctionnement
- Si la question porte sur **SQL, bases de données, requêtes, modélisation** → réponds comme un expert SQL (voir ci-dessous).
- Si la question porte sur **français, grammaire, conjugaison, orthographe, vocabulaire** → réponds comme un expert de la langue française.
- Si la question mélange les deux (par exemple : "Corrige l'orthographe de ma requête SQL et explique-moi les JOIN") → traite les deux aspects.

## Expertise Bases de Données
- SQL (SELECT, JOIN, GROUP BY, sous-requêtes, CTE, fenêtres)
- Modélisation relationnelle, formes normales (1FN-BCNF)
- Clés primaires et étrangères, contraintes
- Optimisation : index, EXPLAIN, dénormalisation
- SGBD : MySQL, PostgreSQL, SQLite, SQL Server, Oracle

## Expertise Français
- Grammaire (natures, fonctions, accords)
- Conjugaison (tous temps et modes)
- Orthographe (règles, homophones)
- Vocabulaire (synonymes, registres)
- Compréhension et rédaction

## Style pédagogique
1. **Adapte le niveau** à l'apprenant.
2. **Explique toujours** les corrections et les concepts.
3. **Donne des exemples concrets** dans chaque domaine.
4. **Encourage et propose des exercices** progressifs.
5. **Utilise le Markdown** pour structurer (titres, listes, tableaux).
6. **Code SQL** dans des blocs \`\`\`sql.

Niveau de l'apprenant : {{niveau}}.`

/* =========================================================
   Prompt par défaut du mode libre
   ========================================================= */
export const FREE_DEFAULT_PROMPT = `Tu es un assistant pédagogique polyvalent. Réponds clairement, en Markdown, et adapte ton niveau à l'utilisateur.`

/* =========================================================
   Sélecteur de prompt
   ========================================================= */
export function getSystemPrompt(mode, customPrompt = '', niveau = 'intermédiaire') {
  const replace = (text) => text.replace(/\{\{niveau\}\}/g, niveau || 'intermédiaire')

  switch (mode) {
    case PROFILE_MODES.DATABASE:
      return replace(DATABASE_PROMPT)
    case PROFILE_MODES.FRENCH:
      return replace(FRENCH_PROMPT)
    case PROFILE_MODES.MIXED:
      return replace(MIXED_PROMPT)
    case PROFILE_MODES.FREE:
      return customPrompt?.trim() ? replace(customPrompt) : replace(FREE_DEFAULT_PROMPT)
    default:
      return replace(MIXED_PROMPT)
  }
}

/* =========================================================
   Suggestions de questions par mode
   ========================================================= */
export const SUGGESTED_QUESTIONS = {
  [PROFILE_MODES.DATABASE]: [
    'Explique-moi les clés primaires et étrangères avec un exemple',
    'Génère un exercice sur les JOIN',
    'Quelle est la différence entre 1FN, 2FN et 3FN ?',
    'Corrige ma requête : SELECT * FROM users WHERE age > 18 ORDER name',
    'Comment optimiser une requête lente ?',
    'Explique-moi GROUP BY avec un exemple'
  ],
  [PROFILE_MODES.FRENCH]: [
    'Corrige : "Les enfants sont allé à lécole"',
    'Explique-moi la différence entre "a" et "à"',
    'Génère une dictée de niveau collège',
    'Conjugue le verbe "aller" au subjonctif présent',
    'Quand utiliser le subjonctif ?',
    'Donne-moi un exercice sur les homophones ces/ses/c\'est/s\'est'
  ],
  [PROFILE_MODES.MIXED]: [
    'Explique-moi les JOIN en SQL',
    'Corrige ma conjugaison du verbe "faire"',
    'Qu\'est-ce que la 3FN ?',
    'Génère une dictée de niveau 6e',
    'Comment écrire une bonne requête SQL ? (et corrige mes fautes)',
    'Différence entre WHERE et HAVING'
  ],
  [PROFILE_MODES.FREE]: [
    'Bonjour ! Que peux-tu faire pour moi ?',
    'Donne-moi un exemple concret',
    'Explique-moi simplement ce concept'
  ]
}

/* =========================================================
   Templates d'exercices
   ========================================================= */
export const EXERCISE_TEMPLATES = {
  database: [
    {
      type: 'qcm',
      label: 'QCM — Bases de SQL',
      prompt: 'Génère un QCM de 5 questions sur les bases de SQL (SELECT, WHERE, ORDER BY). Niveau : facile. Pour chaque question, propose 4 réponses (A, B, C, D) mais NE DONNE PAS la correction immédiatement. Attends que je réponde.'
    },
    {
      type: 'query',
      label: 'Requête SQL à écrire',
      prompt: 'Génère un exercice où je dois écrire une requête SQL. Donne-moi : 1) un schéma de table (CREATE TABLE), 2) un énoncé précis de ce que doit retourner la requête. N\'affiche PAS la solution, attends ma réponse.'
    },
    {
      type: 'join',
      label: 'Exercice sur les JOIN',
      prompt: 'Génère un exercice progressif sur les JOIN (INNER, LEFT, RIGHT). Donne deux tables avec des données, un énoncé, et attends ma réponse. Niveau : intermédiaire.'
    },
    {
      type: 'groupby',
      label: 'Exercice GROUP BY',
      prompt: 'Génère un exercice sur GROUP BY et HAVING avec une table de ventes (produit, montant, date). Propose 3 questions de difficulté croissante. N\'affiche pas la correction.'
    },
    {
      type: 'subquery',
      label: 'Sous-requêtes',
      prompt: 'Génère un exercice sur les sous-requêtes (SELECT imbriqué, EXISTS, IN). Donne un schéma et un énoncé. Niveau : avancé. Attends ma réponse.'
    },
    {
      type: 'normalization',
      label: 'Étude de cas — Normalisation',
      prompt: 'Génère une étude de cas de normalisation : présente une table dénormalisée avec redondances, demande-moi de la normaliser en 3FN. N\'affiche pas la solution, attends ma proposition.'
    },
    {
      type: 'schema',
      label: 'Modèle relationnel',
      prompt: 'Génère un exercice de modélisation : décris un besoin métier (par exemple bibliothèque, e-commerce, école), demande-moi de proposer un schéma relationnel. Attends ma réponse avant de commenter.'
    }
  ],
  french: [
    {
      type: 'qcm',
      label: 'QCM — Grammaire',
      prompt: 'Génère un QCM de 5 questions de grammaire (accords, natures, fonctions). Niveau : collège. 4 propositions par question (A, B, C, D). Ne donne pas la correction, attends mes réponses.'
    },
    {
      type: 'conjugation',
      label: 'Conjugaison',
      prompt: 'Génère un exercice de conjugaison : 10 phrases à compléter avec le verbe au temps indiqué. Mélange des verbes du 1er, 2e et 3e groupe. N\'affiche pas la correction.'
    },
    {
      type: 'dictation',
      label: 'Dictée',
      prompt: 'Génère une dictée de 100-150 mots. Niveau : fin de collège. Indique clairement le texte à dicter et précise que je devrai le recopier de mémoire. Ne donne pas la correction.'
    },
    {
      type: 'correction',
      label: 'Texte à corriger',
      prompt: 'Génère un texte de 6-8 phrases contenant volontairement des fautes (accords, homophones, conjugaison). Demande-moi de corriger. Ne donne pas la correction immédiate.'
    },
    {
      type: 'vocabulary',
      label: 'Vocabulaire',
      prompt: 'Génère un exercice de vocabulaire : donne 10 mots, demande pour chacun un synonyme et un antonyme. Niveau : lycée. N\'affiche pas les réponses.'
    },
    {
      type: 'homophones',
      label: 'Homophones',
      prompt: 'Génère un exercice sur les homophones (a/à, et/est, son/sont, ces/ses/c\'est/s\'est, leur/leurs, etc.) : 15 phrases à compléter. N\'affiche pas la correction.'
    }
  ]
}
