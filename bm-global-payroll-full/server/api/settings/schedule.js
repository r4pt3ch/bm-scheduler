import AppSetting from '~/server/models/AppSetting'
import { requireAdmin } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/auditLog'

// GET  /api/settings/schedule — fetch current schedule settings
// POST /api/settings/schedule — save schedule settings (admin only)
export default defineEventHandler(async (event) => {
  await connectDB()

  if (event.method === 'GET') {
    requireAdmin(event)
    const [startSetting, endSetting, syncSetting] = await Promise.all([
      AppSetting.findOne({ key: 'work_start_time' }),
      AppSetting.findOne({ key: 'work_end_time' }),
      AppSetting.findOne({ key: 'dtr_attendance_auto_sync' })
    ])
    return {
      workStart: startSetting?.value || '09:00',
      workEnd: endSetting?.value || '18:00',
      autoSync: syncSetting?.value === true
    }
  }

  if (event.method === 'POST') {
    const session = requireAdmin(event)
    const body = await readBody(event)

    const { workStart, workEnd, autoSync } = body

    // Basic time format validation (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/
    if (!timeRegex.test(workStart)) throw createError({ statusCode: 400, statusMessage: 'Invalid work start time format (use HH:MM)' })
    if (!timeRegex.test(workEnd)) throw createError({ statusCode: 400, statusMessage: 'Invalid work end time format (use HH:MM)' })

    await Promise.all([
      AppSetting.findOneAndUpdate({ key: 'work_start_time' }, { key: 'work_start_time', value: workStart }, { upsert: true }),
      AppSetting.findOneAndUpdate({ key: 'work_end_time' }, { key: 'work_end_time', value: workEnd }, { upsert: true }),
      AppSetting.findOneAndUpdate({ key: 'dtr_attendance_auto_sync' }, { key: 'dtr_attendance_auto_sync', value: !!autoSync }, { upsert: true })
    ])

    await logAudit(event, {
      action: 'settings.schedule_updated',
      resourceType: 'AppSetting',
      after: { workStart, workEnd, autoSync }
    })

    return { success: true, workStart, workEnd, autoSync }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
