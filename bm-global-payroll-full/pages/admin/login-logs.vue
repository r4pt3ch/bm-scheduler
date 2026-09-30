<template>
  <div>
    <header class="mb-8">
      <p class="text-xs uppercase tracking-[0.18em] text-ink-400 font-semibold">Super Admin</p>
      <h1 class="font-display text-3xl text-ink-50 mt-1">Login Logs</h1>
      <p class="text-sm text-ink-400 mt-1">Every login attempt — successful and failed — with IP address and device.</p>
    </header>

    <UiCard class="mb-6">
      <div class="grid sm:grid-cols-4 gap-4">
        <UiSelect
          v-model="successFilter"
          label="Result"
          :options="[
            { value: '', label: 'All attempts' },
            { value: 'true', label: 'Successful only' },
            { value: 'false', label: 'Failed only' }
          ]"
        />
        <UiInput v-model="from" type="date" label="From" />
        <UiInput v-model="to" type="date" label="To" />
        <div class="flex items-end">
          <UiButton class="w-full" :loading="loading" @click="applyFilters">Filter</UiButton>
        </div>
      </div>
    </UiCard>

    <UiCard class="mb-6" v-if="!pending">
      <div class="flex justify-between text-sm">
        <span class="text-ink-300">Total failed login attempts (all time)</span>
        <span class="font-medium text-rose-300">{{ failedCount }}</span>
      </div>
    </UiCard>

    <UiCard :padded="false">
      <div v-if="pending" class="p-6 text-sm text-ink-400">Loading…</div>
      <div v-else-if="!logs.length" class="p-6 text-sm text-ink-400">No login attempts match these filters.</div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-sand-200">
            <th class="px-4 py-3">When</th>
            <th class="px-4 py-3">Account</th>
            <th class="px-4 py-3">Result</th>
            <th class="px-4 py-3">IP Address</th>
            <th class="px-4 py-3">Device</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-sand-200">
          <tr v-for="log in logs" :key="log._id">
            <td class="px-4 py-3 text-ink-300 whitespace-nowrap">{{ formatDate(log.createdAt) }}</td>
            <td class="px-4 py-3 text-ink-100 font-medium">
              {{ log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : log.emailAttempted }}
              <span class="text-xs text-ink-500 block">{{ log.emailAttempted }}</span>
            </td>
            <td class="px-4 py-3">
              <UiBadge :tone="log.success ? 'success' : 'danger'">{{ log.success ? 'Success' : log.failureReason || 'Failed' }}</UiBadge>
            </td>
            <td class="px-4 py-3 text-ink-400 font-mono text-xs">{{ log.ipAddress || '—' }}</td>
            <td class="px-4 py-3 text-ink-300">{{ log.device }} · {{ log.browser }} · {{ log.os }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="!pending && total > pageSize" class="flex items-center justify-between px-4 py-3 border-t border-sand-200">
        <p class="text-xs text-ink-400">
          Showing {{ rangeStart }}–{{ rangeEnd }} of {{ total }}
        </p>
        <div class="flex gap-2">
          <UiButton size="sm" variant="ghost" :disabled="page === 1" @click="goToPage(page - 1)">← Previous</UiButton>
          <span class="text-xs text-ink-400 self-center px-2">Page {{ page }} of {{ totalPages }}</span>
          <UiButton size="sm" variant="ghost" :disabled="page === totalPages" @click="goToPage(page + 1)">Next →</UiButton>
        </div>
      </div>
    </UiCard>
  </div>
</template>

<script setup>
import dayjs from 'dayjs'

definePageMeta({ layout: 'default' })

const from = ref('')
const to = ref('')
const successFilter = ref('')
const logs = ref([])
const failedCount = ref(0)
const loading = ref(false)
const pending = ref(true)

const page = ref(1)
const pageSize = 20
const total = ref(0)
const totalPages = ref(1)

const rangeStart = computed(() => (page.value - 1) * pageSize + 1)
const rangeEnd = computed(() => Math.min(page.value * pageSize, total.value))

async function loadLogs() {
  loading.value = true
  try {
    const query = { page: page.value, pageSize }
    if (successFilter.value) query.success = successFilter.value
    if (from.value) query.from = from.value
    if (to.value) query.to = to.value

    const res = await $fetch('/api/admin/login-logs', { query })
    logs.value = res.logs
    failedCount.value = res.failedCount
    total.value = res.total
    totalPages.value = res.totalPages
  } finally {
    loading.value = false
    pending.value = false
  }
}

function goToPage(newPage) {
  page.value = newPage
  loadLogs()
}

// Changing a filter resets back to page 1 — otherwise staying on a deep page
// of the unfiltered list while filtering down could land on an empty page.
function applyFilters() {
  page.value = 1
  loadLogs()
}

function formatDate(d) {
  return dayjs(d).format('MMM D, YYYY h:mm A')
}

await loadLogs()
</script>
