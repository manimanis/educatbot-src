<template>
  <label class="switch" :class="{ 'switch--disabled': disabled }">
    <span class="switch__row">
      <input
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        @change="onChange"
      />
      <span class="switch__slider"></span>
      <span v-if="label" class="switch__label">{{ label }}</span>
    </span>
    <span v-if="hint" class="switch__hint">{{ hint }}</span>
  </label>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

function onChange(e) {
  emit('update:modelValue', e.target.checked)
}
</script>

<style scoped>
.switch {
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  font-size: var(--fs-sm);
  color: var(--text-primary);
}
.switch--disabled { opacity: 0.5; cursor: not-allowed; }

.switch__row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.switch input { display: none; }

.switch__slider {
  position: relative;
  width: 38px;
  height: 22px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  transition: background var(--transition), border-color var(--transition);
}
.switch__slider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: var(--text-muted);
  border-radius: 50%;
  transition: transform var(--transition), background var(--transition);
}
.switch input:checked + .switch__slider {
  background: var(--brand-600);
  border-color: var(--brand-600);
}
.switch input:checked + .switch__slider::before {
  transform: translateX(16px);
  background: #fff;
}
.switch input:focus-visible + .switch__slider {
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
}

.switch__hint {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  margin-left: 50px;
}
</style>
