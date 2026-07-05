import { defineStore } from 'pinia'
import { nanoid } from 'nanoid'
import {
  saveConversation,
  getConversation,
  getAllConversations,
  deleteConversation,
  saveMessage,
  getMessages,
  deleteMessage,
  storage
} from '@/services/storageService'
import { PROFILE_MODES } from '@/services/prompts'

/* =========================================================
   Store des conversations et messages
   ========================================================= */

const ACTIVE_CONV_KEY = 'activeConversationId'

function createConversation({ title = 'Nouvelle conversation', mode = PROFILE_MODES.MIXED } = {}) {
  const now = new Date().toISOString()
  return {
    id: nanoid(),
    title,
    mode,
    createdAt: now,
    updatedAt: now,
    pinned: false,
    favorite: false,
    archived: false,
    messageCount: 0,
    lastMessagePreview: ''
  }
}

function createMessage({ conversationId, role, content, status = 'sent', meta = {} }) {
  return {
    id: nanoid(),
    conversationId,
    role,             // 'user' | 'assistant' | 'system'
    content,
    status,           // 'sent' | 'streaming' | 'complete' | 'error' | 'aborted'
    createdAt: new Date().toISOString(),
    meta              // { tokens, duration, exercise, ... }
  }
}

export const useConversationsStore = defineStore('conversations', {
  state: () => ({
    conversations: [],
    activeId: null,
    messages: [],
    loading: false,
    searchQuery: '',
    hydrated: false
  }),

  getters: {
    activeConversation(state) {
      return state.conversations.find(c => c.id === state.activeId) || null
    },

    sortedConversations(state) {
      const list = [...state.conversations]
      list.sort((a, b) => {
        // Épinglés en premier
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        // Favoris ensuite
        if (a.favorite && !b.favorite) return -1
        if (!a.favorite && b.favorite) return 1
        // Par date de mise à jour (plus récent en premier)
        return new Date(b.updatedAt) - new Date(a.updatedAt)
      })
      return list
    },

    activeConversations(state) {
      return state.conversations.filter(c => !c.archived)
    },

    archivedConversations(state) {
      return state.conversations.filter(c => c.archived)
    },

    filteredConversations(state) {
      const q = state.searchQuery.trim().toLowerCase()
      if (!q) return state.activeConversations
      return state.activeConversations.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.lastMessagePreview || '').toLowerCase().includes(q)
      )
    },

    conversationCount(state) {
      return state.conversations.length
    },

    totalMessages(state) {
      return state.conversations.reduce((sum, c) => sum + (c.messageCount || 0), 0)
    }
  },

  actions: {
    async hydrate() {
      this.loading = true
      try {
        this.conversations = await getAllConversations()
        // S'assurer que les conversations existantes ont le champ archived
        for (const conv of this.conversations) {
          if (conv.archived === undefined) {
            conv.archived = false
          }
        }
        const stored = storage.get(ACTIVE_CONV_KEY, null)
        if (stored && this.conversations.find(c => c.id === stored)) {
          this.activeId = stored
          await this.loadMessages(stored)
        } else if (this.conversations.length > 0) {
          await this.setActive(this.conversations[0].id)
        }
      } catch (e) {
        console.error('[conversations] hydrate error', e)
      } finally {
        this.loading = false
        this.hydrated = true
      }
    },

    async createConversation({ title, mode } = {}) {
      const conv = createConversation({ title, mode })
      await saveConversation(conv)
      this.conversations.unshift(conv)
      await this.setActive(conv.id)
      return conv
    },

    async setActive(id) {
      if (!id) {
        this.activeId = null
        this.messages = []
        storage.remove(ACTIVE_CONV_KEY)
        return
      }
      this.activeId = id
      storage.set(ACTIVE_CONV_KEY, id)
      await this.loadMessages(id)
    },

    async loadMessages(id) {
      try {
        this.messages = await getMessages(id)
      } catch (e) {
        console.error('[conversations] loadMessages error', e)
        this.messages = []
      }
    },

    async renameConversation(id, title) {
      const conv = this.conversations.find(c => c.id === id)
      if (!conv) return
      conv.title = title.trim() || 'Sans titre'
      conv.updatedAt = new Date().toISOString()
      await saveConversation(conv)
    },

    async togglePin(id) {
      const conv = this.conversations.find(c => c.id === id)
      if (!conv) return
      conv.pinned = !conv.pinned
      conv.updatedAt = new Date().toISOString()
      await saveConversation(conv)
    },

    async toggleFavorite(id) {
      const conv = this.conversations.find(c => c.id === id)
      if (!conv) return
      conv.favorite = !conv.favorite
      conv.updatedAt = new Date().toISOString()
      await saveConversation(conv)
    },

    async removeConversation(id) {
      try {
        await deleteConversation(id)
      } catch (e) {
        console.error('[conversations] removeConversation error', e)
      }
      this.conversations = this.conversations.filter(c => c.id !== id)
      if (this.activeId === id) {
        if (this.conversations.length > 0) {
          await this.setActive(this.conversations[0].id)
        } else {
          this.activeId = null
          this.messages = []
          storage.remove(ACTIVE_CONV_KEY)
        }
      }
    },

    async addMessage({ role, content, status = 'sent', meta = {} }) {
      if (!this.activeId) return null
      const msg = createMessage({
        conversationId: this.activeId,
        role,
        content,
        status,
        meta
      })
      await saveMessage(msg)
      this.messages.push(msg)

      // Met à jour la conversation
      const conv = this.conversations.find(c => c.id === this.activeId)
      if (conv) {
        conv.messageCount = (conv.messageCount || 0) + 1
        conv.updatedAt = new Date().toISOString()
        conv.lastMessagePreview = content.slice(0, 80)
        // Renomme automatiquement si c'est le premier message
        if (conv.title === 'Nouvelle conversation' && role === 'user') {
          conv.title = content.slice(0, 40).replace(/\n/g, ' ') + (content.length > 40 ? '…' : '')
        }
        await saveConversation(conv)
      }
      return msg
    },

    async updateMessage(id, patch) {
      const msg = this.messages.find(m => m.id === id)
      if (!msg) return
      Object.assign(msg, patch)
      await saveMessage(msg)

      // Mise à jour de l'aperçu si c'est le dernier message
      const conv = this.conversations.find(c => c.id === this.activeId)
      if (conv && this.messages[this.messages.length - 1]?.id === id) {
        conv.lastMessagePreview = (msg.content || '').slice(0, 80)
        conv.updatedAt = new Date().toISOString()
        await saveConversation(conv)
      }
    },

    async removeMessage(id) {
      await deleteMessage(id)
      this.messages = this.messages.filter(m => m.id !== id)
      const conv = this.conversations.find(c => c.id === this.activeId)
      if (conv) {
        conv.messageCount = Math.max(0, (conv.messageCount || 0) - 1)
        conv.updatedAt = new Date().toISOString()
        await saveConversation(conv)
      }
    },

    async archiveConversation(id) {
      const conv = this.conversations.find(c => c.id === id)
      if (!conv || conv.archived) return
      conv.archived = true
      conv.updatedAt = new Date().toISOString()
      await saveConversation(conv)
    },

    async restoreConversation(id) {
      const conv = this.conversations.find(c => c.id === id)
      if (!conv || !conv.archived) return
      conv.archived = false
      conv.updatedAt = new Date().toISOString()
      await saveConversation(conv)
    },

    async clearAll() {
      for (const conv of [...this.conversations]) {
        await deleteConversation(conv.id)
      }
      this.conversations = []
      this.messages = []
      this.activeId = null
      storage.remove(ACTIVE_CONV_KEY)
    },

    setSearch(query) {
      this.searchQuery = query
    },

    /* ---------- Export / Import ---------- */

    async exportConversation(id, format = 'json') {
      const conv = this.conversations.find(c => c.id === id) || await getConversation(id)
      if (!conv) return null
      const msgs = await getMessages(id)

      switch (format) {
        case 'json':
          return exportJSON(conv, msgs)
        case 'markdown':
          return exportMarkdown(conv, msgs)
        case 'txt':
          return exportTxt(conv, msgs)
        case 'pdf':
          return exportTxt(conv, msgs) // PDF généré côté composant (print)
        default:
          return exportJSON(conv, msgs)
      }
    },

    async importConversation(json) {
      try {
        const data = JSON.parse(json)
        const conv = {
          id: data.id || nanoid(),
          title: data.title || 'Conversation importée',
          mode: data.mode || PROFILE_MODES.MIXED,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pinned: false,
          favorite: false,
          messageCount: 0,
          lastMessagePreview: ''
        }
        await saveConversation(conv)
        const msgs = (data.messages || []).map(m => ({
          id: m.id || nanoid(),
          conversationId: conv.id,
          role: m.role,
          content: m.content,
          status: m.status || 'complete',
          createdAt: m.createdAt || new Date().toISOString(),
          meta: m.meta || {}
        }))
        for (const m of msgs) await saveMessage(m)
        conv.messageCount = msgs.length
        conv.lastMessagePreview = msgs.length ? (msgs[msgs.length - 1].content || '').slice(0, 80) : ''
        await saveConversation(conv)

        this.conversations.unshift(conv)
        return conv
      } catch (e) {
        console.error('[conversations] import error', e)
        return null
      }
    }
  }
})

/* =========================================================
   Formatteurs d'export
   ========================================================= */

function exportJSON(conv, messages) {
  return JSON.stringify({
    id: conv.id,
    title: conv.title,
    mode: conv.mode,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
    messages
  }, null, 2)
}

function exportMarkdown(conv, messages) {
  const lines = []
  lines.push(`# ${conv.title}`)
  lines.push('')
  lines.push(`- **Mode** : ${conv.mode}`)
  lines.push(`- **Créée le** : ${new Date(conv.createdAt).toLocaleString('fr-FR')}`)
  lines.push(`- **Messages** : ${messages.length}`)
  lines.push('')
  lines.push('---')
  lines.push('')
  for (const m of messages) {
    const author = m.role === 'user' ? '🧑 Utilisateur' : m.role === 'assistant' ? '🤖 Assistant' : '⚙️ Système'
    const time = new Date(m.createdAt).toLocaleString('fr-FR')
    lines.push(`### ${author} — _${time}_`)
    lines.push('')
    lines.push(m.content || '')
    lines.push('')
  }
  return lines.join('\n')
}

function exportTxt(conv, messages) {
  const lines = []
  lines.push(`Conversation : ${conv.title}`)
  lines.push(`Mode : ${conv.mode}`)
  lines.push(`Créée le : ${new Date(conv.createdAt).toLocaleString('fr-FR')}`)
  lines.push('='.repeat(60))
  lines.push('')
  for (const m of messages) {
    const author = m.role === 'user' ? 'Utilisateur' : m.role === 'assistant' ? 'Assistant' : 'Système'
    const time = new Date(m.createdAt).toLocaleString('fr-FR')
    lines.push(`[${time}] ${author} :`)
    lines.push(m.content || '')
    lines.push('-'.repeat(60))
    lines.push('')
  }
  return lines.join('\n')
}
