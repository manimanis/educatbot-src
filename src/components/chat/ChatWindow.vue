<template>
  <div class="chat-window" ref="containerRef">
    <!-- État vide -->
    <div v-if="!messages.length && !isStreaming" class="chat-window__empty">
      <div class="chat-window__empty-icon">
        <AppIcon name="sparkles" :size="40" />
      </div>
      <h2 class="chat-window__empty-title">Bienvenue sur ÉduChatBot</h2>
      <p class="chat-window__empty-text">
        Votre assistant pédagogique pour apprendre les
        <strong>bases de données (SQL)</strong> et le <strong>français</strong>.
      </p>

      <div class="chat-window__empty-cards">
        <div class="empty-card" :class="{ 'empty-card--active': settingsStore.settings.mode === 'database' }" @click="setMode('database')">
          <AppIcon name="database" :size="24" />
          <div>
            <strong>Bases de Données</strong>
            <span>SQL, modélisation, normalisation, optimisation</span>
          </div>
        </div>
        <div class="empty-card" :class="{ 'empty-card--active': settingsStore.settings.mode === 'french' }" @click="setMode('french')">
          <AppIcon name="book" :size="24" />
          <div>
            <strong>Français</strong>
            <span>Grammaire, conjugaison, orthographe, vocabulaire</span>
          </div>
        </div>
        <div class="empty-card" :class="{ 'empty-card--active': settingsStore.settings.mode === 'mixed' }" @click="setMode('mixed')">
          <AppIcon name="brain" :size="24" />
          <div>
            <strong>Mixte</strong>
            <span>SQL et français en alternance</span>
          </div>
        </div>
        <div class="empty-card" :class="{ 'empty-card--active': settingsStore.settings.mode === 'algorithm' }" @click="setMode('algorithm')">
          <AppIcon name="code" :size="24" />
          <div>
            <strong>Algorithmes</strong>
            <span>Logique, structures de données, complexité</span>
          </div>
        </div>
      </div>

      <div class="chat-window__empty-warning" v-if="!settingsStore.isConfigured">
        <AppIcon name="alert" :size="16" />
        <span>Configurez votre API IA dans les <router-link to="/settings">Paramètres</router-link> pour commencer.</span>
      </div>
    </div>

    <!-- Liste des messages -->
    <div v-else class="chat-window__messages">
      <MessageBubble
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
        @regenerate="$emit('regenerate')"
        @delete="deleteMessage(msg.id)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import MessageBubble from './MessageBubble.vue'
import { useConversationsStore } from '@/stores/conversations'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps({
  isStreaming: { type: Boolean, default: false }
})

defineEmits(['regenerate'])

const conversationsStore = useConversationsStore()
const settingsStore = useSettingsStore()

const messages = computed(() => conversationsStore.messages)
const containerRef = ref(null)

function setMode(mode) {
  settingsStore.setMode(mode)
}

async function deleteMessage(id) {
  if (confirm('Supprimer ce message ?')) {
    await conversationsStore.removeMessage(id)
  }
}

function scrollToBottom(force = false) {
  if (!settingsStore.settings.autoScroll && !force) return
  nextTick(() => {
    const el = containerRef.value
    if (el) {
      // Si l'utilisateur a scrollé vers le haut, ne pas forcer le scroll
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      if (force || distanceFromBottom < 150) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      }
    }
  })
}

watch(() => messages.length, () => scrollToBottom(true))
watch(() => messages[messages.length - 1]?.content, () => scrollToBottom(false))
onMounted(() => scrollToBottom(true))

defineExpose({ scrollToBottom })
</script>

<style scoped>
.chat-window {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding: var(--space-4) var(--space-4);
}

.chat-window__messages {
  max-width: var(--max-content);
  margin: 0 auto;
  padding: var(--space-2) 0 var(--space-6);
}

/* État vide */
.chat-window__empty {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-12) var(--space-4);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.chat-window__empty-icon {
  width: 80px; height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-500), var(--accent-500));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-3);
  box-shadow: var(--shadow-lg);
}

.chat-window__empty-title {
  font-size: var(--fs-2xl);
  font-weight: 600;
  color: var(--text-primary);
}

.chat-window__empty-text {
  color: var(--text-secondary);
  font-size: var(--fs-base);
  max-width: 480px;
  line-height: 1.6;
}
.chat-window__empty-text strong { color: var(--text-primary); }

.chat-window__empty-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  width: 100%;
  margin-top: var(--space-4);
}

@media (min-width: 768px) {
  .chat-window__empty-cards { grid-template-columns: repeat(4, 1fr); }
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: var(--space-4);
  background: var(--bg-surface);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition);
  text-align: center;
}
.empty-card:hover {
  border-color: var(--brand-400);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.empty-card--active {
  border-color: var(--brand-600);
  background: var(--brand-50);
}
.empty-card--active [data-theme="dark"],
[data-theme="dark"] .empty-card--active,
[data-theme="auto"] .empty-card--active {
  background: rgba(99,102,241,0.12);
}

.empty-card svg { color: var(--brand-600); }
.empty-card strong {
  font-size: var(--fs-sm);
  color: var(--text-primary);
  display: block;
}
.empty-card span {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  display: block;
  line-height: 1.4;
}

.chat-window__empty-warning {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: var(--warning);
  border-radius: var(--radius-md);
  font-size: var(--fs-sm);
  margin-top: var(--space-4);
}
.chat-window__empty-warning a { color: var(--warning); text-decoration: underline; }

@media (max-width: 640px) {
  .chat-window { padding: var(--space-3) var(--space-3); }
  .chat-window__empty { padding: var(--space-8) var(--space-2); }
}
</style>
