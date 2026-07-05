<template>
  <div class="chat-input">
    <div class="chat-input__suggestions" v-if="showSuggestions && suggestions.length && !hasMessages">
      <button
        v-for="(s, i) in suggestions"
        :key="i"
        class="suggestion-chip"
        @click="$emit('send', s)"
      >
        <AppIcon name="sparkles" :size="12" />
        <span>{{ s }}</span>
      </button>
    </div>

    <div class="chat-input__box" :class="{ 'chat-input__box--disabled': disabled }">
      <button
        v-if="supportedSTT"
        class="icon-btn chat-input__mic"
        :class="{ 'chat-input__mic--active': isListening }"
        :aria-label="isListening ? 'Arrêter la dictée' : 'Démarrer la dictée'"
        :title="isListening ? 'Arrêter' : 'Dictée vocale'"
        @click="toggleDictation"
      >
        <AppIcon :name="isListening ? 'stop' : 'mic'" :size="16" />
      </button>

      <textarea
        ref="textareaRef"
        v-model="text"
        :placeholder="placeholder"
        :disabled="disabled"
        rows="1"
        class="chat-input__textarea"
        :aria-label="placeholder"
        @keydown="onKeydown"
        @input="autoResize"
      />

      <div class="chat-input__counter" :class="{ 'chat-input__counter--warn': tokens > 800 }">
        ~{{ tokens }} tok
      </div>

      <button
        v-if="isStreaming"
        class="chat-input__send chat-input__send--stop"
        aria-label="Arrêter"
        title="Arrêter la génération"
        @click="$emit('cancel')"
      >
        <AppIcon name="stop" :size="16" />
      </button>

      <button
        v-else
        class="chat-input__send"
        :disabled="!canSend"
        aria-label="Envoyer"
        title="Envoyer (Entrée)"
        @click="submit"
      >
        <AppIcon name="send" :size="16" />
      </button>
    </div>

    <div class="chat-input__hint">
      <span v-if="settingsStore.settings.sendOnEnter">
        <kbd>Entrée</kbd> pour envoyer · <kbd>Shift</kbd>+<kbd>Entrée</kbd> pour un saut de ligne
      </span>
      <span v-else>
        <kbd>Ctrl</kbd>+<kbd>Entrée</kbd> pour envoyer
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useSettingsStore } from '@/stores/settings'
import { useSpeech } from '@/composables/useSpeech'
import { estimateTokens } from '@/services/aiService'
import { SUGGESTED_QUESTIONS } from '@/services/prompts'

const props = defineProps({
  disabled: { type: Boolean, default: false },
  isStreaming: { type: Boolean, default: false },
  hasMessages: { type: Boolean, default: false }
})

const emit = defineEmits(['send', 'cancel'])

const settingsStore = useSettingsStore()
const { supportedSTT, isListening, toggleListening, stopListening } = useSpeech()

const text = ref('')
const textareaRef = ref(null)
const interimText = ref('')

const suggestions = computed(() => {
  return SUGGESTED_QUESTIONS[settingsStore.settings.mode] || []
})

const showSuggestions = computed(() => settingsStore.settings.showSuggestions)

const placeholder = computed(() => {
  if (props.isStreaming) return 'Génération en cours...'
  switch (settingsStore.settings.mode) {
    case 'database': return 'Posez votre question sur les bases de données…'
    case 'french':   return 'Posez votre question sur le français…'
    case 'mixed':    return 'Posez votre question (SQL ou français)…'
    default:         return 'Écrivez votre message…'
  }
})

const tokens = computed(() => estimateTokens(text.value))

const canSend = computed(() =>
  text.value.trim().length > 0 && !props.disabled && !props.isStreaming
)

function submit() {
  if (!canSend.value) return
  emit('send', text.value.trim())
  text.value = ''
  nextTick(autoResize)
}

function onKeydown(e) {
  if (e.key === 'Enter') {
    if (settingsStore.settings.sendOnEnter && !e.shiftKey) {
      e.preventDefault()
      submit()
    } else if (!settingsStore.settings.sendOnEnter && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      submit()
    }
  }
}

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 200) + 'px'
}

watch(text, () => nextTick(autoResize))

function toggleDictation() {
  toggleListening({
    onResult: (transcript, { final }) => {
      // Remplace le texte en cours par la transcription
      if (final) {
        text.value = text.value.replace(interimText.value, '').trimEnd() + ' ' + transcript
        text.value = text.value.trim() + ' '
        interimText.value = ''
      } else {
        // interim : remplace l'ancien interim
        text.value = text.value.replace(interimText.value, '').trimEnd() + ' ' + transcript
        interimText.value = transcript
      }
      nextTick(autoResize)
    },
    onEnd: () => {
      interimText.value = ''
      nextTick(() => textareaRef.value?.focus())
    }
  })
}

onMounted(() => {
  nextTick(autoResize)
})

defineExpose({
  focus: () => textareaRef.value?.focus()
})
</script>

<style scoped>
.chat-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: var(--space-3) var(--space-4) var(--space-4);
  background: linear-gradient(to top, var(--bg-app) 70%, transparent);
}

.chat-input__suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
}
.suggestion-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-surface);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  font-size: var(--fs-xs);
  transition: all var(--transition);
}
.suggestion-chip:hover {
  background: var(--brand-50);
  color: var(--brand-700);
  border-color: var(--brand-300);
}
[data-theme="dark"] .suggestion-chip:hover,
[data-theme="auto"] .suggestion-chip:hover {
  background: rgba(99,102,241,0.15);
  color: var(--brand-300);
  border-color: rgba(99,102,241,0.4);
}

.chat-input__box {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 6px;
  transition: border-color var(--transition), box-shadow var(--transition);
}
.chat-input__box:focus-within {
  border-color: var(--brand-500);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.chat-input__box--disabled { opacity: 0.7; }

.chat-input__textarea {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  padding: 8px 6px;
  color: var(--text-primary);
  font-size: var(--fs-sm);
  font-family: inherit;
  line-height: 1.5;
  max-height: 200px;
  min-height: 24px;
}
.chat-input__textarea::placeholder { color: var(--text-muted); }
.chat-input__textarea:disabled { cursor: not-allowed; }

.chat-input__counter {
  font-size: 10px;
  color: var(--text-muted);
  padding: 4px 6px;
  align-self: flex-end;
  font-variant-numeric: tabular-nums;
}
.chat-input__counter--warn { color: var(--warning); }

.chat-input__mic {
  align-self: flex-end;
  width: 36px; height: 36px;
}
.chat-input__mic--active {
  color: var(--danger);
  background: rgba(239, 68, 68, 0.1);
  animation: pulse 1.2s infinite;
}

.chat-input__send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px; height: 36px;
  background: var(--brand-600);
  color: #fff;
  border-radius: var(--radius-md);
  transition: background var(--transition), transform var(--transition);
  flex-shrink: 0;
}
.chat-input__send:hover:not(:disabled) {
  background: var(--brand-700);
  transform: translateY(-1px);
}
.chat-input__send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: var(--text-muted);
}
.chat-input__send--stop {
  background: var(--danger);
}
.chat-input__send--stop:hover { background: #dc2626; }

.chat-input__hint {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
}

kbd {
  display: inline-block;
  padding: 1px 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-secondary);
}

@media (max-width: 640px) {
  .chat-input { padding: var(--space-2) var(--space-3) var(--space-3); }
  .chat-input__hint { display: none; }
  .chat-input__counter { display: none; }
}
</style>
