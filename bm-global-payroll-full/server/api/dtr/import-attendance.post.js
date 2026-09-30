import DtrEntry from '~/server/models/DtrEntry'
import Attendance from '~/server/models/Attendance'
import AppSetting from '~/server/models/AppSetting'
import Employee from '~/server/models/Employee'
import { requireAdmin } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/auditLog'
import dayjs from 'dayjs'

// POST /api/dtr/import-attendance
// body: { from, to, preview: true|false }
// Converts DTR punch records into Attendance records for a date range.
// Pass preview: true to see what would be created/updated without saving.
// Pass preview: false to actually write the Attendance records.
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await connectDB()

  const body = await readBody(event)
  const from = dayjs(body?.from).startOf('day')
  const to = dayjs(body?.to).startOf('day')
  const preview = body?.preview !== false // default to preview mode for safety

  if (!from.isValid() || !to.isValid()) {
    throw createError({ statusCode: 400, statusMessage: 'from and to dates are required' })
  }
  if (to.isBefore(from)) {
    throw createError({ statusCode: 400, statusMessage: 'to must be on or after from' })
  }

  const [startSetting, endSetting] = await Promise.all([
    AppSetting.findOne({ key: 'work_start_time' }),
    AppSetting.findOne({ key: 'work_end_time' })
  ])
  const startTime = startSetting?.value || '09:00'
  const endTime = endSetting?.value || '18:00'
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)

  // Fetch all DTR entries in range
  const dtrEntries = await DtrEntry.find({
    date: { $gte: from.toDate(), $lte: to.toDate() }
  }).populate('employee', 'firstName lastName employeeNumber status role')

  const results = []

  for (const entry of dtrEntries) {
    if (!entry.employee || entry.employee.status === 'separated') continue
    if (entry.employee.role === 'super_admin') continue
    if (!entry.punches || entry.punches.length === 0) continue

    const entryDate = dayjs(entry.date)
    const officialStart = entryDate.hour(startH).minute(startM).second(0).toDate()
    const officialEnd = entryDate.hour(endH).minute(endM).second(0).toDate()

    const firstIn = entry.punches.find((p) => p.type === 'in')
    const allPunches = [...entry.punches].reverse()
    const lastOut = allPunches.find((p) => p.type === 'out')

    let lateMinutes = 0
    if (firstIn && new Date(firstIn.at) > officialStart) {
      lateMinutes = Math.round((new Date(firstIn.at) - officialStart) / 60000)
    }

    let undertimeMinutes = 0
    if (lastOut && new Date(lastOut.at) < officialEnd) {
      undertimeMinutes = Math.round((officialEnd - new Date(lastOut.at)) / 60000)
    }

    const hoursWorked = entry.computeHoursWorked()

    const attendanceData = {
      employee: entry.employee._id,
      date: entry.date,
      status: 'present',
      lateMinutes,
      undertimeMinutes,
      expectedDays: 1,
      absences: 0,
      overtimeHours: 0,
      leaveDaysPaid: 0,
      leaveDaysUnpaid: 0
    }

    const existingAttendance = await Attendance.findOne({
      employee: entry.employee._id,
      date: entry.date
    })

    results.push({
      employee: {
        _id: entry.employee._id,
        name: `${entry.employee.firstName} ${entry.employee.lastName}`,
        employeeNumber: entry.employee.employeeNumber
      },
      date: entry.date,
      firstIn: firstIn?.at || null,
      lastOut: lastOut?.at || null,
      lateMinutes,
      undertimeMinutes,
      hoursWorked,
      willCreate: !existingAttendance,
      willOverwrite: !!existingAttendance,
      attendanceData
    })

    if (!preview) {
      await Attendance.findOneAndUpdate(
        { employee: entry.employee._id, date: entry.date },
        { $set: { status: 'present', lateMinutes, undertimeMinutes } },
        {
          upsert: true,
          setDefaultsOnInsert: true
        }
      )
    }
  }

  if (!preview) {
    await logAudit(event, {
      action: 'dtr.attendance_import',
      resourceType: 'Attendance',
      meta: {
        from: from.toDate(),
        to: to.toDate(),
        recordsProcessed: results.length,
        created: results.filter((r) => r.willCreate).length,
        overwritten: results.filter((r) => r.willOverwrite).length
      }
    })
  }

  return {
    preview,
    from: from.toDate(),
    to: to.toDate(),
    workStartTime: startTime,
    workEndTime: endTime,
    recordCount: results.length,
    willCreate: results.filter((r) => r.willCreate).length,
    willOverwrite: results.filter((r) => r.willOverwrite).length,
    results
  }
})
