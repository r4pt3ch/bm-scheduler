import AppSetting from '~/server/models/AppSetting'
import { requireAdmin } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/auditLog'

// GET  /api/settings/payroll-schedule — fetch the two monthly cutoff days
// POST /api/settings/payroll-schedule — update them (admin only)
//
// Days are stored as plain integers 1–31. A day of 29/30/31 automatically
// falls back to the last actual day of shorter months (e.g. 30 -> Feb 28) —
// that adjustment happens at read time in the dashboard, not here.
const DEFAULT_DAY1 = 15
const DEFAULT_DAY2 = 30

export default defineEventHandler(async (event) => {
  await connectDB()

  if (event.method === 'GET') {
    requireAdmin(event)
    const setting = await AppSetting.findOne({ key: 'payroll_reminder_days' })
    return {
      day1: setting?.value?.day1 || DEFAULT_DAY1,
      day2: setting?.value?.day2 || DEFAULT_DAY2
    }
  }

  if (event.method === 'POST') {
    requireAdmin(event)
    const body = await readBody(event)
    let day1 = Number(body.day1)
    let day2 = Number(body.day2)

    if (!Number.isInteger(day1) || day1 < 1 || day1 > 31 || !Number.isInteger(day2) || day2 < 1 || day2 > 31) {
      throw createError({ statusCode: 400, statusMessage: 'Both cutoff days must be whole numbers between 1 and 31' })
    }
    if (day1 === day2) {
      throw createError({ statusCode: 400, statusMessage: 'The two cutoff days must be different' })
    }
    // Store in ascending order for consistent display, regardless of input order.
    if (day1 > day2) [day1, day2] = [day2, day1]

    await AppSetting.findOneAndUpdate(
      { key: 'payroll_reminder_days' },
      { key: 'payroll_reminder_days', value: { day1, day2 } },
      { upsert: true }
    )

    await logAudit(event, {
      action: 'settings.payroll_schedule_updated',
      resourceType: 'AppSetting',
      after: { day1, day2 }
    })

    return { success: true, day1, day2 }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
