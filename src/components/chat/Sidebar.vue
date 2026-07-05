<template>
  <aside class="sidebar" :class="{ 'sidebar--open': isOpen }" aria-label="Liste des conversations">
    <div class="sidebar__header">
      <BaseButton variant="primary" block icon="plus" @click="newConversation">
        Nouvelle conversation
      </BaseButton>
    </div>

    <div class="sidebar__search">
      <BaseInput
        :model-value="searchQuery"
        placeholder="Rechercher…"
        icon="search"
        @update:model-value="conversationsStore.setSearch"
      />
    </div>

    <div class="sidebar__list" ref="listRef">
      <div v-if="conversationsStore.loading" class="sidebar__empty">
        <span class="spinner"></span>
        <span>Chargement…</span>
      </div>

      <div v-else-if="displayedConversations.length === 0" class="sidebar__empty">
        <AppIcon name="chat" :size="28" />
        <p>{{ showArchived ? 'Aucune conversation archivée' : 'Aucune conversation' }}</p>
        <span class="text-muted text-sm">Cliquez sur « Nouvelle conversation »</span>
      </div>

      <ul v-else>
        <li
          v-for="conv in displayedConversations"
          :key="conv.id"
        >
          <div
            class="conv-item"
            :class="{
              'conv-item--active': conv.id === activeId,
              'conv-item--archived': conv.archived
            }"
            :aria-current="conv.id === activeId ? 'true' : undefined"
            role="button"
            tabindex="0"
            @click="selectConversation(conv.id)"
            @keydown.enter="selectConversation(conv.id)"
            @keydown.space.prevent="selectConversation(conv.id)"
          >
            <div class="conv-item__icons">
              <button
                class="conv-item__pin"
                :class="{ 'conv-item__pin--active': conv.pinned }"
                :aria-label="conv.pinned ? 'Désépingler' : 'Épingler'"
                :title="conv.pinned ? 'Désépingler' : 'Épingler'"
                @click.stop="conversationsStore.togglePin(conv.id)"
              >
                <AppIcon name="pin" :size="14" />
              </button>
            </div>

            <div class="conv-item__main">
              <div class="conv-item__title">
                <AppIcon
                  v-if="conv.favorite"
                  name="star"
                  :size="12"
                  class="conv-item__star"
                />
                <span>{{ conv.title }}</span>
                <span v-if="conv.archived" class="badge badge--ghost" style="margin-left: 4px;">archivée</span>
              </div>
              <div class="conv-item__meta">
                <span class="badge badge--brand">{{ modeLabel(conv.mode) }}</span>
                <span>{{ formatDate(conv.updatedAt) }}</span>
                <span>· {{ conv.messageCount || 0 }} msg</span>
              </div>
              <div v-if="conv.lastMessagePreview" class="conv-item__preview">
                {{ conv.lastMessagePreview }}
              </div>
            </div>

            <div class="conv-item__actions">
              <button
                v-if="conv.archived"
                class="icon-btn"
                aria-label="Restaurer"
                title="Restaurer"
                @click.stop="conversationsStore.restoreConversation(conv.id)"
              >
                <AppIcon name="undo" :size="14" />
              </button>

              <button
                class="icon-btn"
                aria-label="Favori"
                :title="conv.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
                @click.stop="conversationsStore.toggleFavorite(conv.id)"
              >
                <AppIcon name="star" :size="14" />
              </button>

              <button
                class="icon-btn"
                aria-label="Renommer"
                title="Renommer"
                @click.stop="startRename(conv)"
              >
                <AppIcon name="edit" :size="14" />
              </button>

              <button
                class="icon-btn"
                aria-label="Supprimer"
                title="Supprimer"
                @click.stop="askDelete(conv)"
              >
                <AppIcon name="trash" :size="14" />
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <div class="sidebar__footer">
      <button
        class="sidebar__nav-link"
        :class="{ 'sidebar__nav-link--active': showArchived }"
        @click="showArchived = !showArchived"
      >
        <AppIcon name="archive" :size="16" />
        <span>Archivées ({{ conversationsStore.archivedConversations.length }})</span>
      </button>
      <router-link to="/settings" class="sidebar__nav-link" :class="{ 'router-link-active': $route.name === 'settings' }">
        <AppIcon name="settings" :size="16" />
        <span>Paramètres</span>
      </router-link>
    </div>

    <!-- Modale de renommage -->
    <BaseModal v-model="renameOpen" title="Renommer la conversation" size="sm">
      <BaseInput
        ref="renameInputRef"
        v-model="renameValue"
        label="Nouveau titre"
        placeholder="Titre de la conversation"
        @keyup.enter="confirmRename"
      />
      <template #footer>
        <BaseButton variant="ghost" @click="renameOpen = false">Annuler</BaseButton>
        <BaseButton variant="primary" @click="confirmRename">Renommer</BaseButton>
      </template>
    </BaseModal>

    <!-- Modale de confirmation suppression -->
    <BaseModal v-model="deleteOpen" title="Supprimer la conversation ?" size="sm">
      <p>Êtes-vous sûr de vouloir supprimer <strong>{{ deleteTarget?.title }}</strong> ?</p>
      <p class="text-muted text-sm" style="margin-top: 8px;">
        Cette action est définitive. Tous les messages seront perdus.
      </p>
      <template #footer>
        <BaseButton variant="ghost" @click="deleteOpen = false">Annuler</BaseButton>
        <BaseButton variant="danger" @click="confirmDelete">Supprimer</BaseButton>
      </template>
    </BaseModal>
  </aside>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useConversationsStore } from '@/stores/conversations'
import { useSettingsStore } from '@/stores/settings'
import { PROFILE_LABELS, PROFILE_MODES } from '@/services/prompts'

defineProps({
  isOpen: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const router = useRouter()
const conversationsStore = useConversationsStore()
const settingsStore = useSettingsStore()

const activeId = computed(() => conversationsStore.activeId)
const filteredConversations = computed(() => conversationsStore.filteredConversations)
const searchQuery = computed(() => conversationsStore.searchQuery)

const showArchived = ref(false)

const displayedConversations = computed(() => {
  if (showArchived.value) {
    return conversationsStore.archivedConversations
  }
  return filteredConversations.value
})

const renameOpen = ref(false)
const renameValue = ref('')
const renameTarget = ref(null)
const renameInputRef = ref(null)

const deleteOpen = ref(false)
const deleteTarget = ref(null)

function modeLabel(mode) {
  return PROFILE_LABELS[mode] || mode
}

function formatDate(iso) {
  try {
    const d = new Date(iso)
    const now = new Date()
    const diff = (now - d) / 1000
    if (diff < 60) return "à l'instant"
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
    if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  } catch { return '' }
}

async function newConversation() {
  const currentId = conversationsStore.activeId
  if (currentId) {
    await conversationsStore.archiveConversation(currentId)
  }
  await conversationsStore.createConversation({ mode: settingsStore.settings.mode })
  emit('close')
  router.push('/chat')
}

async function selectConversation(id) {
  await conversationsStore.setActive(id)
  emit('close')
  router.push('/chat')
}

function startRename(conv) {
  renameTarget.value = conv
  renameValue.value = conv.title
  renameOpen.value = true
  nextTick(() => renameInputRef.value?.$el?.querySelector('input')?.focus())
}

async function confirmRename() {
  if (renameTarget.value) {
    await conversationsStore.renameConversation(renameTarget.value.id, renameValue.value)
  }
  renameOpen.value = false
}

function askDelete(conv) {
  deleteTarget.value = conv
  deleteOpen.value = true
}

async function confirmDelete() {
  if (deleteTarget.value) {
    await conversationsStore.removeConversation(deleteTarget.value.id)
  }
  deleteOpen.value = false
  deleteTarget.value = null
}
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-color);
  width: var(--sidebar-width);
  flex-shrink: 0;
}

.sidebar__header {
  padding: var(--space-3);
  border-bottom: 1px solid var(--border-color);
}

.sidebar__search {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border-color);
}

.sidebar__list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}

.sidebar__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: var(--space-8) var(--space-4);
  text-align: center;
  color: var(--text-muted);
}
.sidebar__empty p { font-weight: 500; color: var(--text-secondary); }

.conv-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition);
  position: relative;
}
.conv-item:hover { background: var(--bg-hover); }
.conv-item--active {
  background: var(--brand-50);
}
.conv-item--archived {
  opacity: 0.65;
}
.conv-item--archived:hover {
  opacity: 0.85;
}
[data-theme="dark"] .conv-item--active,
[data-theme="auto"] .conv-item--active {
  background: rgba(99,102,241,0.15);
}
.conv-item--active::before {
  content: '';
  position: absolute;
  left: 0; top: 50%;
  transform: translateY(-50%);
  width: 3px; height: 60%;
  background: var(--brand-600);
  border-radius: var(--radius-full);
}

.conv-item__icons {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.conv-item__pin {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px; height: 24px;
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  transition: color var(--transition);
}
.conv-item__pin--active { color: var(--brand-600); }
.conv-item:hover .conv-item__pin { color: var(--text-secondary); }
.conv-item__pin:hover { background: var(--bg-active); }

.conv-item__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.conv-item__title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conv-item__star { color: var(--warning); flex-shrink: 0; }

.conv-item__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--text-muted);
  flex-wrap: wrap;
}
.conv-item__meta .badge {
  font-size: 9px;
  padding: 1px 6px;
}

.conv-item__preview {
  font-size: 11px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-item__actions {
  display: flex;
  gap: 0;
  opacity: 0;
  transition: opacity var(--transition);
  flex-shrink: 0;
}
.conv-item:hover .conv-item__actions { opacity: 1; }
.conv-item__actions .icon-btn {
  width: 26px; height: 26px;
}

.sidebar__footer {
  padding: var(--space-2);
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sidebar__nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--fs-sm);
  text-decoration: none;
  transition: background var(--transition), color var(--transition);
  cursor: pointer;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
}
.sidebar__nav-link:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  text-decoration: none;
}
.sidebar__nav-link--active,
.sidebar__nav-link.router-link-active {
  background: var(--brand-50);
  color: var(--brand-700);
}
[data-theme="dark"] .sidebar__nav-link--active,
[data-theme="dark"] .sidebar__nav-link.router-link-active,
[data-theme="auto"] .sidebar__nav-link--active,
[data-theme="auto"] .sidebar__nav-link.router-link-active {
  background: rgba(99,102,241,0.15);
  color: var(--brand-300);
}

/* Mobile */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0; left: 0; bottom: 0;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform 220ms cubic-bezier(0.4,0,0.2,1);
    box-shadow: var(--shadow-lg);
  }
  .sidebar--open { transform: translateX(0); }
  .conv-item__actions { opacity: 1; }
}
</style>