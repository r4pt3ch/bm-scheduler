import LoginLog from '~/server/models/LoginLog'
import { requireSuperAdmin } from '~/server/utils/auth'

// GET /api/admin/login-logs?success=&employee=&from=&to=&page=&pageSize=
// Super-admin-only. success accepts 'true'/'false' as a string from the query.
// Page-number pagination — page is 1-indexed, pageSize capped at 100.
export default defineEventHandler(async (event) => {
  requireSuperAdmin(event)
  await connectDB()

  const query = getQuery(event)
  const filter = {}

  if (query.success === 'true') filter.success = true
  if (query.success === 'false') filter.success = false
  if (query.employee) filter.employee = query.employee
  if (query.from || query.to) {
    filter.createdAt = {}
    if (query.from) filter.createdAt.$gte = new Date(query.from)
    if (query.to) filter.createdAt.$lte = new Date(query.to)
  }

  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(Number(query.pageSize) || 20, 100)

  const [logs, total, failedCount] = await Promise.all([
    LoginLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('employee', 'firstName lastName email'),
    LoginLog.countDocuments(filter),
    LoginLog.countDocuments({ success: false })
  ])

  return { logs, failedCount, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
})
