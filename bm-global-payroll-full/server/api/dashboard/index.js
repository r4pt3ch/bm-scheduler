import Employee from '~/server/models/Employee'
import LeaveRequest from '~/server/models/LeaveRequest'
import PayrollRecord from '~/server/models/PayrollRecord'
import AppSetting from '~/server/models/AppSetting'
import { requireAuth } from '~/server/utils/auth'
import dayjs from 'dayjs'

const DEFAULT_DAY1 = 15
const DEFAULT_DAY2 = 30

// A cutoff day of 29/30/31 needs to fall back to the last real day of
// shorter months (e.g. "30th" in February means the 28th/29th).
function clampDayToMonth(day, year, month) {
  const daysInMonth = dayjs(new Date(year, month + 1, 0)).date()
  return Math.min(day, daysInMonth)
}

// Builds the actual cutoff dates for the month before, current, and after —
// enough range to reliably find "the most recent cutoff that's already
// passed" and "the next one coming up" from any point in the current month.
function getCutoffDatesAround(day1, day2, referenceDate) {
  const dates = []
  for (let offset = -1; offset <= 1; offset++) {
    const monthDate = referenceDate.add(offset, 'month')
    const year = monthDate.year()
    const month = monthDate.month()
    for (const day of [day1, day2]) {
      const clamped = clampDayToMonth(day, year, month)
      dates.push(dayjs(new Date(year, month, clamped)).startOf('day'))
    }
  }
  return dates.sort((a, b) => a.valueOf() - b.valueOf())
}

function computeCutoffDueInfo(day1, day2, lastGeneratedAt) {
  const today = dayjs().startOf('day')
  const cutoffDates = getCutoffDatesAround(day1, day2, today)

  const pastOrToday = cutoffDates.filter((d) => !d.isAfter(today))
  const mostRecentCutoff = pastOrToday.length ? pastOrToday[pastOrToday.length - 1] : null

  const future = cutoffDates.filter((d) => d.isAfter(today))
  const nextCutoff = future.length ? future[0] : null

  const last = lastGeneratedAt ? dayjs(lastGeneratedAt).startOf('day') : null
  // Overdue means: the most recent cutoff has come and gone, and payroll
  // hasn't been generated since (or ever).
  const isOverdue = !!mostRecentCutoff && (!last || last.isBefore(mostRecentCutoff))

  return {
    lastGeneratedAt,
    mostRecentCutoff: mostRecentCutoff ? mostRecentCutoff.toISOString() : null,
    nextCutoff: nextCutoff ? nextCutoff.toISOString() : null,
    daysUntilNextCutoff: nextCutoff ? nextCutoff.diff(today, 'day') : null,
    daysOverdue: isOverdue && mostRecentCutoff ? today.diff(mostRecentCutoff, 'day') : 0,
    isOverdue
  }
}

// Reminder #1: the company-wide "all active employees" payroll cycle.
// Tracked via an explicit timestamp set only when a true all-employees run
// happens (see server/api/payroll/generate.post.js), so it isn't skewed by
// one-off individual runs.
async function buildAllEmployeesReminder(day1, day2) {
  const setting = await AppSetting.findOne({ key: 'last_all_employees_payroll_run_at' })
  const lastGeneratedAt = setting?.value || null
  return { day1, day2, ...computeCutoffDueInfo(day1, day2, lastGeneratedAt) }
}

// Reminder #2: per-employee — flags any active employee whose own most recent
// payroll record (any status) predates the most recent cutoff, or who has
// never had one generated at all.
async function buildPerEmployeeReminder(day1, day2) {
  const activeEmployees = await Employee.find({ status: 'active', role: { $ne: 'super_admin' } })
    .select('firstName lastName')
    .lean()

  const lastRecords = await PayrollRecord.aggregate([
    { $match: { employee: { $in: activeEmployees.map((e) => e._id) } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$employee', lastGeneratedAt: { $first: '$createdAt' } } }
  ])
  const lastByEmployee = new Map(lastRecords.map((r) => [r._id.toString(), r.lastGeneratedAt]))

  const overdue = []
  for (const emp of activeEmployees) {
    const lastGeneratedAt = lastByEmployee.get(emp._id.toString()) || null
    const info = computeCutoffDueInfo(day1, day2, lastGeneratedAt)
    if (info.isOverdue) {
      overdue.push({
        employeeId: emp._id,
        name: `${emp.firstName} ${emp.lastName}`,
        lastGeneratedAt,
        daysOverdue: info.daysOverdue
      })
    }
  }
  overdue.sort((a, b) => b.daysOverdue - a.daysOverdue)

  return {
    day1,
    day2,
    totalActive: activeEmployees.length,
    overdueCount: overdue.length,
    overdue: overdue.slice(0, 10) // cap the list; overdueCount still reflects the true total
  }
}

export default defineEventHandler(async (event) => {
  const session = requireAuth(event)
  await connectDB()

  if (session.role === 'admin' || session.role === 'super_admin') {
    const scheduleSetting = await AppSetting.findOne({ key: 'payroll_reminder_days' })
    const day1 = scheduleSetting?.value?.day1 || DEFAULT_DAY1
    const day2 = scheduleSetting?.value?.day2 || DEFAULT_DAY2

    const [activeEmployees, pendingLeaves, recentRuns, allEmployeesReminder, perEmployeeReminder] = await Promise.all([
      Employee.countDocuments({ status: 'active' }),
      LeaveRequest.countDocuments({ status: 'pending' }),
      PayrollRecord.find().sort({ createdAt: -1 }).limit(5).populate('employee', 'firstName lastName'),
      buildAllEmployeesReminder(day1, day2),
      buildPerEmployeeReminder(day1, day2)
    ])

    const monthStart = dayjs().startOf('month').toDate()
    const monthRecords = await PayrollRecord.find({
      periodStart: { $gte: monthStart },
      status: { $ne: 'cancelled' }
    })
    const totalPayrollThisMonth = monthRecords.reduce((sum, r) => sum + r.netPay, 0)
    const totalEmployerContributionsThisMonth = monthRecords.reduce(
      (sum, r) =>
        sum +
        (r.employerContributions?.sssEmployer || 0) +
        (r.employerContributions?.philhealthEmployer || 0) +
        (r.employerContributions?.pagibigEmployer || 0) +
        (r.employerContributions?.ecContribution || 0),
      0
    )

    return {
      role: 'admin',
      activeEmployees,
      pendingLeaves,
      recentRuns,
      allEmployeesReminder,
      perEmployeeReminder,
      totalPayrollThisMonth: Math.round(totalPayrollThisMonth * 100) / 100,
      totalEmployerContributionsThisMonth: Math.round(totalEmployerContributionsThisMonth * 100) / 100
    }
  }

  // Employee dashboard: their own latest payslip + leave balance
  const [employee, latestPayslip, pendingLeaves] = await Promise.all([
    Employee.findById(session.id),
    PayrollRecord.findOne({ employee: session.id, status: { $nin: ['draft', 'cancelled'] } }).sort({ periodStart: -1 }),
    LeaveRequest.countDocuments({ employee: session.id, status: 'pending' })
  ])

  return {
    role: 'employee',
    leaveCredits: employee?.leaveCredits,
    latestPayslip,
    pendingLeaves
  }
})
