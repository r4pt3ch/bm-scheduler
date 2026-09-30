<template>
  <NuxtLink
    :to="to"
    class="focus-ring flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition"
    :class="isActive ? 'bg-brand-600 text-white' : 'text-ink-100 hover:bg-sand-200'"
  >
    <svg v-if="icon === 'home'" class="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V9.5z" />
    </svg>
    <svg v-else-if="icon === 'users'" class="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-1a4 4 0 00-4-4h-1m-5-5a3 3 0 100-6 3 3 0 000 6zm0 0a4 4 0 00-4 4v1h8v-1a4 4 0 00-4-4zm9-6a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
    <svg v-else-if="icon === 'clock'" class="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <svg v-else-if="icon === 'calendar'" class="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
    <svg v-else-if="icon === 'wallet'" class="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 7a2 2 0 012-2h12a2 2 0 012 2v1H3V7zm0 3h18v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7zm12 3.5h2.5" />
    </svg>
    <svg v-else-if="icon === 'chart'" class="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 19V5m6 14V9m6 10V13m6 6V7" />
    </svg>
    <svg v-else-if="icon === 'user'" class="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0" />
    </svg>
    <svg v-else-if="icon === 'shield'" class="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M9.5 12l2 2 3.5-4" />
    </svg>
    <svg v-else-if="icon === 'list'" class="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
    <svg v-else-if="icon === 'stopwatch'" class="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M10 2h4M12 2v3M12 22a8 8 0 100-16 8 8 0 000 16zM12 10v4l2.5 2.5" />
    </svg>
    <svg v-else-if="icon === 'gear'" class="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
    {{ label }}
  </NuxtLink>
</template>

<script setup>
const props = defineProps({
  to: { type: String, required: true },
  icon: { type: String, default: '' },
  label: { type: String, required: true }
})

const route = useRoute()
const isActive = computed(() => (props.to === '/' ? route.path === '/' : route.path.startsWith(props.to)))
</script>
