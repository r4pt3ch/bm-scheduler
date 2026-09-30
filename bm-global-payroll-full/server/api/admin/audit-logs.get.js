import AuditLog from '~/server/models/AuditLog'
import { requireSuperAdmin } from '~/server/utils/auth'

// GET /api/admin/audit-logs?action=&actor=&from=&to=&page=&pageSize=
// Super-admin-only. Page-number pagination — page is 1-indexed, pageSize
// capped at 100 to keep responses light.
export default defineEventHandler(async (event) => {
  requireSuperAdmin(event)
  await connectDB()

  const query = getQuery(event)
  const filter = {}

  if (query.action) filter.action = query.action
  if (query.actor) filter.actor = query.actor
  if (query.from || query.to) {
    filter.createdAt = {}
    if (query.from) filter.createdAt.$gte = new Date(query.from)
    if (query.to) filter.createdAt.$lte = new Date(query.to)
  }

  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const [logs, total, distinctActions] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('actor', 'firstName lastName email'),
    AuditLog.countDocuments(filter),
    // Distinct action names, useful for populating a filter dropdown in the UI
    // without a separate round-trip.
    AuditLog.distinct('action')
  ])

  return { logs, distinctActions, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
})
