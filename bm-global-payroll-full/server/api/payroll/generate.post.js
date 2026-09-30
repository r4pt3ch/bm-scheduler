import Employee from '~/server/models/Employee'
import Attendance from '~/server/models/Attendance'
import PayrollRecord from '~/server/models/PayrollRecord'
import AppSetting from '~/server/models/AppSetting'
import { computePayroll, compute13thMonthPay, round2, phDateKey } from '~/server/utils/payrollEngine'
import { requireAdmin } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/auditLog'
import dayjs from 'dayjs'

// POST /api/payroll/generate
// body: { periodStart, periodEnd, payDate, cutoff, employeeIds?: [], includeThirteenthMonth?: bool }
// Generates (or regenerates, while in draft) payroll records for the given cutoff.
export default defineEventHandler(async (event) => {
  const session = requireAdmin(event)
  await connectDB()

  const body = await readBody(event)
  const { periodStart, periodEnd, payDate, cutoff, employeeIds, includeThirteenthMonth, reimbursements, includeSSS, includePhilHealth, includePagIbig, includeWithholdingTax, otherDeduction } = body

  if (!periodStart || !periodEnd || !payDate || !cutoff) {
    throw createError({ statusCode: 400, statusMessage: 'periodStart, periodEnd, payDate, and cutoff are required' })
  }

  // Reimbursements are employee-specific, so they only make sense when generating
  // for exactly one employee — applying the same reimbursement to a bulk run would
  // silently give it to everyone, which is never what's intended.
  if (Array.isArray(reimbursements) && reimbursements.length > 0 && (!Array.isArray(employeeIds) || employeeIds.length !== 1)) {
    throw createError({ statusCode: 400, statusMessage: 'Reimbursements can only be added when generating payroll for a single employee' })
  }

  // Other deduction is a single flat, labeled, ad-hoc amount — unlike
  // reimbursements it's allowed on bulk runs too (e.g. deducting a uniform
  // amount from everyone for a shared expense), applied identically to every
  // employee included in this run.
  const cleanOtherDeduction =
    otherDeduction && otherDeduction.description?.trim() && Number(otherDeduction.amount) > 0
      ? { description: otherDeduction.description.trim(), amount: round2(Number(otherDeduction.amount)) }
      : null

  // Each defaults true — matches the original, only behavior. Explicitly false
  // is what an admin sends to exclude that specific deduction for this run.
  const applySSS = includeSSS !== false
  const applyPhilHealth = includePhilHealth !== false
  const applyPagIbig = includePagIbig !== false
  const applyWithholdingTax = includeWithholdingTax !== false

  const start = dayjs(periodStart)
  const end = dayjs(periodEnd)

  // A run with no explicit employeeIds targets every active employee — that's
  // the "company payroll cycle" signal the dashboard's all-employees reminder
  // tracks. A run scoped to specific employeeIds (even if it happens to cover
  // everyone by coincidence) is treated as an individual/targeted run instead,
  // since that's what the admin actually intended.
  const isAllEmployeesRun = !Array.isArray(employeeIds) || employeeIds.length === 0

  // Super admin accounts never get payroll generated for them — even if their
  // ID is explicitly passed in employeeIds. This is a deliberate role-based
  // exclusion, not just a default — Super Admin is treated as a systems/IT
  // account, not a paid employee role.
  const employeeFilter = { status: 'active', role: { $ne: 'super_admin' } }
  if (Array.isArray(employeeIds) && employeeIds.length > 0) {
    employeeFilter._id = { $in: employeeIds }
  }
  const employees = await Employee.find(employeeFilter)

  if (employees.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No active employees matched for this run' })
  }

  const runLabel = `${start.format('MMM D')}–${end.format('D, YYYY')} (${cutoff} cutoff)`
  const results = []
  const errors = []
  const warnings = []

  for (const employee of employees) {
    try {
      // Prevent double-paying the same employee for an overlapping period.
      // A cancelled record does NOT block regeneration — that's the point of
      // cancelling: it frees up the period to be redone correctly. The
      // findOneAndUpdate below will reuse and overwrite the cancelled record
      // (resetting it back to 'draft' with freshly computed numbers) rather
      // than creating a second, conflicting record for the same period.
      const existing = await PayrollRecord.findOne({
        employee: employee._id,
        periodStart: start.toDate(),
        periodEnd: end.toDate()
      })
      if (existing && existing.status !== 'draft' && existing.status !== 'cancelled') {
        errors.push({
          employee: employee.fullName,
          reason: `Already ${existing.status} for this exact period — skipped so it isn't silently changed. Cancel that record first if it needs to be recomputed with updated attendance.`
        })
        continue
      }

      // Query a day either side, then keep records whose Philippine calendar
      // date falls inside the period — so the first/last day is never lost to
      // a UTC-vs-Manila midnight difference in how the date was stored.
      const periodStartKey = phDateKey(start.toDate())
      const periodEndKey = phDateKey(end.toDate())
      const attendanceRecords = (
        await Attendance.find({
          employee: employee._id,
          date: { $gte: start.subtract(1, 'day').toDate(), $lte: end.add(1, 'day').toDate() }
        })
      ).filter((r) => {
        const key = phDateKey(r.date)
        return key >= periodStartKey && key <= periodEndKey
      })

      if (attendanceRecords.length === 0) {
        warnings.push({
          employee: employee.fullName,
          reason: `No attendance records found between ${start.format('MMM D, YYYY')} and ${end.format('MMM D, YYYY')} — the entire period was computed as unpaid (no-work). Enter attendance for this period if the employee actually worked, then regenerate.`
        })
      }

      let thirteenthMonthPayout = 0
      if (includeThirteenthMonth) {
        // Simplified: 1/12 of current monthly basic salary released this run.
        // A full implementation would sum actual basic pay earned across the calendar year.
        thirteenthMonthPayout = compute13thMonthPay(employee.basicSalary * 12)
      }

      // Every day is valued at its own month's rate (monthly salary ÷ Mon–Sat
      // days in that month) and only days marked worked/paid earn anything —
      // see computeDailyPay in server/utils/payrollEngine.js. The engine also
      // returns the day-by-day breakdown, so the payslip trail and the totals
      // always come from the same computation.
      const computed = computePayroll({
        basicSalary: employee.basicSalary,
        payFrequency: employee.payFrequency,
        attendanceRecords,
        periodStart: start.toDate(),
        periodEnd: end.toDate(),
        taxableAllowance: (employee.allowances?.taxableAllowance || 0) / (employee.payFrequency === 'semi-monthly' ? 2 : 1),
        deMinimis: (employee.allowances?.deMinimis || 0) / (employee.payFrequency === 'semi-monthly' ? 2 : 1),
        thirteenthMonthPayout,
        customDeductions: employee.customDeductions || [],
        otherDeductions: cleanOtherDeduction ? cleanOtherDeduction.amount : 0,
        includeSSS: applySSS,
        includePhilHealth: applyPhilHealth,
        includePagIbig: applyPagIbig,
        includeWithholdingTax: applyWithholdingTax
      })

      if (computed.attendanceSummary.noWorkDays > 0 && attendanceRecords.length > 0) {
        warnings.push({
          employee: employee.fullName,
          reason: `${computed.attendanceSummary.noWorkDays} of ${computed.attendanceSummary.scheduledDays} Mon–Sat day(s) in this period are No Work or have no attendance entered, so they were not paid. Mark them Present (or the right day type) and regenerate if the employee worked.`
        })
      }

      // With no compensable work the engine skips all deductions (so net pay
      // can't go negative) — the labeled other-deduction line must match that.
      const otherDeductionApplied = cleanOtherDeduction && computed.meta.hasCompensableWork ? cleanOtherDeduction : null

      // Reimbursements are non-taxable and don't affect gross pay or any statutory
      // contribution base — they're added straight onto net pay.
      const cleanReimbursements = Array.isArray(reimbursements)
        ? reimbursements
            .filter((r) => r.description?.trim() && Number(r.amount) > 0)
            .map((r) => ({ description: r.description.trim(), amount: Number(r.amount) }))
        : []
      const totalReimbursements = cleanReimbursements.reduce((sum, r) => sum + r.amount, 0)

      const record = await PayrollRecord.findOneAndUpdate(
        { employee: employee._id, periodStart: start.toDate(), periodEnd: end.toDate() },
        {
          employee: employee._id,
          periodStart: start.toDate(),
          periodEnd: end.toDate(),
          payDate: dayjs(payDate).toDate(),
          cutoff,
          runLabel,
          basicSalarySnapshot: employee.basicSalary,
          governmentDeductionsIncluded: {
            sss: applySSS,
            philHealth: applyPhilHealth,
            pagIbig: applyPagIbig,
            withholdingTax: applyWithholdingTax
          },
          attendanceSummary: computed.attendanceSummary,
          dailyBreakdown: computed.dailyBreakdown,
          rateBasis: computed.rateBasis,
          earnings: computed.earnings,
          deductions: computed.deductions,
          // Stored separately (not just relying on deductions.otherDeductions,
          // which internally combines this with itemized customDeductionsApplied)
          // so the payslip can always show this specific labeled line, even
          // when the employee also has custom deductions applied.
          otherDeductionDescription: otherDeductionApplied ? otherDeductionApplied.description : '',
          otherDeductionAmount: otherDeductionApplied ? otherDeductionApplied.amount : 0,
          employerContributions: computed.employerContributions,
          reimbursements: cleanReimbursements,
          totalReimbursements,
          netPay: computed.netPay + totalReimbursements,
          status: 'draft',
          generatedBy: session.id,
          // Clear any stale cancellation metadata in case this period was
          // previously cancelled and is now being regenerated fresh.
          cancelledAt: null,
          cancelledBy: null,
          cancellationReason: '',
          statusBeforeCancellation: null
        },
        { upsert: true, new: true }
      )

      results.push(record)
    } catch (err) {
      errors.push({ employee: employee.fullName, reason: err.message })
    }
  }

  // Logged as one summarized entry for the whole run rather than one per
  // employee — generating payroll is conceptually a single admin action.
  await logAudit(event, {
    action: 'payroll.generate',
    resourceType: 'PayrollRecord',
    meta: {
      runLabel,
      periodStart: start.toDate(),
      periodEnd: end.toDate(),
      cutoff,
      isAllEmployeesRun,
      governmentDeductionsIncluded: {
        sss: applySSS,
        philHealth: applyPhilHealth,
        pagIbig: applyPagIbig,
        withholdingTax: applyWithholdingTax
      },
      otherDeduction: cleanOtherDeduction,
      rateMethod: 'monthly-rate-mon-sat',
      generated: results.length,
      skipped: errors.length,
      noAttendanceFound: warnings.length,
      totalNetPay: results.reduce((sum, r) => sum + r.netPay, 0),
      totalReimbursements: results.reduce((sum, r) => sum + (r.totalReimbursements || 0), 0)
    }
  })

  // Track "all active employees" runs separately from individual/targeted
  // ones, so the dashboard's company-wide reminder isn't skewed by someone
  // generating payroll for just one person mid-cycle.
  if (isAllEmployeesRun && results.length > 0) {
    await AppSetting.findOneAndUpdate(
      { key: 'last_all_employees_payroll_run_at' },
      { key: 'last_all_employees_payroll_run_at', value: new Date().toISOString() },
      { upsert: true }
    )
  }

  return { generated: results.length, records: results, errors, warnings }
})
