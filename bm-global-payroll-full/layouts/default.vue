<template>
  <div v-if="route.path === '/login'">
    <slot />
  </div>
  <div v-else class="flex min-h-screen bg-sand-50">
    <!-- Sidebar -->
    <aside class="hidden md:flex w-64 flex-col border-r border-sand-200 bg-sand-100">
      <div class="px-6 py-6 border-b border-sand-200 flex items-center gap-3">
        <img src="/images/logo.png" alt="BM Global Ventures Inc." class="w-10 h-10 shrink-0" />
        <div class="min-w-0">
          <p class="text-[10px] uppercase tracking-[0.14em] text-brand-400 font-semibold truncate">BM Global Ventures Inc.</p>
          <h1 class="font-display text-lg text-ink-100 leading-tight">Payroll &amp; HR</h1>
        </div>
      </div>

      <nav class="flex-1 px-3 py-4 space-y-1">
        <SidebarLink to="/" icon="home" label="Dashboard" />
        <SidebarLink v-if="auth.isAdmin" to="/employees" icon="users" label="Employees" />
        <SidebarLink to="/dtr" icon="stopwatch" label="Time Clock" />
        <SidebarLink to="/attendance" icon="clock" label="Attendance" />
        <SidebarLink to="/leaves" icon="calendar" label="Leaves" />
        <SidebarLink to="/payroll" icon="wallet" label="Payroll" />
        <SidebarLink v-if="auth.isAdmin" to="/reports" icon="chart" label="Reports" />
        <SidebarLink v-if="auth.isAdmin" to="/settings" icon="gear" label="Settings" />
        <SidebarLink v-if="auth.isSuperAdmin" to="/admin/audit-logs" icon="shield" label="Audit Trail" />
        <SidebarLink v-if="auth.isSuperAdmin" to="/admin/login-logs" icon="list" label="Login Logs" />
        <SidebarLink to="/profile" icon="user" label="My Profile" />
      </nav>

      <div class="px-4 py-4 border-t border-sand-200">
        <div class="flex items-center gap-3 px-2 py-2">
          <div class="h-9 w-9 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-semibold">
            {{ initials }}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-ink-100 truncate">{{ auth.user?.name }}</p>
            <p class="text-xs text-ink-400">{{ roleLabel }}</p>
          </div>
        </div>
        <button
          class="focus-ring mt-2 w-full text-left text-sm text-ink-400 hover:text-ink-100 px-2 py-1.5 rounded-md hover:bg-sand-200 transition"
          @click="auth.logout()"
        >
          Sign out
        </button>
      </div>
    </aside>

    <!-- Mobile top bar -->
    <div class="md:hidden fixed top-0 inset-x-0 z-20 bg-sand-100 border-b border-sand-200 px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <img src="/images/logo.png" alt="BM Global Ventures Inc." class="w-8 h-8 shrink-0" />
        <h1 class="font-display text-base text-ink-100">Payroll &amp; HR</h1>
      </div>
      <button class="focus-ring p-2 rounded-md hover:bg-sand-100" @click="mobileNavOpen = !mobileNavOpen">
        <svg class="w-6 h-6 text-ink-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>

    <div
      v-if="mobileNavOpen"
      class="md:hidden fixed inset-0 z-30 bg-black/60"
      @click="mobileNavOpen = false"
    >
      <nav class="bg-sand-100 w-64 h-full p-4 space-y-1" @click.stop>
        <SidebarLink to="/" icon="home" label="Dashboard" @click="mobileNavOpen = false" />
        <SidebarLink v-if="auth.isAdmin" to="/employees" icon="users" label="Employees" @click="mobileNavOpen = false" />
        <SidebarLink to="/dtr" icon="stopwatch" label="Time Clock" @click="mobileNavOpen = false" />
        <SidebarLink to="/attendance" icon="clock" label="Attendance" @click="mobileNavOpen = false" />
        <SidebarLink to="/leaves" icon="calendar" label="Leaves" @click="mobileNavOpen = false" />
        <SidebarLink to="/payroll" icon="wallet" label="Payroll" @click="mobileNavOpen = false" />
        <SidebarLink v-if="auth.isAdmin" to="/reports" icon="chart" label="Reports" @click="mobileNavOpen = false" />
        <SidebarLink v-if="auth.isAdmin" to="/settings" icon="gear" label="Settings" @click="mobileNavOpen = false" />
        <SidebarLink v-if="auth.isSuperAdmin" to="/admin/audit-logs" icon="shield" label="Audit Trail" @click="mobileNavOpen = false" />
        <SidebarLink v-if="auth.isSuperAdmin" to="/admin/login-logs" icon="list" label="Login Logs" @click="mobileNavOpen = false" />
        <SidebarLink to="/profile" icon="user" label="My Profile" @click="mobileNavOpen = false" />
        <button class="focus-ring mt-2 w-full text-left text-sm text-ink-400 px-3 py-2 rounded-md hover:bg-sand-200" @click="auth.logout()">
          Sign out
        </button>
      </nav>
    </div>

    <!-- Main content -->
    <main class="flex-1 min-w-0 pt-16 md:pt-0">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup>
const auth = useAuthStore()
const route = useRoute()
const mobileNavOpen = ref(false)

if (!auth.initialized) {
  await auth.fetchMe()
}

const initials = computed(() => {
  const name = auth.user?.name || ''
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

const roleLabel = computed(() => {
  const labels = { super_admin: 'Super Admin', admin: 'Admin', employee: 'Employee' }
  return labels[auth.user?.role] || auth.user?.role || ''
})
</script>
