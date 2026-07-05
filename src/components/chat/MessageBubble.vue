<template>
  <div class="message" :class="`message--${role}`" :data-status="message.status">
    <div class="message__avatar" :class="`message__avatar--${role}`" aria-hidden="true">
      <AppIcon :name="avatarIcon" :size="18" />
    </div>

    <div class="message__content">
      <div class="message__meta">
        <span class="message__author">{{ authorLabel }}</span>
        <span class="message__time" :title="fullTime">{{ timeLabel }}</span>
      </div>

      <div class="message__bubble">
        <!-- Streaming placeholder -->
        <div v-if="message.status === 'streaming' && !message.content" class="typing-dots" aria-label="L'assistant écrit">
          <span></span><span></span><span></span>
        </div>

        <div
          v-else
          class="markdown-body"
          v-html="renderedContent"
        ></div>

        <!-- Indicateur streaming en cours -->
        <span v-if="message.status === 'streaming' && message.content" class="message__cursor" aria-hidden="true">▋</span>
      </div>

      <!-- Barre d'actions -->
      <div v-if="showActions" class="message__actions">
        <button
          v-if="role === 'assistant'"
          class="icon-btn"
          :aria-label="isSpeaking ? 'Arrêter la lecture' : 'Lire à voix haute'"
          :title="isSpeaking ? 'Arrêter' : 'Lire'"
          @click="toggleSpeak(message.content)"
        >
          <AppIcon :name="isSpeaking ? 'stop' : 'volume'" :size="14" />
        </button>

        <button
          class="icon-btn"
          aria-label="Copier"
          title="Copier"
          @click="copyContent"
        >
          <AppIcon :name="copied ? 'check' : 'copy'" :size="14" />
        </button>

        <button
          v-if="role === 'assistant' && message.status === 'complete'"
          class="icon-btn"
          aria-label="Régénérer"
          title="Régénérer"
          @click="$emit('regenerate')"
        >
          <AppIcon name="refresh" :size="14" />
        </button>

        <button
          v-if="message.status === 'error'"
          class="icon-btn"
          aria-label="Réessayer"
          title="Réessayer"
          @click="$emit('regenerate')"
        >
          <AppIcon name="refresh" :size="14" />
        </button>

        <button
          class="icon-btn"
          aria-label="Supprimer"
          title="Supprimer"
          @click="$emit('delete')"
        >
          <AppIcon name="trash" :size="14" />
        </button>

        <span v-if="message.meta?.tokens" class="message__tokens">
          ~{{ message.meta.tokens }} tokens
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useMarkdown } from '@/composables/useMarkdown'
import { useSpeech } from '@/composables/useSpeech'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps({
  message: { type: Object, required: true }
})

defineEmits(['regenerate', 'delete'])

const { render } = useMarkdown()
const settingsStore = useSettingsStore()
const { isSpeaking, toggleSpeak } = useSpeech()

const copied = ref(false)

const role = computed(() => props.message.role)

const avatarIcon = computed(() => {
  if (role.value === 'user') return 'user'
  if (role.value === 'assistant') return 'sparkles'
  return 'info'
})

const authorLabel = computed(() => {
  if (role.value === 'user') return 'Vous'
  if (role.value === 'assistant') return 'Assistant'
  return 'Système'
})

const renderedContent = computed(() => {
  return render(props.message.content || '')
})

const showActions = computed(() => {
  return props.message.status !== 'streaming' ||
         (props.message.status === 'streaming' && props.message.content)
})

const timeLabel = computed(() => {
  try {
    return new Date(props.message.createdAt).toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit'
    })
  } catch { return '' }
})

const fullTime = computed(() => {
  try {
    return new Date(props.message.createdAt).toLocaleString('fr-FR')
  } catch { return '' }
})

async function copyContent() {
  try {
    await navigator.clipboard.writeText(props.message.content || '')
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch (e) {
    console.warn('copy failed', e)
  }
}
</script>

<style scoped>
.message {
  display: flex;
  gap: 12px;
  padding: var(--space-4) 0;
  animation: fadeIn 250ms ease;
}

.message__avatar {
  flex-shrink: 0;
  width: 32px; height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: var(--brand-600);
}
.message__avatar--user { background: var(--accent-600); }
.message__avatar--assistant { background: var(--brand-600); }
.message__avatar--system { background: var(--text-muted); }

.message__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.message__author { font-weight: 500; color: var(--text-secondary); }

.message__bubble {
  background: var(--assistant-bubble);
  color: var(--assistant-bubble-text);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border-top-left-radius: 4px;
  border: 1px solid var(--border-color);
  position: relative;
  display: inline-block;
  max-width: 100%;
  word-wrap: break-word;
}

.message--user .message__bubble {
  background: var(--user-bubble);
  color: var(--user-bubble-text);
  border-top-left-radius: var(--radius-md);
  border-top-right-radius: 4px;
  border-color: transparent;
}

.message--user .message__content {
  align-items: flex-end;
}

.message--user .message__meta {
  flex-direction: row-reverse;
}

.message__bubble .markdown-body :deep(pre) {
  background: var(--code-bg);
  border: 1px solid var(--code-border);
}

/* Sur fond coloré (utilisateur), le code reste lisible */
.message--user .message__bubble :deep(code:not(pre code)) {
  background: rgba(255,255,255,0.18);
  color: #fff;
  border-color: rgba(255,255,255,0.2);
}
.message--user .message__bubble :deep(pre) {
  background: rgba(0,0,0,0.18);
  border-color: rgba(255,255,255,0.15);
}
.message--user .message__bubble :deep(pre code) { color: #fff; }
.message--user .message__bubble :deep(a) { color: #fff; text-decoration: underline; }
.message--user .message__bubble :deep(blockquote) {
  border-left-color: rgba(255,255,255,0.6);
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.9);
}

.message__cursor {
  display: inline-block;
  margin-left: 2px;
  animation: pulse 1s infinite;
  color: var(--text-muted);
}
.message--user .message__cursor { color: rgba(255,255,255,0.8); }

.message__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 2px;
  opacity: 0;
  transition: opacity var(--transition);
}
.message:hover .message__actions { opacity: 1; }
.message:focus-within .message__actions { opacity: 1; }

.message__tokens {
  margin-left: auto;
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.message[data-status="error"] .message__bubble {
  border-color: var(--danger);
  background: rgba(239, 68, 68, 0.06);
}

.message[data-status="aborted"] .message__bubble {
  opacity: 0.7;
  font-style: italic;
}

/* Mobile */
@media (max-width: 640px) {
  .message { padding: var(--space-3) 0; gap: 8px; }
  .message__avatar { width: 28px; height: 28px; }
  .message__actions { opacity: 1; } /* Toujours visible sur mobile */
}
</style>
