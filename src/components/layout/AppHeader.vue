<template>
  <header class="app-header">
    <button
      class="app-header__menu icon-btn"
      aria-label="Ouvrir le menu"
      @click="$emit('toggle-sidebar')"
    >
      <AppIcon name="menu" :size="20" />
    </button>

    <div class="app-header__brand">
      <div class="app-header__logo" aria-hidden="true">
        <AppIcon name="sparkles" :size="18" />
      </div>
      <div class="app-header__titles">
        <h1 class="app-header__title">ÉduChatBot</h1>
        <span v-if="currentModeLabel" class="app-header__mode">{{ currentModeLabel }}</span>
      </div>
    </div>

    <div class="app-header__spacer"></div>

    <!-- Sélecteur de mode rapide -->
    <div class="app-header__mode-select">
      <BaseSelect
        :model-value="settingsStore.settings.mode"
        :options="modeOptions"
        aria-label="Sélecteur de mode pédagogique"
        @update:model-value="settingsStore.setMode"
      />
    </div>

    <!-- Niveau -->
    <div class="app-header__niveau">
      <BaseSelect
        :model-value="settingsStore.settings.niveau"
        :options="niveauOptions"
        aria-label="Niveau de l'apprenant"
        @update:model-value="settingsStore.setNiveau"
      />
    </div>

    <!-- Toggle thème -->
    <button
      class="icon-btn app-header__theme"
      :aria-label="themeStore.isDark ? 'Passer en thème clair' : 'Passer en thème sombre'"
      :title="themeStore.isDark ? 'Thème clair' : 'Thème sombre'"
      @click="themeStore.toggle()"
    >
      <AppIcon :name="themeStore.isDark ? 'sun' : 'moon'" :size="18" />
    </button>

    <!-- Bouton chat -->
    <router-link to="/" class="app-header__link" :class="{ 'router-link-active': $route.name === 'chat' }" title="Chat">
      <AppIcon name="chat" :size="18" />
      <span class="app-header__link-label">Chat</span>
    </router-link>

    <!-- Bouton exercices -->
    <router-link to="/exercises" class="app-header__link" :class="{ 'router-link-active': $route.name === 'exercises' }" title="Exercices">
      <AppIcon name="exercise" :size="18" />
      <span class="app-header__link-label">Exercices</span>
    </router-link>

    <!-- Tableau de bord -->
    <router-link to="/dashboard" class="app-header__link" :class="{ 'router-link-active': $route.name === 'dashboard' }" title="Tableau de bord">
      <AppIcon name="dashboard" :size="18" />
      <span class="app-header__link-label">Stats</span>
    </router-link>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useSettingsStore } from '@/stores/settings'
import { useThemeStore } from '@/stores/theme'
import { PROFILE_LABELS, PROFILE_MODES } from '@/services/prompts'

defineEmits(['toggle-sidebar'])

const settingsStore = useSettingsStore()
const themeStore = useThemeStore()

const modeOptions = Object.entries(PROFILE_LABELS).map(([value, label]) => ({ value, label }))

const niveauOptions = [
  { value: 'débutant', label: 'Débutant' },
  { value: 'intermédiaire', label: 'Intermédiaire' },
  { value: 'avancé', label: 'Avancé' }
]

const currentModeLabel = computed(() => PROFILE_LABELS[settingsStore.settings.mode] || '')
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-3);
  height: var(--header-height);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.app-header__menu { display: none; }

.app-header__brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.app-header__logo {
  width: 32px; height: 32px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--brand-500), var(--accent-500));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.app-header__titles {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}
.app-header__title {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}
.app-header__mode {
  font-size: 10px;
  color: var(--brand-600);
  font-weight: 500;
}

.app-header__spacer { flex: 1; }

.app-header__mode-select { min-width: 140px; }
.app-header__niveau { min-width: 130px; }

.app-header__theme { flex-shrink: 0; }

.app-header__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: var(--fs-sm);
  transition: background var(--transition), color var(--transition);
  flex-shrink: 0;
}
.app-header__link:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  text-decoration: none;
}
.app-header__link.router-link-active {
  background: var(--brand-50);
  color: var(--brand-700);
}
[data-theme="dark"] .app-header__link.router-link-active,
[data-theme="auto"] .app-header__link.router-link-active {
  background: rgba(99,102,241,0.15);
  color: var(--brand-300);
}

@media (max-width: 1024px) {
  .app-header__mode-select { min-width: 110px; }
  .app-header__niveau { display: none; }
  .app-header__link-label { display: none; }
}

@media (max-width: 768px) {
  .app-header__menu { display: inline-flex; }
  .app-header__mode { display: none; }
  .app-header__mode-select { min-width: 100px; }
  .app-header__brand { gap: 6px; }
  .app-header__link { padding: 6px 8px; }
}
</style>
