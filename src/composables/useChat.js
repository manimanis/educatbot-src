import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useConversationsStore } from '@/stores/conversations'
import { useSettingsStore } from '@/stores/settings'
import { useStatsStore } from '@/stores/stats'
import { sendMessage, estimateTokens } from '@/services/aiService'

/**
 * Composable centralisant la logique de chat :
 *   - construction du payload messages
 *   - appel streaming au service IA
 *   - gestion des erreurs
 *   - statistiques
 *   - annulation
 */
export function useChat() {
  const conversationsStore = useConversationsStore()
  const settingsStore = useSettingsStore()
  const statsStore = useStatsStore()

  const { settings } = storeToRefs(settingsStore)
  const { messages, activeId } = storeToRefs(conversationsStore)

  // Paramètres de l'API active (combinés avec les paramètres globaux)
  const activeApiSettings = computed(() => {
    const activeApi = settingsStore.activeApi
    return {
      ...activeApi,
      mode: settings.value.mode,
      niveau: settings.value.niveau,
      customSystemPrompt: settings.value.customSystemPrompt
    }
  })

  const isStreaming = ref(false)
  const error = ref(null)
  const abortController = ref(null)

  /**
   * Construit la liste des messages envoyés à l'API.
   * Inclut le system prompt et l'historique.
   */
  function buildApiMessages() {
    const systemPrompt = settingsStore.effectiveSystemPrompt
    const apiMessages = [{ role: 'system', content: systemPrompt }]
    for (const m of conversationsStore.messages) {
      if (m.status === 'error' || m.status === 'aborted') continue
      if (!m.content || !m.content.trim()) continue
      apiMessages.push({ role: m.role, content: m.content })
    }
    return apiMessages
  }

  /**
   * Envoie un message utilisateur et attend la réponse de l'IA.
   * @param {string} content - Contenu du message utilisateur
   * @returns {Promise<void>}
   */
  async function send(content) {
    if (!content?.trim()) return
    if (isStreaming.value) return

    error.value = null

    // S'assure qu'il y a une conversation active
    if (!conversationsStore.activeId) {
      await conversationsStore.createConversation({ mode: settings.value.mode })
    }

    // Ajoute le message utilisateur
    const userMsg = await conversationsStore.addMessage({
      role: 'user',
      content: content.trim(),
      status: 'sent'
    })
    statsStore.recordMessage('user', settings.value.mode, estimateTokens(content))

    // Prépare le message assistant (placeholder)
    const assistantMsg = await conversationsStore.addMessage({
      role: 'assistant',
      content: '',
      status: 'streaming'
    })

    isStreaming.value = true
    abortController.value = new AbortController()
    const startTime = Date.now()

    try {
      const apiMessages = buildApiMessages()
      const result = await sendMessage(apiMessages, activeApiSettings.value, {
        stream: activeApiSettings.value.stream,
        signal: abortController.value.signal,
        onToken: (_delta, full) => {
          conversationsStore.updateMessage(assistantMsg.id, {
            content: full,
            status: 'streaming'
          })
        }
      })

      await conversationsStore.updateMessage(assistantMsg.id, {
        content: result.content || '',
        status: 'complete',
        meta: {
          tokens: result.usage?.total_tokens || estimateTokens(result.content || ''),
          duration: Date.now() - startTime,
          finishReason: result.finishReason,
          usage: result.usage
        }
      })

      statsStore.recordMessage('assistant', settings.value.mode,
        result.usage?.total_tokens || estimateTokens(result.content || ''))
    } catch (err) {
      if (err.aborted) {
        await conversationsStore.updateMessage(assistantMsg.id, {
          status: 'aborted',
          meta: { aborted: true, duration: Date.now() - startTime }
        })
      } else {
        error.value = err.message || 'Une erreur est survenue.'
        await conversationsStore.updateMessage(assistantMsg.id, {
          status: 'error',
          content: (assistantMsg.content || '') + (assistantMsg.content ? '\n\n' : '') +
            `⚠️ **Erreur** : ${err.message}`,
          meta: { error: err.message, duration: Date.now() - startTime }
        })
      }
    } finally {
      isStreaming.value = false
      abortController.value = null
    }
  }

  /**
   * Régénère la dernière réponse assistant.
   */
  async function regenerate() {
    if (isStreaming.value) return
    // Trouve le dernier message utilisateur
    const lastUserIdx = [...conversationsStore.messages]
      .reverse()
      .findIndex(m => m.role === 'user')
    if (lastUserIdx === -1) return

    const realIdx = conversationsStore.messages.length - 1 - lastUserIdx
    const lastUserMsg = conversationsStore.messages[realIdx]
    const content = lastUserMsg.content

    // Supprime le dernier message assistant si présent
    if (realIdx + 1 < conversationsStore.messages.length) {
      const next = conversationsStore.messages[realIdx + 1]
      if (next.role === 'assistant') {
        await conversationsStore.removeMessage(next.id)
      }
    }

    // Supprime le dernier message utilisateur pour le renvoyer
    await conversationsStore.removeMessage(lastUserMsg.id)

    // Renvoie
    await send(content)
  }

  /**
   * Annule la génération en cours.
   */
  function cancel() {
    if (abortController.value) {
      abortController.value.abort()
    }
  }

  return {
    isStreaming,
    error,
    messages,
    activeId,
    send,
    regenerate,
    cancel
  }
}