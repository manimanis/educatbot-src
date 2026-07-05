<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="['btn', `btn--${variant}`, `btn--${size}`, { 'btn--block': block, 'btn--icon-only': iconOnly }]"
    :aria-label="ariaLabel"
    @click="handleClick"
  >
    <span v-if="loading" class="btn__spinner" aria-hidden="true"></span>
    <AppIcon v-else-if="icon" :name="icon" :size="iconSize" />
    <span v-if="!iconOnly" class="btn__label"><slot /></span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  variant: { type: String, default: 'primary' }, // primary | secondary | ghost | danger | outline
  size: { type: String, default: 'md' },         // sm | md | lg
  type: { type: String, default: 'button' },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  icon: { type: String, default: '' },
  iconOnly: { type: Boolean, default: false },
  ariaLabel: { type: String, default: '' }
})

const emit = defineEmits(['click'])

const iconSize = computed(() => {
  if (props.size === 'sm') return 14
  if (props.size === 'lg') return 20
  return 16
})

function handleClick(e) {
  if (props.disabled || props.loading) return
  emit('click', e)
}
</script>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  font-size: var(--fs-sm);
  border-radius: var(--radius-md);
  padding: 0 var(--space-4);
  height: 36px;
  transition: background var(--transition), color var(--transition),
              border-color var(--transition), transform var(--transition),
              box-shadow var(--transition);
  white-space: nowrap;
  user-select: none;
  border: 1px solid transparent;
}

.btn--sm { height: 28px; padding: 0 var(--space-3); font-size: var(--fs-xs); }
.btn--lg { height: 44px; padding: 0 var(--space-5); font-size: var(--fs-base); }

.btn--block { width: 100%; }

.btn--icon-only { padding: 0; width: 36px; }
.btn--icon-only.btn--sm { width: 28px; }
.btn--icon-only.btn--lg { width: 44px; }

/* Primary */
.btn--primary {
  background: var(--brand-600);
  color: #fff;
}
.btn--primary:hover:not(:disabled) {
  background: var(--brand-700);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
.btn--primary:active:not(:disabled) { transform: translateY(0); }

/* Secondary */
.btn--secondary {
  background: var(--bg-subtle);
  color: var(--text-primary);
  border-color: var(--border-color);
}
.btn--secondary:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--border-strong);
}

/* Ghost */
.btn--ghost { background: transparent; color: var(--text-secondary); }
.btn--ghost:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* Outline */
.btn--outline {
  background: transparent;
  color: var(--brand-600);
  border-color: var(--brand-400);
}
.btn--outline:hover:not(:disabled) {
  background: var(--brand-50);
  border-color: var(--brand-600);
}

/* Danger */
.btn--danger {
  background: var(--danger);
  color: #fff;
}
.btn--danger:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn:disabled, .btn[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.btn__spinner {
  width: 14px; height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}
</style>
