import Attendance from '~/server/models/Attendance'
import { requireAuth, requireAdmin } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/auditLog'

export default defineEventHandler(async (event) => {
  await connectDB()
  const method = event.method

  if (method === 'GET') {
    const session = requireAuth(event)
    const query = getQuery(event)
    const filter = {}

    if (session.role !== 'admin' && session.role !== 'super_admin') {
      filter.employee = session.id
    } else if (query.employee) {
      filter.employee = query.employee
    }

    if (query.from || query.to) {
      filter.date = {}
      if (query.from) filter.date.$gte = new Date(query.from)
      if (query.to) filter.date.$lte = new Date(query.to)
    }

    const records = await Attendance.find(filter).sort({ date: -1 }).populate('employee', 'firstName lastName employeeNumber')
    return { records }
  }

  if (method === 'POST') {
    const session = requireAdmin(event)
    const body = await readBody(event)

    // Support both single-record and bulk array payloads for cutoff entry
    const entries = Array.isArray(body) ? body : [body]

    const results = []
    for (const entry of entries) {
      if (!entry.employee || !entry.date) {
        continue
      }
      const record = await Attendance.findOneAndUpdate(
        { employee: entry.employee, date: new Date(entry.date) },
        { ...entry, date: new Date(entry.date), recordedBy: session.id },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      results.push(record)
    }

    // Logged as one summarized entry rather than one per day — a cutoff entry
    // is conceptually a single action, and logging every individual day would
    // flood the audit trail without adding much signal.
    await logAudit(event, {
      action: 'attendance.bulk_update',
      resourceType: 'Attendance',
      meta: {
        recordCount: results.length,
        employeeIds: [...new Set(results.map((r) => r.employee.toString()))],
        dateRange:
          results.length > 0
            ? { from: results[results.length - 1].date, to: results[0].date }
            : null
      }
    })

    return { records: results }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
