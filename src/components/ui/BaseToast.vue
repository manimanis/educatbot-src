<template>
  <Transition name="toast">
    <div v-if="visible" class="toast" :class="`toast--${type}`" role="alert" aria-live="polite">
      <AppIcon :name="iconName" :size="18" class="toast__icon" />
      <span class="toast__message">{{ message }}</span>
      <button v-if="closable" class="toast__close" aria-label="Fermer" @click="close">
        <AppIcon name="x" :size="14" />
      </button>
    </div>
  </Transition>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  message: { type: String, default: '' },
  type: { type: String, default: 'info' }, // info | success | warning | error
  duration: { type: Number, default: 3500 },
  closable: { type: Boolean, default: true }
})

const emit = defineEmits(['close'])
const visible = ref(true)
let timer = null

const iconName = computed(() => {
  switch (props.type) {
    case 'success': return 'check'
    case 'warning': return 'alert'
    case 'error': return 'alert'
    default: return 'info'
  }
})

function close() {
  visible.value = false
  setTimeout(() => emit('close'), 200)
}

onMounted(() => {
  if (props.duration > 0) {
    timer = setTimeout(close, props.duration)
  }
})

watch(() => props.message, () => {
  visible.value = true
  if (timer) clearTimeout(timer)
  if (props.duration > 0) {
    timer = setTimeout(close, props.duration)
  }
})
</script>

<style scoped>
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  max-width: 360px;
  font-size: var(--fs-sm);
  color: var(--text-primary);
}
.toast__icon { flex-shrink: 0; }
.toast--success .toast__icon { color: var(--success); }
.toast--warning .toast__icon { color: var(--warning); }
.toast--error   .toast__icon { color: var(--danger);  }
.toast--info    .toast__icon { color: var(--info);    }

.toast__message { flex: 1; }
.toast__close {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px; height: 22px;
  color: var(--text-muted);
  border-radius: var(--radius-sm);
}
.toast__close:hover { background: var(--bg-hover); color: var(--text-primary); }

.toast-enter-active, .toast-leave-active {
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
}
.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
