<template>
  <div class="min-h-screen bg-gray-50">
    <NavBar />
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Welcome header -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-gray-900">
          Good {{ timeOfDay }}, {{ user?.name?.split(' ')[0] }}!
        </h1>
        <p class="text-gray-500 mt-1">Here's what's happening today.</p>
      </div>

      <!-- Manager stats -->
      <div v-if="isManager" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="card p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">Total Employees</p>
              <p class="text-3xl font-bold text-gray-900 mt-1">{{ stats?.totalEmployees ?? '—' }}</p>
            </div>
            <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background:rgba(212,175,55,0.12);">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color:#D4AF37;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div class="card p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">Shifts Today</p>
              <p class="text-3xl font-bold text-gray-900 mt-1">{{ stats?.todayShifts ?? '—' }}</p>
            </div>
            <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background:rgba(212,175,55,0.12);">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color:#D4AF37;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div class="card p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">Shifts This Week</p>
              <p class="text-3xl font-bold text-gray-900 mt-1">{{ stats?.weekShifts ?? '—' }}</p>
            </div>
            <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background:rgba(212,175,55,0.12);">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color:#D4AF37;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div class="card p-5 cursor-pointer transition-colors" style="border-color:#e5e7eb;" @mouseenter="$event.currentTarget.style.borderColor='#D4AF37'" @mouseleave="$event.currentTarget.style.borderColor='#e5e7eb'" @click="navigateTo('/time-off')">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">Pending Requests</p>
              <p class="text-3xl font-bold mt-1" :style="(stats?.pendingRequests || 0) > 0 ? 'color:#D4AF37' : 'color:#111827'">
                {{ stats?.pendingRequests ?? '—' }}
              </p>
            </div>
            <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background:rgba(212,175,55,0.12);">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color:#D4AF37;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Employee stats -->
      <div v-else class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div class="card p-5">
          <p class="text-sm font-medium text-gray-500">Shifts Today</p>
          <p class="text-3xl font-bold text-gray-900 mt-1">{{ stats?.myTodayShifts ?? '—' }}</p>
        </div>
        <div class="card p-5">
          <p class="text-sm font-medium text-gray-500">Shifts This Week</p>
          <p class="text-3xl font-bold text-gray-900 mt-1">{{ stats?.myWeekShifts ?? '—' }}</p>
        </div>
        <div class="card p-5 cursor-pointer" @click="navigateTo('/time-off')">
          <p class="text-sm font-medium text-gray-500">Pending Requests</p>
          <p class="text-3xl font-bold text-amber-600 mt-1">{{ stats?.myPendingRequests ?? '—' }}</p>
        </div>
      </div>

      <!-- Upcoming shifts -->
      <div class="card">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ isManager ? "Today's Shifts" : 'Upcoming Shifts' }}
          </h2>
          <NuxtLink to="/schedule" class="text-sm font-semibold hover:underline" style="color:#D4AF37;">
            View schedule →
          </NuxtLink>
        </div>

        <div v-if="pending" class="p-8 text-center text-gray-400">
          <div class="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          Loading...
        </div>

        <div v-else-if="!stats?.upcomingShifts?.length" class="p-12 text-center">
          <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p class="text-gray-500 font-medium">No shifts scheduled</p>
          <p class="text-gray-400 text-sm mt-1">{{ isManager ? 'Add shifts in the schedule view' : "You're all clear!" }}</p>
        </div>

        <div v-else class="divide-y divide-gray-100">
          <div
            v-for="shift in stats.upcomingShifts"
            :key="shift._id"
            class="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              :style="{ backgroundColor: shift.employeeId?.color || '#3b82f6' }"
            >
              {{ (shift.employeeId?.name || 'U').charAt(0) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 truncate">{{ shift.employeeId?.name || 'Unknown' }}</p>
              <p class="text-sm text-gray-500">{{ shift.position || shift.employeeId?.position || 'No position' }}</p>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-sm font-medium text-gray-900">{{ shift.startTime }} – {{ shift.endTime }}</p>
              <p class="text-xs text-gray-400">{{ formatDate(shift.date) }}</p>
            </div>
            <div class="w-2 h-2 rounded-full flex-shrink-0"
              :class="shift.status === 'scheduled' ? 'bg-green-400' : shift.status === 'completed' ? 'bg-blue-400' : 'bg-gray-300'"
            />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { user, isManager } = useAuth()

const { data: stats, pending } = await useFetch('/api/dashboard/stats')

const timeOfDay = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
})

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>
