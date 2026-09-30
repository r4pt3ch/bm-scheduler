<template>
  <div class="bg-sand-100 rounded-xl" :class="[padded ? 'p-5 sm:p-6' : '', borderClass]">
    <slot />
  </div>
</template>

<script setup>
defineProps({
  padded: { type: Boolean, default: true },
  borderClass: { type: String, default: 'border border-sand-200' }
})
</script>
