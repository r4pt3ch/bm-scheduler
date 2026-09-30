import DtrEntry from '~/server/models/DtrEntry'
import Attendance from '~/server/models/Attendance'
import AppSetting from '~/server/models/AppSetting'
import dayjs from 'dayjs'

/**
 * Records a DTR punch for the given employee (in or out) for today.
 * After a successful punch, auto-syncs to the Attendance model if the
 * DTR→Attendance auto-sync setting is enabled.
 *
 * @param {Object} employee - Mongoose Employee document
 * @param {'in'|'out'} type
 * @returns {{ entry, currentlyIn, hoursWorkedToday, punchTime }}
 */
export async function recordPunch(employee, type) {
  const today = dayjs().startOf('day').toDate()
  let entry = await DtrEntry.findOne({ employee: employee._id, date: today })
  if (!entry) {
    entry = new DtrEntry({ employee: employee._id, date: today, punches: [] })
  }

  const lastPunch = entry.punches[entry.punches.length - 1]
  const currentlyIn = lastPunch?.type === 'in'

  if (type === 'in' && currentlyIn) {
    throw createError({ statusCode: 400, statusMessage: `${employee.firstName} is already clocked in — clock out first.` })
  }
  if (type === 'out' && !currentlyIn) {
    throw createError({ statusCode: 400, statusMessage: `${employee.firstName} is not currently clocked in.` })
  }

  const punchTime = new Date()
  entry.punches.push({ type, at: punchTime })
  await entry.save()

  // --- Auto-sync to Attendance ---
  // Only applies on clock-in (that's when we know the employee is present
  // for the day — clock-out just updates late/undertime minutes if available).
  const autoSyncSetting = await AppSetting.findOne({ key: 'dtr_attendance_auto_sync' })
  if (autoSyncSetting?.value === true) {
    await syncPunchToAttendance(employee, entry, type, punchTime)
  }

  return {
    entry,
    currentlyIn: type === 'in',
    hoursWorkedToday: entry.computeHoursWorked(),
    punchTime
  }
}

/**
 * Derives Attendance fields from the DTR entry and upserts the Attendance
 * record for today. Only updates the fields it can confidently compute
 * from punches — doesn't touch things like overtime that admins enter manually.
 */
async function syncPunchToAttendance(employee, dtrEntry, punchType, punchTime) {
  try {
    const today = dayjs().startOf('day').toDate()

    // Fetch configured work schedule settings (start/end times)
    const [startSetting, endSetting] = await Promise.all([
      AppSetting.findOne({ key: 'work_start_time' }),
      AppSetting.findOne({ key: 'work_end_time' })
    ])

    const startTime = startSetting?.value || '09:00'
    const endTime = endSetting?.value || '18:00'

    // Parse configured times as today's Date objects
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    const officialStart = dayjs().hour(startH).minute(startM).second(0).toDate()
    const officialEnd = dayjs().hour(endH).minute(endM).second(0).toDate()

    // Determine late minutes from the first clock-in punch of the day
    const firstIn = dtrEntry.punches.find((p) => p.type === 'in')
    let lateMinutes = 0
    if (firstIn && new Date(firstIn.at) > officialStart) {
      lateMinutes = Math.round((new Date(firstIn.at) - officialStart) / 60000)
    }

    // Determine undertime from the last clock-out punch, if applicable
    let undertimeMinutes = 0
    const lastPunches = [...dtrEntry.punches].reverse()
    const lastOut = lastPunches.find((p) => p.type === 'out')
    if (lastOut && new Date(lastOut.at) < officialEnd) {
      undertimeMinutes = Math.round((officialEnd - new Date(lastOut.at)) / 60000)
    }

    // Only update fields we can reliably compute; leave admin-entered fields
    // (overtimeHours, absences, etc.) untouched. Use upsert so this works
    // even if no attendance record exists yet for today.
    await Attendance.findOneAndUpdate(
      { employee: employee._id, date: today },
      {
        $set: {
          status: 'present',
          lateMinutes,
          undertimeMinutes
        },
        $setOnInsert: {
          employee: employee._id,
          date: today,
          expectedDays: 1,
          absences: 0,
          overtimeHours: 0,
          leaveDaysPaid: 0,
          leaveDaysUnpaid: 0
        }
      },
      { upsert: true, new: true }
    )
  } catch (err) {
    // Auto-sync is best-effort — a failure here should NOT block the punch
    // itself from succeeding. Log the error but let the punch go through.
    console.error('[dtr-auto-sync] Failed to sync punch to Attendance:', err.message)
  }
}
