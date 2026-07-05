<template>
  <label class="field" :class="{ 'field--error': hasError }">
    <span v-if="label" class="field__label">{{ label }}
      <span v-if="required" class="field__required" aria-hidden="true">*</span>
    </span>

    <div class="field__control">
      <AppIcon v-if="icon" :name="icon" :size="16" class="field__icon" />

      <input
        v-if="type !== 'textarea'"
        :type="actualType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :autocomplete="autocomplete"
        :aria-invalid="hasError"
        v-bind="$attrs"
        @input="onInput"
        @blur="onBlur"
      />

      <textarea
        v-else
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :rows="rows"
        v-bind="$attrs"
        @input="onInput"
        @blur="onBlur"
      />

      <button
        v-if="type === 'password' && showToggle"
        type="button"
        class="field__suffix-btn"
        :aria-label="showPassword ? 'Masquer' : 'Afficher'"
        @click="showPassword = !showPassword"
      >
        <AppIcon :name="showPassword ? 'eyeOff' : 'eye'" :size="16" />
      </button>

      <button
        v-if="$slots.suffix"
        type="button"
        class="field__suffix-btn"
        @click="$emit('suffix-click')"
      >
        <slot name="suffix" />
      </button>
    </div>

    <span v-if="hint && !hasError" class="field__hint">{{ hint }}</span>
    <span v-if="hasError" class="field__error" role="alert">{{ error }}</span>
  </label>
</template>

<script setup>
import { ref, computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  autocomplete: { type: String, default: 'off' },
  icon: { type: String, default: '' },
  rows: { type: Number, default: 4 },
  showToggle: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue', 'blur', 'suffix-click'])

const showPassword = ref(false)

const actualType = computed(() => {
  if (props.type === 'password') return showPassword.value ? 'text' : 'password'
  return props.type
})

const hasError = computed(() => !!props.error)

function onInput(e) {
  emit('update:modelValue', e.target.value)
}
function onBlur(e) {
  emit('blur', e.target.value)
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

.field__required { color: var(--danger); margin-left: 2px; }

.field__control {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: border-color var(--transition), box-shadow var(--transition);
}

.field__control:focus-within {
  border-color: var(--brand-500);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}

.field--error .field__control {
  border-color: var(--danger);
}
.field--error .field__control:focus-within {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}

.field__icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
  pointer-events: none;
}

.field input,
.field textarea {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  padding: 10px 12px;
  color: var(--text-primary);
  font-size: var(--fs-sm);
  font-family: inherit;
  resize: vertical;
}

.field__icon ~ input { padding-left: 38px; }

.field input::placeholder,
.field textarea::placeholder {
  color: var(--text-muted);
}

.field input:disabled,
.field textarea:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.field__suffix-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  margin-right: 4px;
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  transition: background var(--transition), color var(--transition);
}
.field__suffix-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.field__hint {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.field__error {
  font-size: var(--fs-xs);
  color: var(--danger);
}
</style>
