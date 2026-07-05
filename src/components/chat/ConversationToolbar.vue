<template>
  <div class="conv-toolbar">
    <div class="conv-toolbar__info">
      <h2 class="conv-toolbar__title">{{ title }}</h2>
      <span v-if="subtitle" class="conv-toolbar__subtitle">{{ subtitle }}</span>
    </div>

    <div class="conv-toolbar__actions">
      <!-- Export -->
      <div class="dropdown" :class="{ 'dropdown--open': exportOpen }">
        <button
          class="icon-btn"
          aria-label="Exporter"
          title="Exporter"
          @click="exportOpen = !exportOpen; renameOpen = false"
        >
          <AppIcon name="download" :size="16" />
        </button>
        <div v-if="exportOpen" class="dropdown__menu" role="menu">
          <button @click="exportAs('json')" role="menuitem">
            <AppIcon name="database" :size="14" /> JSON
          </button>
          <button @click="exportAs('markdown')" role="menuitem">
            <AppIcon name="list" :size="14" /> Markdown
          </button>
          <button @click="exportAs('txt')" role="menuitem">
            <AppIcon name="list" :size="14" /> Texte (.txt)
          </button>
          <button @click="exportAs('pdf')" role="menuitem">
            <AppIcon name="download" :size="14" /> PDF (impression)
          </button>
        </div>
      </div>

      <!-- Import -->
      <button
        class="icon-btn"
        aria-label="Importer"
        title="Importer une conversation"
        @click="$refs.fileInput.click()"
      >
        <AppIcon name="upload" :size="16" />
      </button>

      <!-- Renommer -->
      <button
        class="icon-btn"
        aria-label="Renommer"
        title="Renommer"
        @click="startRename"
      >
        <AppIcon name="edit" :size="16" />
      </button>

      <!-- Nouvelle conv -->
      <button
        class="icon-btn"
        aria-label="Nouvelle conversation"
        title="Nouvelle conversation"
        @click="$emit('new')"
      >
        <AppIcon name="plus" :size="16" />
      </button>
    </div>

    <!-- Modale renommer -->
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

    <input
      ref="fileInput"
      type="file"
      accept="application/json"
      style="display: none"
      @change="onImport"
    />
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useConversationsStore } from '@/stores/conversations'

const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' }
})

const emit = defineEmits(['new'])

const conversationsStore = useConversationsStore()

const exportOpen = ref(false)
const renameOpen = ref(false)
const renameValue = ref('')
const renameInputRef = ref(null)
const fileInput = ref(null)

async function exportAs(format) {
  exportOpen.value = false
  if (!conversationsStore.activeId) return
  try {
    const content = await conversationsStore.exportConversation(conversationsStore.activeId, format)

    if (format === 'pdf') {
      // Pour le PDF : on ouvre une fenêtre d'impression
      printConversation(props.title, content)
      return
    }

    const ext = format === 'markdown' ? 'md' : format
    const mime = format === 'json' ? 'application/json' : 'text/plain'
    const blob = new Blob([content], { type: `${mime};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sanitizeFilename(props.title)}.${ext}`
    a.click()
    URL.revokeObjectURL(url)

    if (window.__echabot_toast) window.__echabot_toast('Export réussi.', 'success')
  } catch (e) {
    console.error(e)
    if (window.__echabot_toast) window.__echabot_toast('Échec de l\'export.', 'error')
  }
}

function printConversation(title, text) {
  const win = window.open('', '_blank')
  if (!win) {
    if (window.__echabot_toast) window.__echabot_toast('Autorisez les pop-ups pour exporter en PDF.', 'warning')
    return
  }
  // Conversion simple Markdown → HTML (basique)
  const html = basicMarkdownToHtml(text)
  win.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(title)}</title>
      <style>
        body { font-family: -apple-system, system-ui, sans-serif; line-height: 1.6; padding: 32px; color: #1a1d21; max-width: 720px; margin: 0 auto; }
        h1, h2, h3 { color: #4f46e5; }
        pre { background: #f5f7fa; padding: 12px; border-radius: 6px; overflow-x: auto; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 13px; }
        code { background: #f5f7fa; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
        blockquote { border-left: 3px solid #a5b4fc; padding-left: 12px; color: #555; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `)
  win.document.close()
  setTimeout(() => {
    win.focus()
    win.print()
  }, 400)
}

function basicMarkdownToHtml(md) {
  // Convertit le markdown basique en HTML pour impression PDF
  // (les blocks ```sql sont conservés en pre/code)
  let html = escapeHtml(md)
  // Blocs de code
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code>${code}</code></pre>`)
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  // Titres
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  // Gras / italique
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
  // Listes
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
  // Paragraphes
  html = html.split(/\n\n+/).map(p => {
    if (p.startsWith('<')) return p
    return `<p>${p.replace(/\n/g, '<br>')}</p>`
  }).join('\n')
  return html
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function sanitizeFilename(name) {
  return (name || 'conversation')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50) || 'conversation'
}

async function startRename() {
  renameValue.value = props.title
  renameOpen.value = true
  await nextTick()
  renameInputRef.value?.$el?.querySelector('input')?.focus()
}

async function confirmRename() {
  if (conversationsStore.activeId) {
    await conversationsStore.renameConversation(conversationsStore.activeId, renameValue.value)
  }
  renameOpen.value = false
}

async function onImport(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => {
    const conv = await conversationsStore.importConversation(reader.result)
    if (conv) {
      if (window.__echabot_toast) window.__echabot_toast('Conversation importée.', 'success')
      await conversationsStore.setActive(conv.id)
    } else {
      if (window.__echabot_toast) window.__echabot_toast('Échec de l\'import.', 'error')
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}

// Ferme le dropdown si clic en dehors
if (typeof window !== 'undefined') {
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) exportOpen.value = false
  })
}
</script>

<style scoped>
.conv-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-4);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  gap: 12px;
  flex-shrink: 0;
}

.conv-toolbar__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.conv-toolbar__title {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.conv-toolbar__subtitle {
  font-size: 10px;
  color: var(--text-muted);
}

.conv-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.dropdown { position: relative; }
.dropdown__menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 180px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 4px;
  z-index: 50;
  animation: fadeIn 150ms ease;
}
.dropdown__menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  text-align: left;
}
.dropdown__menu button:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

@media (max-width: 640px) {
  .conv-toolbar { padding: var(--space-2) var(--space-3); }
  .conv-toolbar__subtitle { display: none; }
}
</style>
