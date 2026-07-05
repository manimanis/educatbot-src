<template>
  <label class="field">
    <span v-if="label" class="field__label">{{ label }}
      <span v-if="showValue" class="field__value">{{ modelValue }}</span>
    </span>

    <div class="slider-row">
      <input
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :value="modelValue"
        :disabled="disabled"
        class="slider"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuenow="modelValue"
        @input="onInput"
      />
      <span v-if="showValue" class="slider__badge">{{ formattedValue }}</span>
    </div>

    <span v-if="hint" class="field__hint">{{ hint }}</span>
  </label>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Number, required: true },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  showValue: { type: Boolean, default: true },
  format: { type: Function, default: null }
})

const emit = defineEmits(['update:modelValue'])

const formattedValue = computed(() => {
  if (props.format) return props.format(props.modelValue)
  return props.modelValue
})

function onInput(e) {
  emit('update:modelValue', Number(e.target.value))
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--text-primary);
}
.field__value { color: var(--text-muted); font-size: var(--fs-xs); }

.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  height: 6px;
  background: var(--bg-subtle);
  border-radius: var(--radius-full);
  outline: none;
  border: 1px solid var(--border-color);
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--brand-600);
  border: 2px solid #fff;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition);
}
.slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
.slider::-moz-range-thumb {
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--brand-600);
  border: 2px solid #fff;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}
.slider:disabled { opacity: 0.5; cursor: not-allowed; }

.slider__badge {
  min-width: 38px;
  text-align: center;
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--brand-600);
  background: var(--brand-50);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

[data-theme="dark"] .slider__badge,
[data-theme="auto"] .slider__badge {
  background: rgba(99,102,241,0.18);
  color: var(--brand-300);
}

.field__hint {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}
</style>
