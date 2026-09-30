<template>
  <div>
    <header class="mb-8">
      <p class="text-xs uppercase tracking-[0.18em] text-ink-400 font-semibold">Super Admin</p>
      <h1 class="font-display text-3xl text-ink-50 mt-1">Audit Trail</h1>
      <p class="text-sm text-ink-400 mt-1">Every recorded write action across the system — who did what, and when.</p>
    </header>

    <UiCard class="mb-6">
      <div class="grid sm:grid-cols-4 gap-4">
        <UiSelect v-model="actionFilter" label="Action" :options="actionOptions" placeholder="All actions" />
        <UiInput v-model="from" type="date" label="From" />
        <UiInput v-model="to" type="date" label="To" />
        <div class="flex items-end">
          <UiButton class="w-full" :loading="loading" @click="applyFilters">Filter</UiButton>
        </div>
      </div>
    </UiCard>

    <UiCard :padded="false">
      <div v-if="pending" class="p-6 text-sm text-ink-400">Loading…</div>
      <div v-else-if="!logs.length" class="p-6 text-sm text-ink-400">No audit log entries match these filters.</div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-sand-200">
            <th class="px-4 py-3">When</th>
            <th class="px-4 py-3">Actor</th>
            <th class="px-4 py-3">Action</th>
            <th class="px-4 py-3">Resource</th>
            <th class="px-4 py-3">IP Address</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-sand-200">
          <tr v-for="log in logs" :key="log._id">
            <td class="px-4 py-3 text-ink-300 whitespace-nowrap">{{ formatDate(log.createdAt) }}</td>
            <td class="px-4 py-3 text-ink-100 font-medium">
              {{ log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : (log.actorEmail || '—') }}
              <span class="text-xs text-ink-500 block">{{ log.actorRole }}</span>
            </td>
            <td class="px-4 py-3"><UiBadge tone="info">{{ log.action }}</UiBadge></td>
            <td class="px-4 py-3 text-ink-300">{{ log.resourceType }}<span v-if="log.resourceId" class="text-ink-500"> · {{ shortId(log.resourceId) }}</span></td>
            <td class="px-4 py-3 text-ink-400 font-mono text-xs">{{ log.ipAddress || '—' }}</td>
            <td class="px-4 py-3 text-right">
              <button class="text-ink-300 hover:underline text-xs font-medium" @click="toggleExpanded(log._id)">
                {{ expanded === log._id ? 'Hide' : 'Details' }}
              </button>
            </td>
          </tr>
          <tr v-if="expanded">
            <td colspan="6" class="px-4 py-4 bg-sand-50">
              <pre class="text-xs text-ink-300 whitespace-pre-wrap break-all">{{ formattedDetails }}</pre>
            </td>
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
const actionFilter = ref('')
const logs = ref([])
const distinctActions = ref([])
const loading = ref(false)
const pending = ref(true)
const expanded = ref(null)

const page = ref(1)
const pageSize = 20
const total = ref(0)
const totalPages = ref(1)

const rangeStart = computed(() => (page.value - 1) * pageSize + 1)
const rangeEnd = computed(() => Math.min(page.value * pageSize, total.value))

const actionOptions = computed(() => [
  { value: '', label: 'All actions' },
  ...distinctActions.value.map((a) => ({ value: a, label: a }))
])

const expandedLog = computed(() => logs.value.find((l) => l._id === expanded.value))
const formattedDetails = computed(() => {
  if (!expandedLog.value) return ''
  const { before, after, meta, userAgent } = expandedLog.value
  return JSON.stringify({ before, after, meta, userAgent }, null, 2)
})

function toggleExpanded(id) {
  expanded.value = expanded.value === id ? null : id
}

async function loadLogs() {
  loading.value = true
  try {
    const query = { page: page.value, pageSize }
    if (actionFilter.value) query.action = actionFilter.value
    if (from.value) query.from = from.value
    if (to.value) query.to = to.value

    const res = await $fetch('/api/admin/audit-logs', { query })
    logs.value = res.logs
    distinctActions.value = res.distinctActions
    total.value = res.total
    totalPages.value = res.totalPages
  } finally {
    loading.value = false
    pending.value = false
  }
}

function goToPage(newPage) {
  page.value = newPage
  expanded.value = null // collapse any expanded row when changing pages
  loadLogs()
}

// Changing a filter should reset back to page 1 — staying on, say, page 5 of
// an unfiltered list while filtering down to a handful of matches would just
// show an empty page.
function applyFilters() {
  page.value = 1
  loadLogs()
}

function formatDate(d) {
  return dayjs(d).format('MMM D, YYYY h:mm A')
}

function shortId(id) {
  const str = String(id)
  return str.length > 8 ? str.slice(-6) : str
}

await loadLogs()
</script>
