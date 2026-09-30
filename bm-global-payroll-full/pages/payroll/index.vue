<template>
  <div>
    <header class="flex items-center justify-between mb-8 flex-wrap gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.18em] text-ink-400 font-semibold">Payroll</p>
        <h1 class="font-display text-3xl text-ink-50 mt-1">{{ auth.isAdmin ? 'Payroll Runs' : 'My Payslips' }}</h1>
      </div>
      <div class="flex items-center gap-3">
        <UiButton
          v-if="auth.isAdmin && selectedIds.length"
          variant="ghost"
          class="!text-rose-300"
          :loading="bulkDeleting"
          @click="handleBulkDelete"
        >
          Delete Selected ({{ selectedIds.length }})
        </UiButton>
        <UiButton v-if="auth.isAdmin" @click="showGenerate = true">+ Generate Payroll</UiButton>
      </div>
    </header>

    <div class="flex gap-1 mb-6 border-b border-sand-200">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
        :class="activeTab === tab.key
          ? 'border-brand-500 text-ink-50'
          : 'border-transparent text-ink-400 hover:text-ink-100'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }} <span class="text-xs text-ink-500">({{ tabCounts[tab.key] }})</span>
      </button>
    </div>

    <UiCard :padded="false">
      <div v-if="!records.length" class="p-6 text-sm text-ink-400">No {{ activeTab }} payroll records.</div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-sand-200">
            <th v-if="auth.isAdmin" class="px-4 py-3 w-8">
              <input
                type="checkbox"
                class="rounded border-sand-200 accent-brand-500"
                :checked="allDraftsOnPageSelected"
                :disabled="!draftIdsOnPage.length"
                @change="toggleSelectAll($event.target.checked)"
              />
            </th>
            <th v-if="auth.isAdmin" class="px-4 py-3">Employee</th>
            <th class="px-4 py-3">Period</th>
            <th class="px-4 py-3">Pay Date</th>
            <th class="px-4 py-3">Gross</th>
            <th class="px-4 py-3">Deductions</th>
            <th class="px-4 py-3">Net Pay</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-sand-200">
          <tr v-for="r in pagedRecords" :key="r._id" class="hover:bg-sand-200">
            <td v-if="auth.isAdmin" class="px-4 py-3">
              <input
                v-if="r.status === 'draft'"
                type="checkbox"
                class="rounded border-sand-200 accent-brand-500"
                :checked="selectedIds.includes(r._id)"
                @change="toggleSelectOne(r._id, $event.target.checked)"
              />
            </td>
            <td v-if="auth.isAdmin" class="px-4 py-3 text-ink-100 font-medium">{{ r.employee?.firstName }} {{ r.employee?.lastName }}</td>
            <td class="px-4 py-3 text-ink-300">{{ r.runLabel }}</td>
            <td class="px-4 py-3 text-ink-300">{{ formatDate(r.payDate) }}</td>
            <td class="px-4 py-3 text-ink-100">{{ currency.format(r.earnings?.grossPay) }}</td>
            <td class="px-4 py-3 text-ink-100">{{ currency.format(r.deductions?.totalDeductions) }}</td>
            <td class="px-4 py-3 font-semibold text-ink-50">{{ currency.format(r.netPay) }}</td>
            <td class="px-4 py-3"><UiBadge :tone="statusTone(r.status)">{{ r.status }}</UiBadge></td>
            <td class="px-4 py-3 text-right">
              <NuxtLink :to="`/payroll/${r._id}`" class="text-ink-300 hover:underline font-medium">View</NuxtLink>
              <button
                v-if="auth.isAdmin && r.status === 'draft'"
                class="focus-ring text-rose-300 hover:underline font-medium ml-3"
                @click="quickCancel(r)"
              >
                Cancel
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="records.length > pageSize" class="flex items-center justify-between px-4 py-3 border-t border-sand-200">
        <p class="text-xs text-ink-400">
          Showing {{ rangeStart }}–{{ rangeEnd }} of {{ records.length }}
        </p>
        <div class="flex gap-2">
          <UiButton size="sm" variant="ghost" :disabled="currentPage === 1" @click="currentPage--">← Previous</UiButton>
          <span class="text-xs text-ink-400 self-center px-2">Page {{ currentPage }} of {{ totalPages }}</span>
          <UiButton size="sm" variant="ghost" :disabled="currentPage === totalPages" @click="currentPage++">Next →</UiButton>
        </div>
      </div>
    </UiCard>

    <!-- Generate payroll modal -->
    <div v-if="showGenerate" class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-40" @click.self="showGenerate = false">
      <div class="bg-sand-100 rounded-xl max-w-md w-full p-6">
        <h2 class="font-display text-xl text-ink-50 mb-1">Generate Payroll</h2>
        <p class="text-xs text-ink-400 mb-4">
          Computes SSS, PhilHealth, Pag-IBIG, and withholding tax
          {{ genForm.employeeId ? 'for the selected employee' : 'for all active employees' }} over the selected period.
        </p>
        <p class="text-xs text-amber-300 bg-amber-400/10 rounded-lg px-3 py-2 mb-4">
          Attendance must be entered for this exact Period start–end before generating, and the period dates must match
          exactly what you'll enter on the Attendance page. If a draft already exists for this period, re-generating
          overwrites it with fresh numbers — but a <strong>finalized or paid</strong> record for the same period is
          skipped, not overwritten. Cancel it first if you need to recompute it with updated attendance.
        </p>
        <form class="space-y-4" @submit.prevent="handleGenerate">
          <UiSelect
            v-model="genForm.employeeId"
            label="Employee"
            :options="employeeOptions"
          />
          <UiSelect
            v-model="genForm.cutoff"
            label="Cutoff"
            :options="[{ value: '1st', label: '1st Cutoff (1–15)' }, { value: '2nd', label: '2nd Cutoff (16–end)' }, { value: 'monthly', label: 'Monthly' }]"
          />
          <div class="grid grid-cols-2 gap-4">
            <UiInput v-model="genForm.periodStart" type="date" label="Period start" required />
            <UiInput v-model="genForm.periodEnd" type="date" label="Period end" required />
          </div>
          <UiInput v-model="genForm.payDate" type="date" label="Pay date" required />

          <label class="flex items-center gap-2 text-sm text-ink-100">
            <input v-model="genForm.includeThirteenthMonth" type="checkbox" class="rounded border-sand-200 accent-brand-500" />
            Include 13th month pay in this run
          </label>

          <div v-if="genForm.employeeId" class="space-y-3 border-t border-sand-200 pt-4">
            <div class="flex items-center justify-between">
              <span class="text-sm text-ink-100 font-medium">Reimbursements</span>
              <button type="button" class="text-xs text-brand-400 hover:underline" @click="addReimbursement">+ Add line</button>
            </div>
            <div v-for="(r, idx) in genForm.reimbursements" :key="idx" class="flex gap-2 items-end">
              <UiInput v-model="r.description" label="Description" placeholder="e.g. Client dinner receipt" class="flex-1" />
              <UiInput v-model="r.amount" type="number" label="Amount (₱)" min="0" class="w-32" />
              <button type="button" class="text-rose-300 hover:underline text-xs pb-2" @click="genForm.reimbursements.splice(idx, 1)">Remove</button>
            </div>
            <p v-if="!genForm.reimbursements.length" class="text-xs text-ink-400">No reimbursements added for this run.</p>
          </div>

          <p v-if="genError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg">{{ genError }}</p>
          <div v-if="genResult" class="text-sm text-emerald-300 bg-emerald-400/10 px-3 py-2 rounded-lg space-y-1">
            <p>
              Generated {{ genResult.generated }} payslip(s) as drafts{{ genForm.employeeId ? '' : ' for all active employees' }}.
            </p>
          </div>
          <div v-if="genResult?.warnings?.length" class="text-sm text-amber-300 bg-amber-400/10 px-3 py-2 rounded-lg space-y-1">
            <p class="font-medium">⚠ No attendance found for {{ genResult.warnings.length }} employee(s) — computed with defaults:</p>
            <p v-for="(w, idx) in genResult.warnings" :key="idx" class="text-xs">{{ w.employee }}: {{ w.reason }}</p>
          </div>
          <div v-if="genResult?.errors?.length" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg space-y-1">
            <p class="font-medium">{{ genResult.errors.length }} skipped:</p>
            <p v-for="(e, idx) in genResult.errors" :key="idx" class="text-xs">{{ e.employee }}: {{ e.reason }}</p>
          </div>

          <div class="flex gap-3 justify-end pt-2">
            <UiButton type="button" variant="ghost" @click="showGenerate = false">Close</UiButton>
            <UiButton type="submit" :loading="generating">Generate</UiButton>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import dayjs from 'dayjs'

definePageMeta({ layout: 'default' })
const auth = useAuthStore()
const currency = useCurrency()

const { data, refresh } = await useFetch('/api/payroll')
const allRecords = computed(() => data.value?.records || [])

// "Active" groups draft + finalized together — both are still in-flight/awaiting
// payment, just at different stages. Paid and Cancelled are their own clear
// end-states. Cancelled records are never deleted (protected by design as an
// audit trail); tabs just control which slice of history is in view.
const activeTab = ref('active')
const tabs = [
  { key: 'active', label: 'Active' },
  { key: 'paid', label: 'Paid' },
  { key: 'cancelled', label: 'Cancelled' }
]

function matchesTab(record, tabKey) {
  if (tabKey === 'active') return record.status === 'draft' || record.status === 'finalized'
  return record.status === tabKey
}

const tabCounts = computed(() => {
  const counts = { active: 0, paid: 0, cancelled: 0 }
  for (const r of allRecords.value) {
    for (const tab of tabs) {
      if (matchesTab(r, tab.key)) counts[tab.key]++
    }
  }
  return counts
})

const records = computed(() => allRecords.value.filter((r) => matchesTab(r, activeTab.value)))

// Only admins ever see the generate modal, but useFetch runs on the server
// during SSR for every visitor — guard the request so non-admins (and
// employees on their "My Payslips" view) don't trigger a 403 for a dropdown
// they'll never see.
const { data: employeeData } = await useFetch('/api/employees', {
  query: { status: 'active' },
  immediate: auth.isAdmin
})
const employeeOptions = computed(() => [
  { value: '', label: 'All active employees' },
  ...(employeeData.value?.employees || []).map((e) => ({
    value: e._id,
    label: `${e.lastName}, ${e.firstName} — ${e.employeeNumber}`
  }))
])

const pageSize = 20
const currentPage = ref(1)
watch(activeTab, () => { currentPage.value = 1 })

const totalPages = computed(() => Math.max(1, Math.ceil(records.value.length / pageSize)))

const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return records.value.slice(start, start + pageSize)
})

const rangeStart = computed(() => (currentPage.value - 1) * pageSize + 1)
const rangeEnd = computed(() => Math.min(currentPage.value * pageSize, records.value.length))

// If the record list shrinks (e.g. after a cancel) and the current page no
// longer exists, snap back to the last valid page rather than showing blank.
watch(totalPages, (newTotal) => {
  if (currentPage.value > newTotal) currentPage.value = newTotal
})

const showGenerate = ref(false)
const generating = ref(false)
const genError = ref('')
const genResult = ref(null)

const genForm = reactive({
  employeeId: '',
  cutoff: '2nd',
  periodStart: dayjs().startOf('month').format('YYYY-MM-DD'),
  periodEnd: dayjs().format('YYYY-MM-DD'),
  payDate: dayjs().format('YYYY-MM-DD'),
  includeThirteenthMonth: false,
  reimbursements: []
})

function addReimbursement() {
  genForm.reimbursements.push({ description: '', amount: '' })
}

// Reimbursements only apply to a single-employee run — if the admin picks a
// specific employee, adds reimbursement lines, then switches back to "All
// active employees," clear them rather than silently dropping them server-side.
watch(() => genForm.employeeId, (val) => {
  if (!val) genForm.reimbursements = []
})

async function handleGenerate() {
  generating.value = true
  genError.value = ''
  genResult.value = null
  try {
    const body = {
      cutoff: genForm.cutoff,
      periodStart: genForm.periodStart,
      periodEnd: genForm.periodEnd,
      payDate: genForm.payDate,
      includeThirteenthMonth: genForm.includeThirteenthMonth,
      // Only include employeeIds when a specific employee is picked.
      // generate.post.js treats a missing/empty employeeIds as "all active
      // employees", so omitting it here is what makes "All active employees" work.
      ...(genForm.employeeId ? { employeeIds: [genForm.employeeId], reimbursements: genForm.reimbursements } : {})
    }
    const res = await $fetch('/api/payroll/generate', { method: 'POST', body })
    genResult.value = res
    if (res.errors?.length) console.warn('Payroll generation skipped:', res.errors)
    await refresh()
    currentPage.value = 1 // newest records sort first, so jump back to page 1 to see them
  } catch (err) {
    genError.value = err?.data?.statusMessage || 'Failed to generate payroll.'
  } finally {
    generating.value = false
  }
}

function formatDate(d) {
  return dayjs(d).format('MMM D, YYYY')
}

function statusTone(status) {
  if (status === 'paid') return 'success'
  if (status === 'finalized') return 'info'
  if (status === 'cancelled') return 'danger'
  return 'warning'
}

// --- Bulk delete (draft-only, mirrors the individual delete's safety rule) ---
const selectedIds = ref([])
const bulkDeleting = ref(false)

// Selection is scoped to drafts on the *current page* only — selecting across
// pages would be easy to lose track of, and drafts are usually reviewed a
// page at a time anyway.
const draftIdsOnPage = computed(() => pagedRecords.value.filter((r) => r.status === 'draft').map((r) => r._id))
const allDraftsOnPageSelected = computed(
  () => draftIdsOnPage.value.length > 0 && draftIdsOnPage.value.every((id) => selectedIds.value.includes(id))
)

// If the page changes (or the record list refreshes and a selected draft
// disappears — e.g. someone else deleted it), drop any selected ids that are
// no longer valid rather than silently carrying stale ones into the next delete.
watch([currentPage, records], () => {
  const validIds = new Set(records.value.map((r) => r._id))
  selectedIds.value = selectedIds.value.filter((id) => validIds.has(id))
})

function toggleSelectOne(id, checked) {
  if (checked) {
    if (!selectedIds.value.includes(id)) selectedIds.value.push(id)
  } else {
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
  }
}

function toggleSelectAll(checked) {
  if (checked) {
    // Merge rather than replace, in case selections from a previous page
    // (before a refresh reset pagination) are still valid.
    selectedIds.value = Array.from(new Set([...selectedIds.value, ...draftIdsOnPage.value]))
  } else {
    selectedIds.value = selectedIds.value.filter((id) => !draftIdsOnPage.value.includes(id))
  }
}

async function handleBulkDelete() {
  if (!selectedIds.value.length) return
  const confirmed = confirm(
    `Permanently delete ${selectedIds.value.length} draft payroll record(s)? This cannot be undone. (Finalized or paid records can't be selected — use Cancel for those instead.)`
  )
  if (!confirmed) return

  bulkDeleting.value = true
  try {
    await $fetch('/api/payroll/bulk-delete', { method: 'POST', body: { ids: selectedIds.value } })
    selectedIds.value = []
    await refresh()
  } catch (err) {
    alert(err?.data?.statusMessage || 'Failed to delete the selected payroll records.')
  } finally {
    bulkDeleting.value = false
  }
}

async function quickCancel(record) {
  const confirmed = confirm(
    `Cancel the draft payroll for ${record.employee?.firstName} ${record.employee?.lastName}? This is low-risk since it's just a draft, but it will be marked cancelled rather than deleted.`
  )
  if (!confirmed) return

  try {
    await $fetch(`/api/payroll/${record._id}/cancel`, { method: 'POST', body: {} })
    await refresh()
  } catch (err) {
    alert(err?.data?.statusMessage || 'Failed to cancel this payroll record.')
  }
}
</script>
