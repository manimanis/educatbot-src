<template>
  <div class="app" :class="{ 'app--reduce-animations': reduceAnimations }">
    <AppHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" />

    <div class="app__body">
      <Sidebar :is-open="sidebarOpen" @close="sidebarOpen = false" />

      <div class="app__overlay" v-if="sidebarOpen" @click="sidebarOpen = false"></div>

      <main class="app__main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- Conteneur des toasts -->
    <div class="app__toasts" aria-live="polite">
      <BaseToast
        v-for="t in toasts"
        :key="t.id"
        :message="t.message"
        :type="t.type"
        :duration="t.duration"
        @close="removeToast(t.id)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import Sidebar from '@/components/chat/Sidebar.vue'
import BaseToast from '@/components/ui/BaseToast.vue'
import { useThemeStore } from '@/stores/theme'
import { useSettingsStore } from '@/stores/settings'
import { useConversationsStore } from '@/stores/conversations'
import { useStatsStore } from '@/stores/stats'
import { nanoid } from 'nanoid'

const themeStore = useThemeStore()
const settingsStore = useSettingsStore()
const conversationsStore = useConversationsStore()
const statsStore = useStatsStore()

const sidebarOpen = ref(false)
const toasts = ref([])

const reduceAnimations = computed(() => settingsStore.settings.reduceAnimations)

// Système de toasts global (exposé sur window pour usage simple)
function pushToast(message, type = 'info', duration = 3500) {
  const t = { id: nanoid(6), message, type, duration }
  toasts.value.push(t)
  // Auto-nettoyage (la transition laisse le temps)
  setTimeout(() => removeToast(t.id), duration + 500)
}
function removeToast(id) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

// Raccourcis clavier globaux
function onKeydown(e) {
  // Ctrl/Cmd + K : focus sur la recherche (ouvre la sidebar)
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    sidebarOpen.value = true
  }
  // Ctrl/Cmd + B : bascule sidebar
  if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
    e.preventDefault()
    sidebarOpen.value = !sidebarOpen.value
  }
  // Ctrl/Cmd + Shift + N : nouvelle conversation
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
    e.preventDefault()
    conversationsStore.createConversation({ mode: settingsStore.settings.mode })
  }
  // Échap : fermer la sidebar
  if (e.key === 'Escape' && sidebarOpen.value) {
    sidebarOpen.value = false
  }
}

let sessionFlushInterval

onMounted(async () => {
  themeStore.init()
  settingsStore.hydrate()
  await conversationsStore.hydrate()

  // Mesure du temps de session toutes les minutes
  sessionFlushInterval = setInterval(() => statsStore.flushSessionTime(), 60_000)

  // Expose les toasts globalement
  window.__echabot_toast = pushToast

  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (sessionFlushInterval) clearInterval(sessionFlushInterval)
  window.removeEventListener('keydown', onKeydown)
  statsStore.flushSessionTime()
})
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh; /* mobile */
  overflow: hidden;
}

.app__body {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.app__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-app);
  min-width: 0;
}

.app__overlay {
  display: none;
}

.app__toasts {
  position: fixed;
  top: calc(var(--header-height) + 12px);
  right: 16px;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
.app__toasts > * { pointer-events: auto; }

.app--reduce-animations *,
.app--reduce-animations *::before,
.app--reduce-animations *::after {
  animation-duration: 0.001ms !important;
  transition-duration: 0.001ms !important;
}

@media (max-width: 768px) {
  .app__overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: var(--overlay);
    z-index: 150;
  }
  .app__toasts { right: 8px; left: 8px; align-items: stretch; }
}
</style>
