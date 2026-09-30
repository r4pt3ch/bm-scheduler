<template>
  <div>
    <header class="mb-8">
      <p class="text-xs uppercase tracking-[0.18em] text-ink-400 font-semibold">Reports</p>
      <h1 class="font-display text-3xl text-ink-50 mt-1">Government Remittance Summary</h1>
      <p class="text-sm text-ink-400 mt-1">Figures HR needs for SSS, PhilHealth, Pag-IBIG, and BIR Form 1601-C filings.</p>
    </header>

    <UiCard class="mb-6">
      <div class="grid sm:grid-cols-3 gap-4">
        <UiInput v-model="from" type="date" label="From" />
        <UiInput v-model="to" type="date" label="To" />
        <div class="flex items-end">
          <UiButton class="w-full" :loading="loading" @click="loadReport">Generate Report</UiButton>
        </div>
      </div>
      <p v-if="reportError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg mt-4">{{ reportError }}</p>
    </UiCard>

    <div v-if="report">
      <div class="flex justify-end mb-4">
        <UiButton variant="secondary" size="sm" @click="exportToExcel">⬇ Export to Excel</UiButton>
      </div>

      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <UiCard>
          <p class="text-xs text-ink-400 uppercase tracking-wide">SSS (EE + ER + EC)</p>
          <p class="font-display text-2xl text-brand-400 mt-2">{{ currency.format(sssTotal) }}</p>
          <p class="text-xs text-ink-500 mt-1">EE: {{ currency.format(report.totals.sssEmployee) }} · ER: {{ currency.format(report.totals.sssEmployer) }} · EC: {{ currency.format(report.totals.ecContribution) }}</p>
        </UiCard>
        <UiCard>
          <p class="text-xs text-ink-400 uppercase tracking-wide">PhilHealth (EE + ER)</p>
          <p class="font-display text-2xl text-brand-400 mt-2">{{ currency.format(philhealthTotal) }}</p>
          <p class="text-xs text-ink-500 mt-1">EE: {{ currency.format(report.totals.philhealthEmployee) }} · ER: {{ currency.format(report.totals.philhealthEmployer) }}</p>
        </UiCard>
        <UiCard>
          <p class="text-xs text-ink-400 uppercase tracking-wide">Pag-IBIG (EE + ER)</p>
          <p class="font-display text-2xl text-brand-400 mt-2">{{ currency.format(pagibigTotal) }}</p>
          <p class="text-xs text-ink-500 mt-1">EE: {{ currency.format(report.totals.pagibigEmployee) }} · ER: {{ currency.format(report.totals.pagibigEmployer) }}</p>
        </UiCard>
        <UiCard>
          <p class="text-xs text-ink-400 uppercase tracking-wide">BIR Withholding Tax</p>
          <p class="font-display text-2xl text-brand-400 mt-2">{{ currency.format(report.totals.withholdingTax) }}</p>
          <p class="text-xs text-ink-500 mt-1">For Form 1601-C</p>
        </UiCard>
      </div>

      <UiCard class="mb-6">
        <div class="flex justify-between text-sm">
          <span class="text-ink-300">Total gross pay</span>
          <span class="font-medium text-ink-50">{{ currency.format(report.totals.grossPay) }}</span>
        </div>
        <div class="flex justify-between text-sm mt-2">
          <span class="text-ink-300">Total net pay</span>
          <span class="font-medium text-ink-50">{{ currency.format(report.totals.netPay) }}</span>
        </div>
        <div class="flex justify-between text-sm mt-2">
          <span class="text-ink-300">Total reimbursements</span>
          <span class="font-medium text-ink-50">{{ currency.format(report.totals.totalReimbursements) }}</span>
        </div>
        <div class="flex justify-between text-sm mt-2">
          <span class="text-ink-300">Payslip records included</span>
          <span class="font-medium text-ink-50">{{ report.recordCount }}</span>
        </div>
      </UiCard>

      <UiCard :padded="false">
        <h2 class="font-display text-lg text-ink-50 px-5 pt-5 pb-3">Per-Employee Breakdown</h2>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-sand-200">
              <th class="px-5 py-3">Employee</th>
              <th class="px-5 py-3">SSS</th>
              <th class="px-5 py-3">PhilHealth</th>
              <th class="px-5 py-3">Pag-IBIG</th>
              <th class="px-5 py-3">Tax</th>
              <th class="px-5 py-3">Reimbursements</th>
              <th class="px-5 py-3">Net Pay</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-sand-200">
            <tr v-for="row in report.byEmployee" :key="row.employee._id">
              <td class="px-5 py-3 text-ink-100 font-medium">{{ row.employee.firstName }} {{ row.employee.lastName }}</td>
              <td class="px-5 py-3 text-ink-300">{{ currency.format(row.sssEmployee) }}</td>
              <td class="px-5 py-3 text-ink-300">{{ currency.format(row.philhealthEmployee) }}</td>
              <td class="px-5 py-3 text-ink-300">{{ currency.format(row.pagibigEmployee) }}</td>
              <td class="px-5 py-3 text-ink-300">{{ currency.format(row.withholdingTax) }}</td>
              <td class="px-5 py-3 text-ink-300">{{ currency.format(row.totalReimbursements) }}</td>
              <td class="px-5 py-3 font-semibold text-ink-50">{{ currency.format(row.netPay) }}</td>
            </tr>
          </tbody>
        </table>
      </UiCard>
    </div>
  </div>
</template>

<script setup>
import dayjs from 'dayjs'

definePageMeta({ layout: 'default' })
const currency = useCurrency()

const from = ref(dayjs().startOf('month').format('YYYY-MM-DD'))
const to = ref(dayjs().endOf('month').format('YYYY-MM-DD'))
const report = ref(null)
const loading = ref(false)

const sssTotal = computed(() => (report.value ? report.value.totals.sssEmployee + report.value.totals.sssEmployer + report.value.totals.ecContribution : 0))
const philhealthTotal = computed(() => (report.value ? report.value.totals.philhealthEmployee + report.value.totals.philhealthEmployer : 0))
const pagibigTotal = computed(() => (report.value ? report.value.totals.pagibigEmployee + report.value.totals.pagibigEmployer : 0))

const reportError = ref('')

async function loadReport() {
  loading.value = true
  reportError.value = ''
  try {
    report.value = await $fetch('/api/reports/remittance', { query: { from: from.value, to: to.value } })
  } catch (err) {
    reportError.value = err?.data?.statusMessage || 'Failed to generate report.'
  } finally {
    loading.value = false
  }
}

await loadReport()

async function exportToExcel() {
  if (!report.value) return

  // Loaded on demand rather than at the top of the file, so the xlsx library
  // (and its dependencies) aren't bundled into every page's initial JS payload —
  // only fetched when someone actually clicks Export.
  const XLSX = await import('xlsx')

  const t = report.value.totals
  const periodLabel = `${dayjs(from.value).format('MMM D, YYYY')} – ${dayjs(to.value).format('MMM D, YYYY')}`

  // --- Sheet 1: Summary totals, formatted for filing prep ---
  const summaryRows = [
    ['BM Global Ventures Inc. — Government Remittance Summary'],
    [`Period: ${periodLabel}`],
    [],
    ['Agency', 'Employee Share', 'Employer Share', 'EC / Other', 'Total'],
    ['SSS', t.sssEmployee, t.sssEmployer, t.ecContribution, round2(t.sssEmployee + t.sssEmployer + t.ecContribution)],
    ['PhilHealth', t.philhealthEmployee, t.philhealthEmployer, 0, round2(t.philhealthEmployee + t.philhealthEmployer)],
    ['Pag-IBIG', t.pagibigEmployee, t.pagibigEmployer, 0, round2(t.pagibigEmployee + t.pagibigEmployer)],
    ['BIR Withholding Tax', t.withholdingTax, 0, 0, t.withholdingTax],
    [],
    ['Total gross pay', '', '', '', t.grossPay],
    ['Total reimbursements', '', '', '', t.totalReimbursements],
    ['Total net pay', '', '', '', t.netPay],
    ['Payslip records included', '', '', '', report.value.recordCount]
  ]
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)
  summarySheet['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 16 }]

  // --- Sheet 2: Per-employee breakdown ---
  const employeeHeader = ['Employee No.', 'Employee Name', 'SSS', 'PhilHealth', 'Pag-IBIG', 'Withholding Tax', 'Reimbursements', 'Gross Pay', 'Net Pay']
  const employeeRows = report.value.byEmployee.map((row) => [
    row.employee.employeeNumber || '',
    `${row.employee.firstName} ${row.employee.lastName}`,
    row.sssEmployee,
    row.philhealthEmployee,
    row.pagibigEmployee,
    row.withholdingTax,
    row.totalReimbursements,
    row.grossPay,
    row.netPay
  ])
  const employeeSheet = XLSX.utils.aoa_to_sheet([employeeHeader, ...employeeRows])
  employeeSheet['!cols'] = [
    { wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
  XLSX.utils.book_append_sheet(workbook, employeeSheet, 'Per-Employee Breakdown')

  const filename = `BMGV-Remittance-${dayjs(from.value).format('YYYY-MM-DD')}_to_${dayjs(to.value).format('YYYY-MM-DD')}.xlsx`
  XLSX.writeFile(workbook, filename)
}

function round2(n) {
  return Math.round(n * 100) / 100
}
</script>
