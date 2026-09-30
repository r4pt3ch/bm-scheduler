<template>
  <div>
    <header class="mb-6 flex items-center justify-between flex-wrap gap-4">
      <NuxtLink to="/payroll" class="text-sm text-ink-400 hover:underline">← Back to payroll</NuxtLink>
      <div v-if="auth.isAdmin && record" class="flex gap-2">
        <UiButton v-if="record.status === 'draft'" size="sm" variant="secondary" @click="setStatus('finalized')">Finalize</UiButton>
        <UiButton v-if="record.status === 'finalized'" size="sm" variant="secondary" @click="setStatus('paid')">Mark as Paid</UiButton>
        <UiButton v-if="record.status !== 'cancelled'" size="sm" variant="danger" @click="showCancelModal = true">Cancel Payroll</UiButton>
        <UiButton size="sm" variant="ghost" @click="printPayslip">Print</UiButton>
      </div>
      <UiButton v-else-if="record" size="sm" variant="ghost" @click="printPayslip">Print</UiButton>
    </header>

    <UiCard v-if="record?.status === 'cancelled'" class="mb-6" border-class="border border-rose-400/30">
      <p class="text-sm font-medium text-rose-300">This payroll record has been cancelled.</p>
      <p class="text-xs text-ink-400 mt-1">
        Was {{ record.statusBeforeCancellation }} before cancellation, on {{ formatDate(record.cancelledAt) }}.
        <span v-if="record.cancellationReason">Reason: {{ record.cancellationReason }}</span>
      </p>
    </UiCard>

    <div v-if="pending" class="text-sm text-ink-400">Loading…</div>

    <div v-else-if="record" id="payslip" class="bg-sand-100 border border-sand-200 rounded-xl p-6 sm:p-10 max-w-3xl mx-auto">
      <div class="flex items-start justify-between border-b border-sand-200 pb-6 mb-6">
        <div class="flex items-center gap-4">
          <img src="/images/logo.png" alt="" class="w-14 h-14 shrink-0 hidden sm:block" />
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-brand-400 font-semibold">{{ companyName }}</p>
            <h1 class="font-display text-2xl text-ink-50 mt-1">Payslip</h1>
            <p class="text-xs text-ink-400 mt-1">{{ record.runLabel }}</p>
          </div>
        </div>
        <UiBadge :tone="statusTone(record.status)">{{ record.status }}</UiBadge>
      </div>

      <div class="grid sm:grid-cols-2 gap-6 mb-8">
        <div>
          <p class="text-xs uppercase tracking-wide text-ink-500">Employee</p>
          <p class="text-sm font-medium text-ink-50 mt-1">{{ record.employee?.firstName }} {{ record.employee?.lastName }}</p>
          <p class="text-xs text-ink-400">{{ record.employee?.employeeNumber }} · {{ record.employee?.position || '—' }}</p>
        </div>
        <div class="sm:text-right">
          <p class="text-xs uppercase tracking-wide text-ink-500">Pay Period</p>
          <p class="text-sm text-ink-50 mt-1">{{ formatDate(record.periodStart) }} – {{ formatDate(record.periodEnd) }}</p>
          <p class="text-xs text-ink-400">Pay date: {{ formatDate(record.payDate) }}</p>
        </div>
      </div>

      <div v-if="record.rateBasis?.length" class="mb-8 rounded-lg border border-sand-200 px-4 py-3">
        <p class="text-xs uppercase tracking-wide text-ink-500 mb-2">Rate Basis — monthly salary ÷ Mon–Sat days of the month</p>
        <div v-for="rb in record.rateBasis" :key="rb.month" class="flex flex-wrap justify-between gap-2 text-xs text-ink-300">
          <span>{{ monthName(rb.month) }}: {{ currency.format(record.basicSalarySnapshot) }} ÷ {{ rb.workingDays }} days</span>
          <span class="text-ink-50">Daily {{ currency.format(rb.dailyRate) }} · Hourly {{ currency.format(rb.hourlyRate) }}</span>
        </div>
      </div>

      <div v-if="record.dailyBreakdown?.length" class="mb-8">
        <h3 class="text-xs uppercase tracking-wide text-ink-500 mb-3">Daily Breakdown</h3>
        <p class="text-xs text-ink-400 mb-3">
          What each day earned. Every day is paid at its own month's daily rate; days marked Absent, No Work,
          or with no attendance entered earn nothing. Work on Sundays and holidays uses the DOLE premium rates.
        </p>
        <div class="overflow-x-auto rounded-lg border border-sand-200">
          <table class="w-full text-xs">
            <thead class="bg-sand-200/50">
              <tr class="text-left text-ink-500 uppercase tracking-wide">
                <th class="px-3 py-2 whitespace-nowrap">Date</th>
                <th class="px-3 py-2 whitespace-nowrap">Day Type</th>
                <th class="px-3 py-2 whitespace-nowrap text-right">Hrs</th>
                <th class="px-3 py-2 whitespace-nowrap text-right">OT Hrs</th>
                <th class="px-3 py-2">Calculation</th>
                <th class="px-3 py-2 whitespace-nowrap text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(line, idx) in record.dailyBreakdown"
                :key="idx"
                class="border-t border-sand-200/70"
              >
                <td class="px-3 py-2 whitespace-nowrap text-ink-50">
                  {{ line.date ? formatDateWithDay(line.date) : '—' }}
                </td>
                <td class="px-3 py-2 whitespace-nowrap text-ink-300">{{ line.dayLabel || dayTypeLabel(line.status) }}</td>
                <td class="px-3 py-2 text-right text-ink-300">{{ line.hoursWorked || '—' }}</td>
                <td class="px-3 py-2 text-right text-ink-300">{{ line.overtimeHours || '—' }}</td>
                <td class="px-3 py-2 text-ink-400">{{ line.formula }}</td>
                <td
                  class="px-3 py-2 whitespace-nowrap text-right font-medium"
                  :class="line.amount > 0 ? 'text-emerald-400' : line.amount < 0 ? 'text-rose-300' : 'text-ink-400'"
                >
                  {{ line.amount === 0 ? '—' : currency.format(line.amount) }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t border-sand-200 bg-sand-200/30 font-semibold">
                <td class="px-3 py-2" colspan="5">Total earned from attendance (basic + premiums + OT − late/undertime)</td>
                <td
                  class="px-3 py-2 whitespace-nowrap text-right"
                  :class="dailyBreakdownTotal >= 0 ? 'text-emerald-400' : 'text-rose-300'"
                >
                  {{ currency.format(dailyBreakdownTotal) }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-8 mb-8">
        <div>
          <h3 class="text-xs uppercase tracking-wide text-ink-500 mb-3">Earnings</h3>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-ink-300">Basic pay <span class="text-ink-500 text-xs">({{ record.attendanceSummary?.daysWorked ?? 0 }} of {{ record.attendanceSummary?.scheduledDays || '—' }} days)</span></dt><dd class="text-ink-50">{{ currency.format(record.earnings.basicPay) }}</dd></div>
            <div v-if="record.earnings.overtimeBreakdown?.ordinaryOvertimePay" class="flex justify-between"><dt class="text-ink-300">Overtime pay (125%)</dt><dd class="text-ink-50">{{ currency.format(record.earnings.overtimeBreakdown.ordinaryOvertimePay) }}</dd></div>
            <div v-if="record.earnings.premiumBreakdown?.restDayPay" class="flex justify-between"><dt class="text-ink-300">Rest day / Sunday work (130%)</dt><dd class="text-ink-50">{{ currency.format(record.earnings.premiumBreakdown.restDayPay) }}</dd></div>
            <div v-if="record.earnings.overtimeBreakdown?.restDayOvertimePay" class="flex justify-between"><dt class="text-ink-300">Rest day OT (169%)</dt><dd class="text-ink-50">{{ currency.format(record.earnings.overtimeBreakdown.restDayOvertimePay) }}</dd></div>
            <div v-if="record.earnings.premiumBreakdown?.specialDayPay" class="flex justify-between"><dt class="text-ink-300">Special non-working day work</dt><dd class="text-ink-50">{{ currency.format(record.earnings.premiumBreakdown.specialDayPay) }}</dd></div>
            <div v-if="record.earnings.overtimeBreakdown?.specialDayOvertimePay" class="flex justify-between"><dt class="text-ink-300">Special day OT</dt><dd class="text-ink-50">{{ currency.format(record.earnings.overtimeBreakdown.specialDayOvertimePay) }}</dd></div>
            <div v-if="record.earnings.premiumBreakdown?.holidayPay" class="flex justify-between"><dt class="text-ink-300">Regular holiday pay</dt><dd class="text-ink-50">{{ currency.format(record.earnings.premiumBreakdown.holidayPay) }}</dd></div>
            <div v-if="record.earnings.overtimeBreakdown?.holidayOvertimePay" class="flex justify-between"><dt class="text-ink-300">Regular holiday OT</dt><dd class="text-ink-50">{{ currency.format(record.earnings.overtimeBreakdown.holidayOvertimePay) }}</dd></div>
            <div v-if="record.earnings.allowances" class="flex justify-between"><dt class="text-ink-300">Taxable allowance</dt><dd class="text-ink-50">{{ currency.format(record.earnings.allowances) }}</dd></div>
            <div v-if="record.earnings.deMinimis" class="flex justify-between"><dt class="text-ink-300">De minimis allowance</dt><dd class="text-ink-50">{{ currency.format(record.earnings.deMinimis) }}</dd></div>
            <div v-if="record.earnings.thirteenthMonthPay" class="flex justify-between"><dt class="text-ink-300">13th month pay</dt><dd class="text-ink-50">{{ currency.format(record.earnings.thirteenthMonthPay) }}</dd></div>
            <div v-if="record.earnings.otherEarnings" class="flex justify-between"><dt class="text-ink-300">Other earnings</dt><dd class="text-ink-50">{{ currency.format(record.earnings.otherEarnings) }}</dd></div>
            <div class="flex justify-between border-t border-sand-200 pt-2 font-semibold"><dt class="text-ink-100">Gross pay</dt><dd class="text-ink-50">{{ currency.format(record.earnings.grossPay) }}</dd></div>
            <div v-for="(r, idx) in record.reimbursements" :key="idx" class="flex justify-between">
              <dt class="text-ink-300">{{ r.description }} <span class="text-ink-500 text-xs">(reimbursement)</span></dt>
              <dd class="text-ink-50">{{ currency.format(r.amount) }}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h3 class="text-xs uppercase tracking-wide text-ink-500 mb-3">Deductions</h3>
          <p v-if="excludedGovDeductionsLabel" class="text-xs text-amber-300 bg-amber-400/10 rounded-lg px-3 py-2 mb-3">
            {{ excludedGovDeductionsLabel }} excluded for this run — not an error.
          </p>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-ink-300">SSS</dt><dd class="text-ink-50">{{ currency.format(record.deductions.sssEmployee) }}</dd></div>
            <div class="flex justify-between"><dt class="text-ink-300">PhilHealth</dt><dd class="text-ink-50">{{ currency.format(record.deductions.philhealthEmployee) }}</dd></div>
            <div class="flex justify-between"><dt class="text-ink-300">Pag-IBIG</dt><dd class="text-ink-50">{{ currency.format(record.deductions.pagibigEmployee) }}</dd></div>
            <div class="flex justify-between"><dt class="text-ink-300">Withholding tax</dt><dd class="text-ink-50">{{ currency.format(record.deductions.withholdingTax) }}</dd></div>
            <div v-if="record.deductions.lateUndertimeDeduction" class="flex justify-between"><dt class="text-ink-300">Late / undertime</dt><dd class="text-ink-50">{{ currency.format(record.deductions.lateUndertimeDeduction) }}</dd></div>
            <div v-if="record.deductions.halfDayDeduction" class="flex justify-between"><dt class="text-ink-300">Half-day adjustment</dt><dd class="text-ink-50">{{ currency.format(record.deductions.halfDayDeduction) }}</dd></div>
            <div v-if="record.deductions.noWorkDeduction" class="flex justify-between"><dt class="text-ink-300">No work / unrecorded days</dt><dd class="text-ink-50">{{ currency.format(record.deductions.noWorkDeduction) }}</dd></div>
            <div v-for="(item, idx) in record.deductions.customDeductionsApplied" :key="idx" class="flex justify-between">
              <dt class="text-ink-300">{{ item.label }}</dt>
              <dd class="text-ink-50">{{ currency.format(item.amount) }}</dd>
            </div>
            <div v-if="record.otherDeductionAmount" class="flex justify-between">
              <dt class="text-ink-300">{{ record.otherDeductionDescription || 'Other deduction' }}</dt>
              <dd class="text-ink-50">{{ currency.format(record.otherDeductionAmount) }}</dd>
            </div>
            <div class="flex justify-between border-t border-sand-200 pt-2 font-semibold"><dt class="text-ink-100">Total deductions</dt><dd class="text-ink-50">{{ currency.format(record.deductions.totalDeductions) }}</dd></div>
          </dl>
        </div>
      </div>

      <div class="bg-brand-500 rounded-lg p-5 flex items-center justify-between mb-8">
        <span class="font-display text-lg text-sand-50">Net Pay</span>
        <span class="font-display text-2xl text-sand-50">{{ currency.format(record.netPay) }}</span>
      </div>

      <div v-if="auth.isAdmin" class="border-t border-sand-200 pt-5">
        <h3 class="text-xs uppercase tracking-wide text-ink-500 mb-3">Employer Contributions (not deducted from employee)</h3>
        <dl class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><dt class="text-ink-400 text-xs">SSS</dt><dd class="text-ink-50">{{ currency.format(record.employerContributions.sssEmployer) }}</dd></div>
          <div><dt class="text-ink-400 text-xs">PhilHealth</dt><dd class="text-ink-50">{{ currency.format(record.employerContributions.philhealthEmployer) }}</dd></div>
          <div><dt class="text-ink-400 text-xs">Pag-IBIG</dt><dd class="text-ink-50">{{ currency.format(record.employerContributions.pagibigEmployer) }}</dd></div>
          <div><dt class="text-ink-400 text-xs">EC</dt><dd class="text-ink-50">{{ currency.format(record.employerContributions.ecContribution) }}</dd></div>
        </dl>
      </div>

      <p class="text-[11px] text-ink-500 mt-8 text-center">This is a system-generated payslip from {{ companyName }}.</p>
    </div>

    <!-- Cancel confirmation modal -->
    <div v-if="showCancelModal" class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-40" @click.self="showCancelModal = false">
      <div class="bg-sand-100 rounded-xl max-w-md w-full p-6">
        <h2 class="font-display text-xl text-ink-50 mb-2">Cancel This Payroll Record?</h2>

        <p v-if="record?.status === 'draft'" class="text-sm text-ink-300 mb-4">
          This draft hasn't been finalized yet — cancelling it is low-risk. It will be marked cancelled and excluded from reports, but kept for the record.
        </p>
        <p v-else-if="record?.status === 'finalized'" class="text-sm text-amber-300 bg-amber-400/10 rounded-lg px-3 py-2 mb-4">
          This payslip has been finalized — the employee may already be expecting this pay. Cancelling will hide it from their view and exclude it from reports.
        </p>
        <p v-else-if="record?.status === 'paid'" class="text-sm text-rose-300 bg-rose-400/10 rounded-lg px-3 py-2 mb-4">
          ⚠ This payslip is marked as PAID. Cancelling it does NOT reverse any actual bank transfer or cash disbursement — it only marks the record here. If money has already moved, handle the real-world correction separately before or after cancelling this record.
        </p>

        <UiInput v-model="cancelReason" label="Reason (optional, but recommended for the audit trail)" placeholder="e.g. Generated with wrong attendance data" />

        <p v-if="cancelError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg mt-3">{{ cancelError }}</p>

        <div class="flex gap-3 justify-end pt-4">
          <UiButton type="button" variant="ghost" @click="showCancelModal = false">Keep It</UiButton>
          <UiButton variant="danger" :loading="cancelling" @click="handleCancel">Yes, Cancel It</UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default' })

const route = useRoute()
const auth = useAuthStore()
const currency = useCurrency()
const config = useRuntimeConfig()
const companyName = config.public.companyName

const { data, pending, refresh } = await useFetch(`/api/payroll/${route.params.id}`)
const record = computed(() => data.value?.record)

async function setStatus(status) {
  await $fetch(`/api/payroll/${route.params.id}`, { method: 'PATCH', body: { status } })
  await refresh()
}

const showCancelModal = ref(false)
const cancelReason = ref('')
const cancelling = ref(false)
const cancelError = ref('')

async function handleCancel() {
  cancelling.value = true
  cancelError.value = ''
  try {
    await $fetch(`/api/payroll/${route.params.id}/cancel`, {
      method: 'POST',
      body: { reason: cancelReason.value }
    })
    showCancelModal.value = false
    cancelReason.value = ''
    await refresh()
  } catch (err) {
    cancelError.value = err?.data?.statusMessage || 'Failed to cancel this payroll record.'
  } finally {
    cancelling.value = false
  }
}

function printPayslip() {
  window.print()
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateWithDay(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })
}

function monthName(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-PH', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

const DAY_TYPE_LABELS = {
  present: 'Regular',
  absent: 'Absent',
  'no-work': 'No Work',
  'half-day': 'Half Day',
  leave: 'Leave',
  'rest-day': 'Rest Day',
  'special-non-working-day': 'Special Non-Working Day',
  'regular-holiday': 'Regular Holiday',
  unrecorded: 'Unrecorded',
  rounding: 'Rounding'
}

function dayTypeLabel(status) {
  return DAY_TYPE_LABELS[status] || status
}

const dailyBreakdownTotal = computed(() =>
  (record.value?.dailyBreakdown || []).reduce((sum, line) => sum + (line.amount || 0), 0)
)

const excludedGovDeductionsLabel = computed(() => {
  const g = record.value?.governmentDeductionsIncluded
  if (!g || typeof g !== 'object') return ''
  const excluded = []
  if (g.sss === false) excluded.push('SSS')
  if (g.philHealth === false) excluded.push('PhilHealth')
  if (g.pagIbig === false) excluded.push('Pag-IBIG')
  if (g.withholdingTax === false) excluded.push('Withholding Tax')
  return excluded.join(', ')
})

function statusTone(status) {
  if (status === 'paid') return 'success'
  if (status === 'finalized') return 'info'
  if (status === 'cancelled') return 'danger'
  return 'warning'
}
</script>

<style>
@media print {
  aside, .md\:hidden, header { display: none !important; }

  /* Force a clean, ink-friendly light printout regardless of the on-screen
     dark theme — printing the dark theme as-is would waste toner and be
     hard to read on paper. */
  body { background: #ffffff !important; }
  #payslip {
    border: none !important;
    background: #ffffff !important;
    color: #1a1a1a !important;
  }
  #payslip * {
    color: #1a1a1a !important;
    border-color: #d4d4d4 !important;
  }
  #payslip .bg-brand-500 {
    background: #f3e3b8 !important;
    color: #5c441f !important;
  }
  #payslip .bg-brand-500 * {
    color: #5c441f !important;
  }

  /* The seal is engraved gold designed for a dark background — on white
     paper it would look washed out, so give it a small dark backing chip
     in print so the gold linework stays legible. */
  #payslip img[alt=""] {
    background: #16140f !important;
    border-radius: 9999px;
    padding: 2px;
  }
}
</style>
