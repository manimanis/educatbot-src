<template>
  <div class="settings-view">
    <div class="settings-view__container">
      <header class="settings-view__header">
        <h1>Paramètres</h1>
        <div class="settings-view__header-actions">
          <BaseButton variant="ghost" icon="download" size="sm" @click="exportSettings">
            Exporter
          </BaseButton>
          <BaseButton variant="ghost" icon="upload" size="sm" @click="importSettings">
            Importer
          </BaseButton>
          <BaseButton variant="danger" icon="trash" size="sm" @click="askResetAll">
            Tout réinitialiser
          </BaseButton>
        </div>
      </header>

      <!-- Onglets -->
      <nav class="settings-tabs" role="tablist">
        <button
          v-for="t in tabs"
          :key="t.id"
          :class="['settings-tabs__btn', { 'settings-tabs__btn--active': activeTab === t.id }]"
          role="tab"
          :aria-selected="activeTab === t.id"
          @click="activeTab = t.id"
        >
          <AppIcon :name="t.icon" :size="14" />
          <span>{{ t.label }}</span>
        </button>
      </nav>

      <!-- Onglet IA -->
      <section v-if="activeTab === 'ai'" class="settings-section">
        <h2 class="settings-section__title">Configuration des API IA</h2>

        <div class="settings-section__hint">
          <AppIcon name="info" :size="14" />
          <p>
            Vos clés API sont stockées <strong>localement dans votre navigateur</strong> (LocalStorage).
            Elles n'est jamais envoyées ailleurs que vers l'endpoint que vous configurez.
          </p>
        </div>

        <!-- Sélecteur d'API -->
        <div class="api-selector">
          <div class="api-selector__header">
            <label class="settings-section__label">API sélectionnée</label>
            <BaseButton variant="ghost" size="sm" icon="plus" @click="addNewApi">
              Ajouter une API
            </BaseButton>
          </div>
          
          <BaseSelect
            :model-value="settingsStore.activeApiId"
            :options="apiOptions"
            @update:model-value="setActiveApi"
          />
        </div>

        <!-- Configuration de l'API active -->
        <div v-if="activeApi" class="api-item">
          <div class="api-item__header">
            <BaseInput
              :model-value="activeApi.name"
              label="Nom de l'API"
              placeholder="Mon API OpenAI"
              @update:model-value="v => updateApi(activeApi.id, { name: v })"
            />
            <BaseButton
              v-if="settingsStore.apisList.length > 1"
              variant="ghost"
              size="sm"
              icon="trash"
              @click="removeApi(activeApi.id)"
            />
          </div>

          <BaseInput
            :model-value="activeApi.apiEndpoint"
            label="URL de l'API (endpoint OpenAI-compatible)"
            placeholder="https://api.openai.com/v1"
            hint="Exemples : OpenAI, Groq, OpenRouter, LM Studio (localhost:1234), Ollama, etc."
            @update:model-value="v => updateApi(activeApi.id, { apiEndpoint: v })"
          />

          <BaseSwitch
            :model-value="activeApi.autoAppendChatCompletions"
            label="Ajouter automatiquement /chat/completions"
            hint="Ajoute /chat/completions à la fin de l'URL de base si absent."
            @update:model-value="v => updateApi(activeApi.id, { autoAppendChatCompletions: v })"
          />

          <BaseInput
            :model-value="activeApi.apiKey"
            type="password"
            label="Clé API"
            placeholder="sk-..."
            icon="key"
            hint="Laissez vide pour les endpoints locaux (LM Studio, Ollama)."
            @update:model-value="v => updateApi(activeApi.id, { apiKey: v })"
          />

          <BaseInput
            :model-value="activeApi.model"
            label="Modèle"
            placeholder="gpt-4o-mini, llama-3, mistral, qwen, deepseek-chat…"
            hint="Nom du modèle tel qu'attendu par l'endpoint."
            @update:model-value="v => updateApi(activeApi.id, { model: v })"
          />

          <div class="settings-section__row">
            <BaseSlider
              :model-value="activeApi.temperature"
              :min="0" :max="2" :step="0.1"
              label="Température"
              :format="v => v.toFixed(1)"
              hint="0 = précis et déterministe · 2 = créatif et aléatoire"
              @update:model-value="v => updateApi(activeApi.id, { temperature: v })"
            />

            <BaseInput
              :model-value="activeApi.maxTokens"
              type="number"
              label="Max tokens"
              @update:model-value="v => updateApi(activeApi.id, { maxTokens: Number(v) || 0 })"
            />
          </div>

          <div class="settings-section__row">
            <BaseInput
              :model-value="activeApi.timeout"
              type="number"
              label="Timeout (ms)"
              @update:model-value="v => updateApi(activeApi.id, { timeout: Number(v) || 60000 })"
            />
            <BaseInput
              :model-value="activeApi.maxRetries"
              type="number"
              label="Tentatives (retry)"
              @update:model-value="v => updateApi(activeApi.id, { maxRetries: Number(v) || 0 })"
            />
          </div>

          <div class="settings-section__row">
            <label class="settings-section__field">
              <span class="settings-section__label">Streaming</span>
              <BaseSwitch
                :model-value="activeApi.stream"
                @update:model-value="v => updateApi(activeApi.id, { stream: v })"
              />
              <span class="settings-section__hint">Active la réponse en flux (SSE).</span>
            </label>
          </div>

          <div class="settings-section__actions">
            <BaseButton variant="outline" icon="sparkles" :loading="testing" @click="testApi">
              Tester la connexion
            </BaseButton>
          </div>

          <div v-if="testResult" class="test-result" :class="{ 'test-result--ok': testResult.ok, 'test-result--fail': !testResult.ok }">
            <AppIcon :name="testResult.ok ? 'check' : 'alert'" :size="16" />
            <div>
              <strong>{{ testResult.ok ? 'Connexion réussie !' : 'Échec de la connexion' }}</strong>
              <p v-if="testResult.ok">Réponse : {{ testResult.content?.slice(0, 100) }}</p>
              <p v-else>{{ testResult.error }}</p>
            </div>
          </div>
        </div>

        <!-- Templates rapides d'endpoint -->
        <div class="quick-presets">
          <h4>Endpoints populaires</h4>
          <div class="quick-presets__grid">
            <button
              v-for="preset in presets"
              :key="preset.url"
              class="quick-preset"
              @click="applyPreset(preset)"
            >
              <strong>{{ preset.name }}</strong>
              <span>{{ preset.url }}</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Onglet Profil pédagogique -->
      <section v-if="activeTab === 'profile'" class="settings-section">
        <h2 class="settings-section__title">Profil pédagogique</h2>

        <div class="profile-grid">
          <button
            v-for="(p, key) in PROFILE_DESCRIPTIONS"
            :key="key"
            :class="['profile-card', { 'profile-card--active': local.mode === key }]"
            @click="update({ mode: key })"
          >
            <AppIcon :name="profileIcons[key]" :size="22" />
            <div>
              <strong>{{ PROFILE_LABELS[key] }}</strong>
              <p>{{ p }}</p>
            </div>
            <AppIcon v-if="local.mode === key" name="check" :size="16" class="profile-card__check" />
          </button>
        </div>

        <BaseSelect
          :model-value="local.niveau"
          label="Niveau de l'apprenant"
          :options="niveauOptions"
          hint="Adapte le vocabulaire et la complexité des explications."
          @update:model-value="v => update({ niveau: v })"
        />

        <BaseInput
          :model-value="local.customSystemPrompt"
          type="textarea"
          label="Prompt système personnalisé (mode Libre)"
          :rows="10"
          placeholder="Définissez ici votre propre prompt système si vous utilisez le mode Libre…"
          hint="Utilisé uniquement quand le mode « Libre » est sélectionné. Pour les autres modes, un prompt expert est chargé automatiquement."
          @update:model-value="v => update({ customSystemPrompt: v })"
        />

        <details class="prompt-preview">
          <summary>
            <AppIcon name="eye" :size="14" />
            <span>Voir le prompt système actuel</span>
          </summary>
          <pre>{{ settingsStore.effectiveSystemPrompt }}</pre>
        </details>
      </section>

      <!-- Onglet Apparence -->
      <section v-if="activeTab === 'appearance'" class="settings-section">
        <h2 class="settings-section__title">Apparence & thème</h2>

        <div class="theme-grid">
          <button
            v-for="t in themes"
            :key="t.id"
            :class="['theme-card', { 'theme-card--active': themeStore.theme === t.id }]"
            @click="themeStore.setTheme(t.id)"
          >
            <div class="theme-card__preview" :class="`theme-card__preview--${t.id}`">
              <span></span><span></span><span></span>
            </div>
            <div class="theme-card__info">
              <AppIcon :name="t.icon" :size="16" />
              <strong>{{ t.label }}</strong>
            </div>
          </button>
        </div>

        <label class="settings-section__field">
          <BaseSwitch
            :model-value="local.reduceAnimations"
            label="Réduire les animations"
            @update:model-value="v => update({ reduceAnimations: v })"
          />
        </label>

        <label class="settings-section__field">
          <BaseSwitch
            :model-value="local.showSuggestions"
            label="Afficher les suggestions de questions"
            @update:model-value="v => update({ showSuggestions: v })"
          />
        </label>

        <label class="settings-section__field">
          <BaseSwitch
            :model-value="local.autoScroll"
            label="Défilement automatique"
            @update:model-value="v => update({ autoScroll: v })"
          />
        </label>
      </section>

      <!-- Onglet Comportement -->
      <section v-if="activeTab === 'behavior'" class="settings-section">
        <h2 class="settings-section__title">Comportement du chat</h2>

        <label class="settings-section__field">
          <BaseSwitch
            :model-value="local.sendOnEnter"
            label="Envoyer avec la touche Entrée"
            @update:model-value="v => update({ sendOnEnter: v })"
          />
          <span class="settings-section__hint">Si désactivé, utilisez Ctrl+Entrée pour envoyer.</span>
        </label>

        <label class="settings-section__field">
          <BaseSwitch
            :model-value="local.enableTTS"
            label="Synthèse vocale (lecture des réponses)"
            @update:model-value="v => update({ enableTTS: v })"
          />
        </label>

        <label class="settings-section__field">
          <BaseSwitch
            :model-value="local.enableSTT"
            label="Reconnaissance vocale (dictée)"
            @update:model-value="v => update({ enableSTT: v })"
          />
        </label>
      </section>

      <!-- Onglet Données -->
      <section v-if="activeTab === 'data'" class="settings-section">
        <h2 class="settings-section__title">Données & stockage</h2>

        <div class="data-card">
          <div class="data-card__info">
            <AppIcon name="database" :size="20" />
            <div>
              <strong>Conversations</strong>
              <p>{{ conversationsStore.conversationCount }} conversation(s) · {{ conversationsStore.totalMessages }} message(s)</p>
            </div>
          </div>
          <BaseButton variant="danger" size="sm" icon="trash" @click="askClearConversations">
            Tout supprimer
          </BaseButton>
        </div>

        <div class="data-card">
          <div class="data-card__info">
            <AppIcon name="dashboard" :size="20" />
            <div>
              <strong>Statistiques</strong>
              <p>{{ statsStore.stats.totalExercises }} exercices · taux de réussite : {{ statsStore.successRate }}%</p>
            </div>
          </div>
          <BaseButton variant="ghost" size="sm" icon="trash" @click="resetStats">
            Réinitialiser
          </BaseButton>
        </div>

        <div class="settings-section__hint settings-section__hint--danger">
          <AppIcon name="alert" :size="14" />
          <p>
            La suppression est <strong>définitive</strong> et ne peut pas être annulée.
            Pensez à exporter vos conversations auparavant si nécessaire.
          </p>
        </div>
      </section>

      <!-- Avertissement sécurité -->
      <div class="security-warning">
        <AppIcon name="alert" :size="16" />
        <div>
          <strong>Avertissement de sécurité</strong>
          <p>
            La clé API est stockée localement dans votre navigateur (LocalStorage).
            Ne partagez pas votre navigateur, et évitez les ordinateurs publics.
            Pour révoquer une clé, rendez-vous sur le portail de votre fournisseur d'API.
          </p>
        </div>
      </div>
    </div>

    <!-- Modale de confirmation -->
    <BaseModal v-model="confirmOpen" :title="confirmTitle" size="sm">
      <p>{{ confirmText }}</p>
      <template #footer>
        <BaseButton variant="ghost" @click="confirmOpen = false">Annuler</BaseButton>
        <BaseButton :variant="confirmVariant" @click="confirmAction">Confirmer</BaseButton>
      </template>
    </BaseModal>

    <!-- Input fichier caché pour import -->
    <input
      ref="fileInput"
      type="file"
      accept="application/json"
      style="display: none"
      @change="onFileImport"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSlider from '@/components/ui/BaseSlider.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useSettingsStore, NIVEAUX } from '@/stores/settings'
import { useThemeStore } from '@/stores/theme'
import { useConversationsStore } from '@/stores/conversations'
import { useStatsStore } from '@/stores/stats'
import { testConnection } from '@/services/aiService'
import { clearAllData } from '@/services/storageService'
import { PROFILE_LABELS, PROFILE_DESCRIPTIONS, PROFILE_MODES } from '@/services/prompts'

const settingsStore = useSettingsStore()
const themeStore = useThemeStore()
const conversationsStore = useConversationsStore()
const statsStore = useStatsStore()

const local = computed(() => settingsStore.settings)
const activeApi = computed(() => settingsStore.activeApi)

const tabs = [
  { id: 'ai',         label: 'IA',         icon: 'cpu' },
  { id: 'profile',    label: 'Profil',     icon: 'cap' },
  { id: 'appearance', label: 'Apparence',  icon: 'sun' },
  { id: 'behavior',   label: 'Comportement', icon: 'settings' },
  { id: 'data',       label: 'Données',    icon: 'database' }
]
const activeTab = ref('ai')

const niveauOptions = NIVEAUX.map(n => ({
  value: n,
  label: n.charAt(0).toUpperCase() + n.slice(1)
}))

const profileIcons = {
  [PROFILE_MODES.DATABASE]: 'database',
  [PROFILE_MODES.FRENCH]: 'book',
  [PROFILE_MODES.ALGORITHM]: 'cpu',
  [PROFILE_MODES.MIXED]: 'brain',
  [PROFILE_MODES.FREE]: 'sparkles'
}

const themes = [
  { id: 'light', label: 'Clair', icon: 'sun' },
  { id: 'dark',  label: 'Sombre', icon: 'moon' },
  { id: 'auto',  label: 'Automatique', icon: 'monitor' }
]

const presets = [
  { name: 'OpenAI',     url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { name: 'Groq',       url: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
  { name: 'LM Studio',  url: 'http://localhost:1234/v1', model: 'local-model' },
  { name: 'Ollama',     url: 'http://localhost:11434/v1', model: 'llama3' },
  { name: 'DeepSeek',   url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' }
]

const testing = ref(false)
const testResult = ref(null)

const fileInput = ref(null)

const confirmOpen = ref(false)
const confirmTitle = ref('')
const confirmText = ref('')
const confirmVariant = ref('danger')
const confirmAction = ref(() => {})

// Options pour le sélecteur d'API
const apiOptions = computed(() =>
  settingsStore.apisList.map(api => ({ value: api.id, label: api.name }))
)

function update(patch) {
  settingsStore.update(patch)
}

function updateApi(apiId, patch) {
  settingsStore.updateApi(apiId, patch)
}

function setActiveApi(apiId) {
  settingsStore.setActiveApi(apiId)
}

function addNewApi() {
  const newId = `api-${Date.now()}`
  settingsStore.addApi({
    id: newId,
    name: 'Nouvelle API',
    apiEndpoint: '',
    apiKey: '',
    model: ''
  })
}

function removeApi(apiId) {
  if (settingsStore.apisList.length <= 1) return
  if (confirm('Supprimer cette API ?')) {
    settingsStore.removeApi(apiId)
  }
}

function applyPreset(preset) {
  const activeApi = settingsStore.activeApi
  settingsStore.updateApi(activeApi.id, {
    apiEndpoint: preset.url,
    model: preset.model
  })
}

async function testApi() {
  testing.value = true
  testResult.value = null
  try {
    const activeApi = settingsStore.activeApi
    const result = await testConnection(activeApi)
    testResult.value = result
  } catch (err) {
    testResult.value = { ok: false, error: err.message }
  } finally {
    testing.value = false
  }
}

function exportSettings() {
  const json = settingsStore.exportSettings()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `educat-settings-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function importSettings() {
  fileInput.value?.click()
}

function onFileImport(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const ok = settingsStore.importSettings(reader.result)
    if (window.__echabot_toast) {
      window.__echabot_toast(
        ok ? 'Paramètres importés.' : "Échec de l'import.",
        ok ? 'success' : 'error'
      )
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}

function askResetAll() {
  confirmTitle.value = 'Tout réinitialiser ?'
  confirmText.value = 'Tous les paramètres, conversations et statistiques seront définitivement effacés.'
  confirmVariant.value = 'danger'
  confirmAction.value = async () => {
    await clearAllData()
    settingsStore.reset()
    statsStore.reset()
    await conversationsStore.hydrate()
    confirmOpen.value = false
    if (window.__echabot_toast) window.__echabot_toast('Application réinitialisée.', 'success')
  }
  confirmOpen.value = true
}

function askClearConversations() {
  confirmTitle.value = 'Supprimer toutes les conversations ?'
  confirmText.value = `${conversationsStore.conversationCount} conversation(s) seront supprimées définitivement.`
  confirmVariant.value = 'danger'
  confirmAction.value = async () => {
    await conversationsStore.clearAll()
    confirmOpen.value = false
    if (window.__echabot_toast) window.__echabot_toast('Conversations supprimées.', 'success')
  }
  confirmOpen.value = true
}

function resetStats() {
  confirmTitle.value = 'Réinitialiser les statistiques ?'
  confirmText.value = 'Toutes vos statistiques pédagogiques seront effacées.'
  confirmVariant.value = 'danger'
  confirmAction.value = () => {
    statsStore.reset()
    confirmOpen.value = false
    if (window.__echabot_toast) window.__echabot_toast('Statistiques réinitialisées.', 'success')
  }
  confirmOpen.value = true
}
</script>

<style scoped>
.settings-view {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-6) var(--space-4);
}
.settings-view__container {
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.settings-view__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.settings-view__header h1 {
  font-size: var(--fs-2xl);
  font-weight: 600;
  color: var(--text-primary);
}
.settings-view__header-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.settings-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 4px;
  overflow-x: auto;
}
.settings-tabs__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  white-space: nowrap;
  transition: background var(--transition), color var(--transition);
}
.settings-tabs__btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.settings-tabs__btn--active {
  background: var(--brand-600);
  color: #fff;
}
.settings-tabs__btn--active:hover { background: var(--brand-700); }

.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
}
.settings-section__title {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--text-primary);
}
.settings-section__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
@media (max-width: 600px) {
  .settings-section__row { grid-template-columns: 1fr; }
}
.settings-section__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}
.settings-section__label {
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--text-primary);
}
.settings-section__hint {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}
.settings-section__actions { display: flex; gap: 8px; }

.settings-section__hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: var(--brand-50);
  border: 1px solid var(--brand-200);
  border-radius: var(--radius-md);
  color: var(--brand-700);
  font-size: var(--fs-sm);
}
[data-theme="dark"] .settings-section__hint,
[data-theme="auto"] .settings-section__hint {
  background: rgba(99,102,241,0.1);
  border-color: rgba(99,102,241,0.25);
  color: var(--brand-300);
}
.settings-section__hint p { line-height: 1.5; }
.settings-section__hint--danger {
  background: rgba(239,68,68,0.08);
  border-color: rgba(239,68,68,0.3);
  color: var(--danger);
}

.test-result {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  font-size: var(--fs-sm);
}
.test-result--ok {
  background: rgba(16,185,129,0.08);
  border: 1px solid rgba(16,185,129,0.3);
  color: var(--success);
}
.test-result--fail {
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.3);
  color: var(--danger);
}
.test-result p { color: var(--text-secondary); margin-top: 2px; }

.quick-presets h4 {
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.quick-presets__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}
.quick-preset {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  text-align: left;
  transition: all var(--transition);
}
.quick-preset:hover {
  background: var(--bg-hover);
  border-color: var(--brand-400);
}
.quick-preset strong { font-size: var(--fs-sm); color: var(--text-primary); }
.quick-preset span {
  font-size: 10px;
  color: var(--text-muted);
  word-break: break-all;
}

/* API Selector */
.api-selector {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.api-selector__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* API Item */
.api-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--bg-subtle);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}
.api-item__header {
  display: flex;
  gap: var(--space-3);
  align-items: flex-end;
}
.api-item__header .base-input {
  flex: 1;
}

.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
@media (max-width: 600px) { .profile-grid { grid-template-columns: 1fr; } }

.profile-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: var(--space-4);
  background: var(--bg-subtle);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  text-align: left;
  position: relative;
  transition: all var(--transition);
}
.profile-card:hover {
  border-color: var(--brand-400);
  background: var(--bg-hover);
}
.profile-card--active {
  border-color: var(--brand-600);
  background: var(--brand-50);
}
[data-theme="dark"] .profile-card--active,
[data-theme="auto"] .profile-card--active {
  background: rgba(99,102,241,0.1);
}
.profile-card svg { color: var(--brand-600); flex-shrink: 0; }
.profile-card strong { display: block; font-size: var(--fs-sm); color: var(--text-primary); margin-bottom: 4px; }
.profile-card p { font-size: var(--fs-xs); color: var(--text-muted); line-height: 1.4; }
.profile-card__check {
  position: absolute;
  top: 10px; right: 10px;
  color: var(--brand-600);
}

.prompt-preview {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-subtle);
}
.prompt-preview summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  cursor: pointer;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}
.prompt-preview summary:hover { color: var(--text-primary); }
.prompt-preview pre {
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-secondary);
  max-height: 320px;
  overflow-y: auto;
  border-top: 1px solid var(--border-color);
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
@media (max-width: 600px) { .theme-grid { grid-template-columns: 1fr; } }

.theme-card {
  padding: 10px;
  background: var(--bg-subtle);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color var(--transition);
}
.theme-card--active { border-color: var(--brand-600); }
.theme-card__preview {
  display: flex;
  gap: 4px;
  padding: 12px;
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
}
.theme-card__preview span { flex: 1; height: 18px; border-radius: 3px; }
.theme-card__preview--light { background: #f7f8fa; }
.theme-card__preview--light span:nth-child(1) { background: #6366f1; }
.theme-card__preview--light span:nth-child(2) { background: #1a1d21; }
.theme-card__preview--light span:nth-child(3) { background: #e5e7eb; }
.theme-card__preview--dark { background: #0f1115; }
.theme-card__preview--dark span:nth-child(1) { background: #6366f1; }
.theme-card__preview--dark span:nth-child(2) { background: #e6e8ec; }
.theme-card__preview--dark span:nth-child(3) { background: #2a313c; }
.theme-card__preview--auto { background: linear-gradient(90deg, #f7f8fa 50%, #0f1115 50%); }
.theme-card__preview--auto span:nth-child(1) { background: #6366f1; }
.theme-card__preview--auto span:nth-child(2) { background: #999; }
.theme-card__preview--auto span:nth-child(3) { background: #ccc; }
.theme-card__info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-sm);
  color: var(--text-primary);
}
.theme-card__info svg { color: var(--brand-600); }

.data-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}
.data-card__info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.data-card__info svg { color: var(--brand-600); }
.data-card__info strong { display: block; font-size: var(--fs-sm); color: var(--text-primary); }
.data-card__info p { font-size: var(--fs-xs); color: var(--text-muted); }

.security-warning {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: var(--radius-md);
  color: var(--warning);
  font-size: var(--fs-sm);
}
.security-warning svg { flex-shrink: 0; margin-top: 2px; }
.security-warning strong { display: block; margin-bottom: 4px; }
.security-warning p { color: var(--text-secondary); line-height: 1.5; }
</style>