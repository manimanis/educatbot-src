import { defineStore } from 'pinia'
import { storage } from '@/services/storageService'

/* =========================================================
   Store des statistiques pédagogiques
   ========================================================= */

const STATS_KEY = 'stats'
const SESSION_KEY = 'sessionStats'

const DEFAULT_STATS = {
  totalConversations: 0,
  totalMessages: 0,
  userMessages: 0,
  assistantMessages: 0,
  totalExercises: 0,
  exercisesSucceeded: 0,
  exercisesFailed: 0,
  timeSpentMs: 0,           // Temps total passé (ms)
  tokensUsed: 0,            // Estimation des tokens utilisés
  byMode: {
    database:  { messages: 0, exercises: 0, succeeded: 0 },
    french:    { messages: 0, exercises: 0, succeeded: 0 },
    algorithm: { messages: 0, exercises: 0, succeeded: 0 },
    mixed:     { messages: 0, exercises: 0, succeeded: 0 },
    free:      { messages: 0, exercises: 0, succeeded: 0 }
  },
  byDay: {},                // { 'YYYY-MM-DD': { messages, exercises, timeMs } }
  progression: {
    database: [],           // historique de réussite SQL
    french:   [],           // historique de réussite Français
    algorithm: []           // historique de réussite Algorithmique
  }
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const useStatsStore = defineStore('stats', {
  state: () => ({
    stats: { ...DEFAULT_STATS, ...storage.get(STATS_KEY, {}) },
    sessionStart: Date.now()
  }),

  getters: {
    successRate(state) {
      const total = state.stats.totalExercises
      if (!total) return 0
      return Math.round((state.stats.exercisesSucceeded / total) * 100)
    },

    formattedTimeSpent(state) {
      const minutes = Math.floor(state.stats.timeSpentMs / 60000)
      if (minutes < 60) return `${minutes} min`
      const hours = Math.floor(minutes / 60)
      return `${hours} h ${minutes % 60} min`
    },

    last7Days(state) {
      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const dayData = state.stats.byDay[key] || { messages: 0, exercises: 0, timeMs: 0 }
        days.push({
          date: key,
          label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
          ...dayData
        })
      }
      return days
    },

    databaseProgression(state) {
      return state.stats.progression.database
    },

    frenchProgression(state) {
      return state.stats.progression.french
    }
  },

  actions: {
    persist() {
      storage.set(STATS_KEY, this.stats)
    },

    recordMessage(role, mode, tokens = 0) {
      this.stats.totalMessages++
      if (role === 'user') this.stats.userMessages++
      if (role === 'assistant') this.stats.assistantMessages++
      this.stats.tokensUsed += tokens

      const modeKey = mode || 'mixed'
      if (this.stats.byMode[modeKey]) {
        this.stats.byMode[modeKey].messages++
      }

      this._recordDay({ messages: 1 })
      this.persist()
    },

    recordConversation() {
      this.stats.totalConversations++
      this.persist()
    },

    recordExercise(mode, success) {
      this.stats.totalExercises++
      if (success) this.stats.exercisesSucceeded++
      else this.stats.exercisesFailed++

      const modeKey = mode || 'mixed'
      if (this.stats.byMode[modeKey]) {
        this.stats.byMode[modeKey].exercises++
        if (success) this.stats.byMode[modeKey].succeeded++
      }

      // Progression par domaine
      const domain = mode === 'database' ? 'database' : mode === 'french' ? 'french' : mode === 'algorithm' ? 'algorithm' : null
      if (domain) {
        const arr = this.stats.progression[domain]
        arr.push({ date: new Date().toISOString(), success })
        // Limite à 100 derniers
        if (arr.length > 100) arr.shift()
      }

      this._recordDay({ exercises: 1 })
      this.persist()
    },

    recordTime(ms) {
      this.stats.timeSpentMs += ms
      this._recordDay({ timeMs: ms })
      this.persist()
    },

    _recordDay({ messages = 0, exercises = 0, timeMs = 0 }) {
      const key = todayKey()
      if (!this.stats.byDay[key]) {
        this.stats.byDay[key] = { messages: 0, exercises: 0, timeMs: 0 }
      }
      this.stats.byDay[key].messages += messages
      this.stats.byDay[key].exercises += exercises
      this.stats.byDay[key].timeMs += timeMs
    },

    reset() {
      this.stats = JSON.parse(JSON.stringify(DEFAULT_STATS))
      this.persist()
    },

    // À appeler régulièrement pour mesurer le temps de session
    flushSessionTime() {
      const elapsed = Date.now() - this.sessionStart
      this.sessionStart = Date.now()
      if (elapsed > 0 && elapsed < 3600000) { // max 1h par flush
        this.recordTime(elapsed)
      }
    }
  }
})
