<template>
  <div>
    <header class="mb-8">
      <p class="text-xs uppercase tracking-[0.18em] text-ink-400 font-semibold">Dashboard</p>
      <h1 class="font-display text-3xl text-ink-50 mt-1">
        Welcome back, {{ firstName }}
      </h1>
    </header>

    <div v-if="pending" class="text-ink-400 text-sm">Loading…</div>

    <template v-else-if="auth.isAdmin">
      <div class="grid sm:grid-cols-3 gap-4 mb-8">
        <UiCard>
          <p class="text-xs text-ink-400 uppercase tracking-wide">Active employees</p>
          <p class="font-display text-3xl text-brand-400 mt-2">{{ data?.activeEmployees ?? 0 }}</p>
        </UiCard>
        <UiCard>
          <p class="text-xs text-ink-400 uppercase tracking-wide">Pending leave requests</p>
          <p class="font-display text-3xl text-brand-400 mt-2">{{ data?.pendingLeaves ?? 0 }}</p>
          <NuxtLink to="/leaves" class="text-xs text-ink-300 hover:underline mt-1 inline-block">Review →</NuxtLink>
        </UiCard>
        <UiCard>
          <p class="text-xs text-ink-400 uppercase tracking-wide">Net payroll this month</p>
          <p class="font-display text-3xl text-brand-400 mt-2">{{ currency.format(data?.totalPayrollThisMonth) }}</p>
        </UiCard>
      </div>

      <UiCard :padded="false">
        <div class="flex gap-1 px-5 pt-4 border-b border-sand-200">
          <button
            v-for="tab in dashboardTabs"
            :key="tab.key"
            class="px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="activeDashTab === tab.key
              ? 'border-brand-500 text-ink-50'
              : 'border-transparent text-ink-400 hover:text-ink-100'"
            @click="activeDashTab = tab.key"
          >
            {{ tab.label }}
            <span v-if="tab.key === 'reminder' && (data?.allEmployeesReminder?.isOverdue || data?.perEmployeeReminder?.overdueCount)" class="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-rose-400 align-middle"></span>
          </button>
        </div>

        <div class="p-5">
          <!-- Reminder tab -->
          <div v-if="activeDashTab === 'reminder'" class="space-y-6">
            <!-- All-employees company payroll cycle -->
            <div v-if="data?.allEmployeesReminder">
              <p class="text-xs uppercase tracking-wide text-ink-500 mb-2">Company Payroll Cycle</p>
              <div
                class="rounded-xl px-4 py-3 flex items-start justify-between gap-4"
                :class="data.allEmployeesReminder.isOverdue ? 'bg-rose-400/10 border border-rose-400/30' : 'bg-brand-500/10 border border-brand-500/20'"
              >
                <div>
                  <p class="text-sm font-medium" :class="data.allEmployeesReminder.isOverdue ? 'text-rose-200' : 'text-ink-50'">
                    <template v-if="data.allEmployeesReminder.isOverdue">
                      Company-wide payroll is overdue — cutoff was {{ formatDate(data.allEmployeesReminder.mostRecentCutoff) }}
                      ({{ data.allEmployeesReminder.daysOverdue }} day{{ data.allEmployeesReminder.daysOverdue === 1 ? '' : 's' }} ago).
                    </template>
                    <template v-else>
                      Next company-wide payroll cutoff is {{ formatDate(data.allEmployeesReminder.nextCutoff) }}
                      ({{ data.allEmployeesReminder.daysUntilNextCutoff }} day{{ data.allEmployeesReminder.daysUntilNextCutoff === 1 ? '' : 's' }} away).
                    </template>
                  </p>
                  <p class="text-xs text-ink-400 mt-1">
                    <span v-if="data.allEmployeesReminder.lastGeneratedAt">Last run {{ formatDate(data.allEmployeesReminder.lastGeneratedAt) }} · </span>
                    <span v-else>Never run yet · </span>
                    Cutoffs on the {{ ordinal(data.allEmployeesReminder.day1) }} &amp; {{ ordinal(data.allEmployeesReminder.day2) }} of each month
                  </p>
                </div>
                <UiButton to="/payroll" size="sm">Generate Payroll</UiButton>
              </div>
            </div>

            <!-- Per-employee overdue list -->
            <div v-if="data?.perEmployeeReminder">
              <p class="text-xs uppercase tracking-wide text-ink-500 mb-2">
                Per-Employee
                <span v-if="data.perEmployeeReminder.overdueCount">({{ data.perEmployeeReminder.overdueCount }} overdue)</span>
              </p>
              <div v-if="!data.perEmployeeReminder.overdueCount" class="text-sm text-ink-400 px-1">
                All {{ data.perEmployeeReminder.totalActive }} active employees are within the reminder window.
              </div>
              <ul v-else class="divide-y divide-sand-200 border border-sand-200 rounded-xl overflow-hidden">
                <li v-for="e in data.perEmployeeReminder.overdue" :key="e.employeeId" class="px-4 py-2.5 flex items-center justify-between bg-rose-400/5">
                  <div>
                    <p class="text-sm font-medium text-ink-100">{{ e.name }}</p>
                    <p class="text-xs text-ink-400">
                      {{ e.lastGeneratedAt ? `Last generated ${formatDate(e.lastGeneratedAt)}` : 'Never generated' }}
                    </p>
                  </div>
                  <UiBadge tone="danger">{{ e.daysOverdue }}d overdue</UiBadge>
                </li>
              </ul>
              <p v-if="data.perEmployeeReminder.overdueCount > data.perEmployeeReminder.overdue.length" class="text-xs text-ink-500 mt-2">
                +{{ data.perEmployeeReminder.overdueCount - data.perEmployeeReminder.overdue.length }} more not shown.
              </p>
            </div>

            <p class="text-xs text-ink-500">
              Adjust the reminder interval in <NuxtLink to="/settings" class="text-brand-400 hover:underline">Settings</NuxtLink>.
            </p>
          </div>

          <!-- Recent activity tab -->
          <div v-else>
            <div v-if="!data?.recentRuns?.length" class="text-sm text-ink-400">No payroll runs yet. Generate your first payroll from the Payroll page.</div>
            <ul v-else class="divide-y divide-sand-200">
              <li v-for="r in data.recentRuns" :key="r._id" class="py-3 flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-ink-100">{{ r.employee?.firstName }} {{ r.employee?.lastName }}</p>
                  <p class="text-xs text-ink-400">{{ r.runLabel }}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-semibold text-ink-50">{{ currency.format(r.netPay) }}</p>
                  <UiBadge :tone="statusTone(r.status)">{{ r.status }}</UiBadge>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </UiCard>

      <div class="mt-6 flex gap-3">
        <UiButton to="/payroll">Go to Payroll</UiButton>
        <UiButton to="/employees" variant="secondary">Manage Employees</UiButton>
      </div>
    </template>

    <template v-else>
      <div class="grid sm:grid-cols-2 gap-4 mb-8">
        <UiCard>
          <p class="text-xs text-ink-400 uppercase tracking-wide">Vacation leave balance</p>
          <p class="font-display text-3xl text-brand-400 mt-2">{{ data?.leaveCredits?.vacation ?? 0 }} days</p>
        </UiCard>
        <UiCard>
          <p class="text-xs text-ink-400 uppercase tracking-wide">Sick leave balance</p>
          <p class="font-display text-3xl text-brand-400 mt-2">{{ data?.leaveCredits?.sick ?? 0 }} days</p>
        </UiCard>
      </div>

      <UiCard v-if="data?.latestPayslip">
        <h2 class="font-display text-lg text-ink-50 mb-4">Latest payslip</h2>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-ink-100">{{ data.latestPayslip.runLabel }}</p>
            <p class="text-xs text-ink-400">Pay date: {{ formatDate(data.latestPayslip.payDate) }}</p>
          </div>
          <div class="text-right">
            <p class="font-display text-2xl text-brand-400">{{ currency.format(data.latestPayslip.netPay) }}</p>
            <NuxtLink :to="`/payroll/${data.latestPayslip._id}`" class="text-xs text-ink-300 hover:underline">View payslip →</NuxtLink>
          </div>
        </div>
      </UiCard>
      <UiCard v-else>
        <p class="text-sm text-ink-400">No payslips yet.</p>
      </UiCard>

      <div class="mt-6 flex gap-3">
        <UiButton to="/leaves">Request Leave</UiButton>
        <UiButton to="/payroll" variant="secondary">View Payslips</UiButton>
      </div>
    </template>
  </div>
</template>

<script setup>
const auth = useAuthStore()
const currency = useCurrency()

const { data, pending } = await useFetch('/api/dashboard')

const dashboardTabs = [
  { key: 'reminder', label: 'Reminder' },
  { key: 'activity', label: 'Recent Activity' }
]
const activeDashTab = ref('reminder')

const firstName = computed(() => auth.user?.name?.split(' ')[0] || '')

function statusTone(status) {
  if (status === 'paid') return 'success'
  if (status === 'finalized') return 'info'
  if (status === 'cancelled') return 'danger'
  return 'warning'
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}
</script>
