<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="focus-ring inline-flex items-center justify-center gap-2 rounded-lg font-medium transition"
    :class="[sizeClasses, variantClasses, (disabled || loading) && 'opacity-50 pointer-events-none']"
  >
    <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    <slot v-else />
  </NuxtLink>
  <button
    v-else
    :type="type"
    :disabled="disabled || loading"
    class="focus-ring inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
    :class="[sizeClasses, variantClasses]"
  >
    <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    <slot v-else />
  </button>
</template>

<script setup>
const props = defineProps({
  to: { type: String, default: null },
  type: { type: String, default: 'button' },
  variant: { type: String, default: 'primary' }, // primary | secondary | ghost | danger
  size: { type: String, default: 'md' }, // sm | md
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false }
})

const sizeClasses = computed(() =>
  props.size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm'
)

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'secondary':
      return 'bg-sand-100 text-ink-100 border border-sand-200 hover:bg-sand-200'
    case 'ghost':
      return 'bg-transparent text-ink-100 hover:bg-sand-200'
    case 'danger':
      return 'bg-rose-600 text-white hover:bg-rose-700'
    default:
      return 'bg-brand-600 text-white hover:bg-brand-700'
  }
})
</script>
