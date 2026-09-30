import Attendance from '~/server/models/Attendance'
import { requireAuth } from '~/server/utils/auth'

// Aggregates attendance for one employee over a date range into the shape
// the payroll engine expects: { absences, lateMinutes, undertimeMinutes, overtimeHours, leaveDaysPaid, leaveDaysUnpaid }
export default defineEventHandler(async (event) => {
  requireAuth(event)
  await connectDB()

  const query = getQuery(event)
  const { employee, from, to } = query

  if (!employee || !from || !to) {
    throw createError({ statusCode: 400, statusMessage: 'employee, from, and to are required' })
  }

  const records = await Attendance.find({
    employee,
    date: { $gte: new Date(from), $lte: new Date(to) }
  })

  const summary = {
    absences: 0,
    noWorkDays: 0,
    lateMinutes: 0,
    undertimeMinutes: 0,
    overtimeHours: 0, // total OT hours across all day types, kept for backward compatibility
    halfDayHoursShort: 0,
    ordinaryOvertimeHours: 0,
    restDayHoursWorked: 0,
    restDayOvertimeHours: 0,
    specialDayHoursWorked: 0,
    specialDayOvertimeHours: 0,
    holidayHoursWorked: 0,
    holidayOvertimeHours: 0,
    leaveDaysPaid: 0,
    leaveDaysUnpaid: 0
  }

  for (const r of records) {
    summary.lateMinutes += r.lateMinutes || 0
    summary.undertimeMinutes += r.undertimeMinutes || 0
    summary.overtimeHours += r.overtimeHours || 0

    if (r.status === 'absent') {
      summary.absences += 1
    } else if (r.status === 'no-work') {
      summary.noWorkDays += 1
    } else if (r.status === 'half-day') {
      const hoursPresent = r.hoursWorked ?? 4
      summary.halfDayHoursShort += Math.max(0, 8 - hoursPresent)
    } else if (r.status === 'rest-day') {
      summary.restDayHoursWorked += r.hoursWorked || 0
      summary.restDayOvertimeHours += r.overtimeHours || 0
    } else if (r.status === 'special-non-working-day') {
      summary.specialDayHoursWorked += r.hoursWorked || 0
      summary.specialDayOvertimeHours += r.overtimeHours || 0
    } else if (r.status === 'regular-holiday') {
      summary.holidayHoursWorked += r.hoursWorked || 0
      summary.holidayOvertimeHours += r.overtimeHours || 0
    } else if (r.status === 'leave') {
      if (r.leaveType === 'unpaid') summary.leaveDaysUnpaid += 1
      else summary.leaveDaysPaid += 1
    } else {
      summary.ordinaryOvertimeHours += r.overtimeHours || 0
    }
  }

  return { summary, recordCount: records.length }
})
