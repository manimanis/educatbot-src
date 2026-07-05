<template>
  <label class="field">
    <span v-if="label" class="field__label">{{ label }}</span>

    <div class="select-wrap">
      <select
        :value="modelValue"
        :disabled="disabled"
        @change="onChange"
      >
        <option v-for="opt in options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <AppIcon name="chevronDown" :size="16" class="select-arrow" />
    </div>

    <span v-if="hint" class="field__hint">{{ hint }}</span>
  </label>
</template>

<script setup>
import AppIcon from './AppIcon.vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  options: { type: Array, default: () => [] } // [{ value, label }]
})

const emit = defineEmits(['update:modelValue'])

function onChange(e) {
  emit('update:modelValue', e.target.value)
}
</script>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.field__label {
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--text-primary);
}
.select-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.select-wrap select {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 10px 36px 10px 12px;
  color: var(--text-primary);
  font-size: var(--fs-sm);
  cursor: pointer;
  outline: none;
  transition: border-color var(--transition), box-shadow var(--transition);
}
.select-wrap select:focus {
  border-color: var(--brand-500);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}
.select-wrap select:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.select-arrow {
  position: absolute;
  right: 12px;
  color: var(--text-muted);
  pointer-events: none;
}
.field__hint {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}
</style>
