<template>
  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" :class="toneClasses">
    <slot />
  </span>
</template>

<script setup>
const props = defineProps({
  tone: { type: String, default: 'neutral' } // neutral | success | warning | danger | info
})

const toneClasses = computed(() => {
  switch (props.tone) {
    case 'success':
      return 'bg-emerald-400/15 text-emerald-300'
    case 'warning':
      return 'bg-amber-400/15 text-amber-300'
    case 'danger':
      return 'bg-rose-400/15 text-rose-300'
    case 'info':
      return 'bg-sky-400/15 text-sky-300'
    default:
      return 'bg-sand-200 text-ink-100'
  }
})
</script>
