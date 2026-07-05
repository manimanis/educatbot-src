import { defineStore } from 'pinia'
import { storage } from '@/services/storageService'
import { getSystemPrompt, FREE_DEFAULT_PROMPT, PROFILE_MODES } from '@/services/prompts'

/* =========================================================
   Store des paramètres IA et généraux
   ========================================================= */

const DEFAULT_API = {
  id: 'default',
  name: 'API par défaut',
  apiEndpoint: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 2048,
  timeout: 60000,
  maxRetries: 2,
  stream: true,
  autoAppendChatCompletions: true
}

const DEFAULT_SETTINGS = {
  // APIs IA (tableau de configurations)
  apis: [DEFAULT_API],
  activeApiId: 'default',

  // Pédagogie
  mode: PROFILE_MODES.MIXED,
  niveau: 'intermédiaire',
  customSystemPrompt: FREE_DEFAULT_PROMPT,

  // Préférences UI
  sendOnEnter: true,
  showSuggestions: true,
  autoScroll: true,
  enableTTS: false,
  enableSTT: false,
  reduceAnimations: false
}

const NIVEAUX = ['débutant', 'intermédiaire', 'avancé']

/**
 * Migration des anciens paramètres vers le nouveau format multi-API.
 * Si les paramètres existants ont apiEndpoint au niveau racine, on les migre.
 */
function migrateSettings(saved) {
  // Si déjà au nouveau format, on retourne tel quel
  if (saved.apis && Array.isArray(saved.apis)) {
    // Migration des anciens autoAppendChatCompletions globaux vers chaque API
    const apis = saved.apis.map(api => ({
      ...api,
      autoAppendChatCompletions: api.autoAppendChatCompletions ?? saved.autoAppendChatCompletions ?? true
    }))
    return { ...saved, apis }
  }

  // Migration depuis l'ancien format
  const migrated = { ...DEFAULT_SETTINGS }
  
  // Migration des paramètres API de l'ancien format
  if (saved.apiEndpoint || saved.apiKey || saved.model) {
    migrated.apis = [{
      id: 'default',
      name: 'API par défaut',
      apiEndpoint: saved.apiEndpoint || DEFAULT_API.apiEndpoint,
      apiKey: saved.apiKey || '',
      model: saved.model || DEFAULT_API.model,
      temperature: saved.temperature ?? DEFAULT_API.temperature,
      maxTokens: saved.maxTokens ?? DEFAULT_API.maxTokens,
      timeout: saved.timeout ?? DEFAULT_API.timeout,
      maxRetries: saved.maxRetries ?? DEFAULT_API.maxRetries,
      stream: saved.stream ?? DEFAULT_API.stream,
      autoAppendChatCompletions: saved.autoAppendChatCompletions ?? true
    }]
  }

  // Migration des paramètres globaux
  migrated.mode = saved.mode ?? DEFAULT_SETTINGS.mode
  migrated.niveau = saved.niveau ?? DEFAULT_SETTINGS.niveau
  migrated.customSystemPrompt = saved.customSystemPrompt ?? DEFAULT_SETTINGS.customSystemPrompt
  migrated.sendOnEnter = saved.sendOnEnter ?? DEFAULT_SETTINGS.sendOnEnter
  migrated.showSuggestions = saved.showSuggestions ?? DEFAULT_SETTINGS.showSuggestions
  migrated.autoScroll = saved.autoScroll ?? DEFAULT_SETTINGS.autoScroll
  migrated.enableTTS = saved.enableTTS ?? DEFAULT_SETTINGS.enableTTS
  migrated.enableSTT = saved.enableSTT ?? DEFAULT_SETTINGS.enableSTT
  migrated.reduceAnimations = saved.reduceAnimations ?? DEFAULT_SETTINGS.reduceAnimations

  return migrated
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: migrateSettings(storage.get('settings', {})),
    hydrated: false
  }),

  getters: {
    effectiveSystemPrompt(state) {
      return getSystemPrompt(
        state.settings.mode,
        state.settings.customSystemPrompt,
        state.settings.niveau
      )
    },
    isConfigured(state) {
      const activeApi = state.settings.apis.find(api => api.id === state.settings.activeApiId)
      return !!activeApi?.apiEndpoint && !!activeApi?.model
    },
    activeApi(state) {
      return state.settings.apis.find(api => api.id === state.settings.activeApiId) || DEFAULT_API
    },
    apisList(state) {
      return state.settings.apis
    }
  },

  actions: {
    hydrate() {
      this.settings = migrateSettings(storage.get('settings', {}))
      this.hydrated = true
    },

    save() {
      storage.set('settings', this.settings)
    },

    update(patch) {
      this.settings = { ...this.settings, ...patch }
      this.save()
    },

    reset() {
      this.settings = { ...DEFAULT_SETTINGS }
      this.save()
    },

    exportSettings() {
      return JSON.stringify(this.settings, null, 2)
    },

    importSettings(json) {
      try {
        const parsed = JSON.parse(json)
        this.settings = migrateSettings(parsed)
        this.save()
        return true
      } catch {
        return false
      }
    },

    setMode(mode) {
      this.settings.mode = mode
      this.save()
    },

    setNiveau(niveau) {
      if (NIVEAUX.includes(niveau)) {
        this.settings.niveau = niveau
        this.save()
      }
    },

    // Gestion des APIs multiples
    addApi(api) {
      const newApi = {
        id: api.id || `api-${Date.now()}`,
        name: api.name || 'Nouvelle API',
        apiEndpoint: api.apiEndpoint || '',
        apiKey: api.apiKey || '',
        model: api.model || '',
        temperature: api.temperature ?? 0.7,
        maxTokens: api.maxTokens ?? 2048,
        timeout: api.timeout ?? 60000,
        maxRetries: api.maxRetries ?? 2,
        stream: api.stream ?? true,
        autoAppendChatCompletions: api.autoAppendChatCompletions ?? true
      }
      this.settings.apis = [...this.settings.apis, newApi]
      this.settings.activeApiId = newApi.id
      this.save()
    },

    updateApi(apiId, patch) {
      this.settings.apis = this.settings.apis.map(api =>
        api.id === apiId ? { ...api, ...patch } : api
      )
      this.save()
    },

    removeApi(apiId) {
      if (this.settings.apis.length <= 1) return // On garde au moins une API
      this.settings.apis = this.settings.apis.filter(api => api.id !== apiId)
      // Si l'API supprimée était active, on sélectionne la première
      if (this.settings.activeApiId === apiId) {
        this.settings.activeApiId = this.settings.apis[0].id
      }
      this.save()
    },

    setActiveApi(apiId) {
      if (this.settings.apis.some(api => api.id === apiId)) {
        this.settings.activeApiId = apiId
        this.save()
      }
    }
  }
})

export { NIVEAUX, DEFAULT_SETTINGS, DEFAULT_API }