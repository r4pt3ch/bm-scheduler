import LeaveRequest from '~/server/models/LeaveRequest'
import Employee from '~/server/models/Employee'
import { requireAuth } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/auditLog'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  await connectDB()
  const session = requireAuth(event)
  const isAdminRole = session.role === 'admin' || session.role === 'super_admin'
  const method = event.method

  if (method === 'GET') {
    const query = getQuery(event)
    const filter = {}
    if (!isAdminRole) {
      filter.employee = session.id
    } else if (query.employee) {
      filter.employee = query.employee
    }
    if (query.status) filter.status = query.status

    const leaves = await LeaveRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('employee', 'firstName lastName employeeNumber')

    return { leaves }
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const employeeId = isAdminRole && body.employee ? body.employee : session.id

    if (!body.type || !body.startDate || !body.endDate) {
      throw createError({ statusCode: 400, statusMessage: 'type, startDate, and endDate are required' })
    }

    const start = dayjs(body.startDate)
    const end = dayjs(body.endDate)
    const days = body.days ?? end.diff(start, 'day') + 1

    if (days <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'endDate must be on or after startDate' })
    }

    // Check leave credit balance for vacation/sick
    if (body.type === 'vacation' || body.type === 'sick') {
      const employee = await Employee.findById(employeeId)
      const balance = employee?.leaveCredits?.[body.type] ?? 0
      if (days > balance) {
        throw createError({
          statusCode: 400,
          statusMessage: `Insufficient ${body.type} leave balance (available: ${balance} day(s))`
        })
      }
    }

    const leave = await LeaveRequest.create({
      employee: employeeId,
      type: body.type,
      startDate: start.toDate(),
      endDate: end.toDate(),
      days,
      reason: body.reason || '',
      status: isAdminRole && body.autoApprove ? 'approved' : 'pending'
    })

    await logAudit(event, {
      action: 'leave.request',
      resourceType: 'LeaveRequest',
      resourceId: leave._id,
      after: leave.toObject()
    })

    return { leave }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
