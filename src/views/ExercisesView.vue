<template>
  <div class="exercises-view">
    <div class="exercises-view__container">
      <header class="exercises-view__header">
        <h1>Exercices interactifs</h1>
        <p class="exercises-view__subtitle">
          Générez des exercices automatiquement, tentez de les résoudre, puis demandez la correction.
        </p>
      </header>

      <!-- Sélection du module -->
      <div class="module-tabs">
        <button
          :class="['module-tab', { 'module-tab--active': activeModule === 'database' }]"
          @click="activeModule = 'database'"
        >
          <AppIcon name="database" :size="18" />
          <span>Bases de Données</span>
        </button>
        <button
          :class="['module-tab', { 'module-tab--active': activeModule === 'french' }]"
          @click="activeModule = 'french'"
        >
          <AppIcon name="book" :size="18" />
          <span>Français</span>
        </button>
      </div>

      <!-- Grille des types d'exercices -->
      <div class="exercises-grid">
        <div
          v-for="ex in currentExercises"
          :key="ex.type"
          class="exercise-card"
        >
          <div class="exercise-card__icon">
            <AppIcon :name="exerciseIcon(ex.type)" :size="22" />
          </div>
          <div class="exercise-card__content">
            <h3>{{ ex.label }}</h3>
            <p>{{ exerciseDescription(ex.type) }}</p>
          </div>
          <BaseButton
            variant="outline"
            size="sm"
            icon="sparkles"
            :loading="generating === ex.type"
            @click="generate(ex)"
          >
            Générer
          </BaseButton>
        </div>
      </div>

      <!-- Bouton correction -->
      <div v-if="activeExercise" class="correction-zone">
        <div class="correction-zone__header">
          <h2><AppIcon name="exercise" :size="18" /> Exercice en cours</h2>
          <div class="correction-zone__actions">
            <BaseButton variant="ghost" size="sm" icon="sparkles" :loading="correcting" @click="askCorrection">
              Afficher la correction
            </BaseButton>
            <BaseButton variant="ghost" size="sm" icon="info" :loading="explaining" @click="askExplanation">
              Afficher l'explication
            </BaseButton>
            <BaseButton variant="ghost" size="sm" icon="check" @click="markSuccess(true)">
              J'ai réussi
            </BaseButton>
            <BaseButton variant="ghost" size="sm" icon="x" @click="markSuccess(false)">
              À retravailler
            </BaseButton>
            <BaseButton variant="ghost" size="sm" icon="trash" @click="closeExercise">
              Fermer
            </BaseButton>
          </div>
        </div>

        <div class="correction-zone__body">
          <p class="text-muted text-sm">
            <AppIcon name="info" :size="12" />
            Cet exercice a été ajouté à votre conversation active. Répondez-y dans le chat,
            puis cliquez sur « Afficher la correction ».
          </p>
        </div>
      </div>

      <!-- Historique des exercices -->
      <section class="history">
        <h2>Historique récent</h2>
        <div v-if="history.length === 0" class="history__empty">
          <AppIcon name="list" :size="24" />
          <p>Aucun exercice généré pour le moment.</p>
        </div>
        <ul v-else>
          <li v-for="(h, i) in history" :key="i" class="history-item">
            <div class="history-item__icon" :class="`history-item__icon--${h.status}`">
              <AppIcon :name="h.status === 'success' ? 'check' : h.status === 'failed' ? 'x' : 'clock'" :size="14" />
            </div>
            <div class="history-item__main">
              <strong>{{ h.label }}</strong>
              <span class="text-muted text-xs">{{ formatDate(h.generatedAt) }}</span>
            </div>
            <span class="badge" :class="`badge--${h.status === 'success' ? 'success' : h.status === 'failed' ? 'danger' : ''}`">
              {{ h.status === 'success' ? 'Réussi' : h.status === 'failed' ? 'À retravailler' : 'En cours' }}
            </span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { EXERCISE_TEMPLATES } from '@/services/prompts'
import { useConversationsStore } from '@/stores/conversations'
import { useSettingsStore } from '@/stores/settings'
import { useStatsStore } from '@/stores/stats'
import { useChat } from '@/composables/useChat'

const router = useRouter()
const conversationsStore = useConversationsStore()
const settingsStore = useSettingsStore()
const statsStore = useStatsStore()
const { send } = useChat()

const activeModule = ref('database') // 'database' | 'french'
const generating = ref(null)
const correcting = ref(false)
const explaining = ref(false)
const activeExercise = ref(null)

const history = ref([])

const currentExercises = computed(() => {
  return EXERCISE_TEMPLATES[activeModule.value] || []
})

function exerciseIcon(type) {
  const map = {
    qcm: 'list',
    query: 'database',
    join: 'database',
    groupby: 'database',
    subquery: 'database',
    normalization: 'database',
    schema: 'database',
    conjugation: 'book',
    dictation: 'book',
    correction: 'edit',
    vocabulary: 'book',
    homophones: 'book'
  }
  return map[type] || 'exercise'
}

function exerciseDescription(type) {
  const map = {
    qcm: 'QCM à choix multiple, idéal pour réviser les bases.',
    query: 'Écris une requête SQL à partir d\'un énoncé.',
    join: 'Pratique les jointures (INNER, LEFT, RIGHT, FULL).',
    groupby: 'Maîtrise GROUP BY et HAVING.',
    subquery: 'Pratique les sous-requêtes et EXISTS.',
    normalization: 'Étude de cas : normalise un schéma en 3FN.',
    schema: 'Conçois un modèle relationnel à partir d\'un besoin.',
    conjugation: 'Complète des phrases avec le bon temps.',
    dictation: 'Écris sous dictée pour travailler l\'orthographe.',
    correction: 'Corrige un texte contenant des fautes.',
    vocabulary: 'Trouve synonymes et antonymes.',
    homophones: 'Distingue les homophones (a/à, et/est…).'
  }
  return map[type] || 'Exercice pédagogique.'
}

async function generate(exercise) {
  if (generating.value) return
  generating.value = exercise.type

  // S'assure qu'une conversation active existe avec le bon mode
  const targetMode = activeModule.value === 'database'
    ? 'database'
    : activeModule.value === 'french'
      ? 'french'
      : 'mixed'

  if (!conversationsStore.activeId) {
    await conversationsStore.createConversation({ mode: targetMode })
  } else if (conversationsStore.activeConversation?.mode !== targetMode) {
    // Crée une nouvelle conversation si le mode actuel ne correspond pas
    await conversationsStore.createConversation({ mode: targetMode })
  } else {
    settingsStore.setMode(targetMode)
  }

  activeExercise.value = exercise

  history.value.unshift({
    type: exercise.type,
    label: exercise.label,
    status: 'pending',
    generatedAt: new Date().toISOString()
  })

  try {
    await send(exercise.prompt)
  } finally {
    generating.value = null
  }
}

async function askCorrection() {
  if (correcting.value) return
  correcting.value = true
  try {
    await send('Affiche maintenant la correction détaillée de l\'exercice.')
  } finally {
    correcting.value = false
  }
}

async function askExplanation() {
  if (explaining.value) return
  explaining.value = true
  try {
    await send('Donne-moi une explication détaillée des notions abordées dans cet exercice.')
  } finally {
    explaining.value = false
  }
}

function markSuccess(success) {
  if (activeExercise.value) {
    const item = history.value.find(h => h.type === activeExercise.value.type && h.status === 'pending')
    if (item) {
      item.status = success ? 'success' : 'failed'
    }
    statsStore.recordExercise(settingsStore.settings.mode, success)
  }
  if (window.__echabot_toast) {
    window.__echabot_toast(
      success ? 'Bravo, exercice réussi !' : 'Noté, à retravailler.',
      success ? 'success' : 'info'
    )
  }
}

function closeExercise() {
  activeExercise.value = null
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  } catch { return '' }
}
</script>

<style scoped>
.exercises-view {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-6) var(--space-4);
}
.exercises-view__container {
  max-width: 920px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.exercises-view__header h1 {
  font-size: var(--fs-2xl);
  font-weight: 600;
  color: var(--text-primary);
}
.exercises-view__subtitle {
  color: var(--text-secondary);
  font-size: var(--fs-sm);
  margin-top: 4px;
}

.module-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 4px;
  width: fit-content;
}
.module-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  transition: all var(--transition);
}
.module-tab:hover { background: var(--bg-hover); color: var(--text-primary); }
.module-tab--active {
  background: var(--brand-600);
  color: #fff;
}
.module-tab--active:hover { background: var(--brand-700); }

.exercises-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-3);
}

.exercise-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: var(--space-4);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: border-color var(--transition), box-shadow var(--transition);
}
.exercise-card:hover {
  border-color: var(--brand-400);
  box-shadow: var(--shadow-md);
}
.exercise-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px; height: 40px;
  border-radius: var(--radius-md);
  background: rgba(99,102,241,0.12);
  color: var(--brand-600);
}
.exercise-card__content { flex: 1; }
.exercise-card__content h3 {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.exercise-card__content p {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  line-height: 1.4;
}

.correction-zone {
  background: var(--bg-surface);
  border: 2px solid var(--brand-300);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  animation: fadeIn 250ms ease;
}
.correction-zone__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: var(--space-3);
}
.correction-zone__header h2 {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-base);
  color: var(--text-primary);
}
.correction-zone__actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.correction-zone__body {
  padding: var(--space-3);
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
  display: flex;
  gap: 8px;
  align-items: flex-start;
  color: var(--text-secondary);
}

.history {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}
.history h2 {
  font-size: var(--fs-base);
  color: var(--text-primary);
  margin-bottom: var(--space-3);
}
.history__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: var(--space-6);
  text-align: center;
  color: var(--text-muted);
}
.history ul { display: flex; flex-direction: column; gap: 6px; }

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--bg-subtle);
  border-radius: var(--radius-sm);
}
.history-item__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px; height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
}
.history-item__icon--success { background: rgba(16,185,129,0.15); color: var(--success); }
.history-item__icon--failed  { background: rgba(239,68,68,0.15);  color: var(--danger);  }
.history-item__icon--pending { background: rgba(245,158,11,0.15); color: var(--warning); }
.history-item__main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.history-item__main strong { font-size: var(--fs-sm); color: var(--text-primary); }
</style>
