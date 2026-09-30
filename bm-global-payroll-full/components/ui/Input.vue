<template>
  <div>
    <label v-if="label" class="block text-sm font-medium text-ink-100 mb-1.5">{{ label }}</label>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :min="min"
      :max="max"
      :step="step"
      :maxlength="maxlength"
      :inputmode="inputmode"
      :autocomplete="autocomplete"
      class="focus-ring w-full rounded-lg border border-sand-200 bg-sand-100 px-3.5 py-2.5 text-sm text-ink-50 placeholder:text-ink-500/60 focus:border-brand-400"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <p v-if="hint" class="mt-1 text-xs text-ink-400">{{ hint }}</p>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  required: { type: Boolean, default: false },
  hint: { type: String, default: '' },
  min: { type: [String, Number], default: undefined },
  max: { type: [String, Number], default: undefined },
  step: { type: [String, Number], default: undefined },
  maxlength: { type: [String, Number], default: undefined },
  inputmode: { type: String, default: undefined },
  autocomplete: { type: String, default: undefined }
})
defineEmits(['update:modelValue'])
</script>
