<template>
  <div class="chat-view">
    <ConversationToolbar
      v-if="conversationsStore.activeConversation"
      :title="conversationsStore.activeConversation.title"
      :subtitle="toolbarSubtitle"
      @new="newConversation"
    />

    <ChatWindow
      ref="chatWindowRef"
      :is-streaming="isStreaming"
      @regenerate="regenerate"
    />

    <ChatInput
      :disabled="!settingsStore.isConfigured"
      :is-streaming="isStreaming"
      :has-messages="messages.length > 0"
      @send="onSend"
      @cancel="cancel"
    />

    <!-- Erreur permanente affichée en bas -->
    <div v-if="error && !isStreaming" class="chat-view__error">
      <AppIcon name="alert" :size="14" />
      <span>{{ error }}</span>
      <button class="icon-btn" aria-label="Fermer" @click="clearError">
        <AppIcon name="x" :size="14" />
      </button>
    </div>

    <!-- Overlay "non configuré" -->
    <div v-if="!settingsStore.isConfigured" class="chat-view__overlay">
      <div class="chat-view__overlay-card">
        <AppIcon name="info" :size="24" />
        <h3>Configuration requise</h3>
        <p>
          Pour utiliser le chat, configurez votre endpoint d'API IA et votre clé API
          dans les Paramètres.
        </p>
        <BaseButton variant="primary" icon="settings" @click="$router.push('/settings')">
          Ouvrir les Paramètres
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import ChatWindow from '@/components/chat/ChatWindow.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import ConversationToolbar from '@/components/chat/ConversationToolbar.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useChat } from '@/composables/useChat'
import { useSettingsStore } from '@/stores/settings'
import { useConversationsStore } from '@/stores/conversations'
import { PROFILE_LABELS } from '@/services/prompts'

const settingsStore = useSettingsStore()
const conversationsStore = useConversationsStore()

const { isStreaming, error, messages, send, regenerate, cancel } = useChat()
const chatWindowRef = ref(null)

const toolbarSubtitle = computed(() => {
  const conv = conversationsStore.activeConversation
  if (!conv) return ''
  return `${PROFILE_LABELS[conv.mode] || ''} · ${conv.messageCount || 0} message(s)`
})

function clearError() {
  error.value = null
}

async function onSend(content) {
  if (!settingsStore.isConfigured) {
    if (window.__echabot_toast) window.__echabot_toast('Configurez votre API IA dans les Paramètres.', 'warning')
    return
  }
  await send(content)
}

async function newConversation() {
  const currentId = conversationsStore.activeId
  if (currentId) {
    await conversationsStore.archiveConversation(currentId)
  }
  await conversationsStore.createConversation({ mode: settingsStore.settings.mode })
}

watch(() => conversationsStore.activeId, () => {
  chatWindowRef.value?.scrollToBottom?.(true)
})
</script>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.chat-view__error {
  position: absolute;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--danger);
  border-radius: var(--radius-full);
  color: var(--danger);
  font-size: var(--fs-sm);
  box-shadow: var(--shadow-lg);
  z-index: 50;
  max-width: calc(100% - 32px);
}

.chat-view__overlay {
  position: absolute;
  inset: 0;
  background: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  z-index: 100;
}

.chat-view__overlay-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: var(--space-8);
  background: var(--bg-elevated);
  border-radius: var(--radius-lg);
  max-width: 420px;
  text-align: center;
  box-shadow: var(--shadow-lg);
}
.chat-view__overlay-card svg { color: var(--brand-600); }
.chat-view__overlay-card h3 { font-size: var(--fs-xl); color: var(--text-primary); }
.chat-view__overlay-card p { color: var(--text-secondary); font-size: var(--fs-sm); line-height: 1.5; }
</style>
