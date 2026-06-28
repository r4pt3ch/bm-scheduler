<template>
  <nav style="background:#0a0a0a; border-bottom: 1px solid #1f1f1f;" class="sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 items-center justify-between">
        <!-- Logo -->
        <div class="flex items-center gap-8">
          <NuxtLink to="/dashboard" class="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="BM Global Ventures Inc."
              class="h-10 w-auto object-contain"
              style="mix-blend-mode: screen; filter: drop-shadow(0 0 6px rgba(212,175,55,0.3));"
            />
          </NuxtLink>

          <!-- Desktop nav -->
          <div class="hidden md:flex items-center gap-1">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              :class="isActive(item.to)
                ? 'text-black font-semibold'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'"
              :style="isActive(item.to) ? 'background:linear-gradient(135deg,#D4AF37,#F5D87A); color:#000;' : ''"
            >
              {{ item.label }}
            </NuxtLink>
          </div>
        </div>

        <!-- User menu -->
        <div class="flex items-center gap-3">
          <div class="hidden sm:flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-black text-sm font-bold flex-shrink-0"
              style="background: linear-gradient(135deg, #D4AF37, #F5D87A);"
            >
              {{ user?.name?.charAt(0).toUpperCase() }}
            </div>
            <div class="hidden lg:block">
              <div class="text-sm font-medium text-white">{{ user?.name }}</div>
              <div class="text-xs text-gray-500 capitalize">{{ user?.role }}</div>
            </div>
          </div>

          <button @click="handleLogout" class="btn-nav">
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>

      <!-- Mobile nav -->
      <div class="md:hidden pb-3 flex gap-1 overflow-x-auto">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
          :class="isActive(item.to)
            ? 'text-black font-semibold'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'"
          :style="isActive(item.to) ? 'background:linear-gradient(135deg,#D4AF37,#F5D87A);' : ''"
        >
          {{ item.label }}
        </NuxtLink>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const { user, logout, isManager } = useAuth()
const { success } = useToast()

const navItems = computed(() => {
  const items = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/schedule', label: 'Schedule' },
    { to: '/time-off', label: 'Time Off' }
  ]
  if (isManager.value) {
    items.splice(2, 0, { to: '/employees', label: 'Employees' })
  }
  return items
})

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

async function handleLogout() {
  await logout()
  success('Logged out successfully')
}
</script>
