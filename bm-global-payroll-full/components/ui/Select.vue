<template>
  <div>
    <label v-if="label" class="block text-sm font-medium text-ink-100 mb-1.5">{{ label }}</label>
    <select
      :value="modelValue"
      class="focus-ring w-full rounded-lg border border-sand-200 bg-sand-100 px-3.5 py-2.5 text-sm text-ink-50 focus:border-brand-400"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  options: { type: Array, default: () => [] } // [{ value, label }]
})
defineEmits(['update:modelValue'])
</script>
