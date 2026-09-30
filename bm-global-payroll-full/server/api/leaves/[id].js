import LeaveRequest from '~/server/models/LeaveRequest'
import Employee from '~/server/models/Employee'
import Attendance from '~/server/models/Attendance'
import { requireAdmin } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/auditLog'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  const session = requireAdmin(event)
  await connectDB()

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const action = body?.action // 'approve' | 'reject'

  if (!['approve', 'reject'].includes(action)) {
    throw createError({ statusCode: 400, statusMessage: 'action must be "approve" or "reject"' })
  }

  const leave = await LeaveRequest.findById(id)
  if (!leave) throw createError({ statusCode: 404, statusMessage: 'Leave request not found' })
  if (leave.status !== 'pending') {
    throw createError({ statusCode: 400, statusMessage: 'Only pending requests can be reviewed' })
  }

  leave.status = action === 'approve' ? 'approved' : 'rejected'
  leave.reviewedBy = session.id
  leave.reviewedAt = new Date()
  leave.reviewNotes = body.notes || ''
  await leave.save()

  if (action === 'approve') {
    // Deduct leave credits for vacation/sick
    if (leave.type === 'vacation' || leave.type === 'sick') {
      await Employee.findByIdAndUpdate(leave.employee, {
        $inc: { [`leaveCredits.${leave.type}`]: -leave.days }
      })
    }

    // Mark each day in range as an attendance "leave" record
    let cursor = dayjs(leave.startDate)
    const end = dayjs(leave.endDate)
    while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
      await Attendance.findOneAndUpdate(
        { employee: leave.employee, date: cursor.toDate() },
        {
          employee: leave.employee,
          date: cursor.toDate(),
          status: 'leave',
          leaveType: leave.type,
          hoursWorked: 0,
          recordedBy: session.id
        },
        { upsert: true, new: true }
      )
      cursor = cursor.add(1, 'day')
    }
  }

  await logAudit(event, {
    action: action === 'approve' ? 'leave.approve' : 'leave.reject',
    resourceType: 'LeaveRequest',
    resourceId: leave._id,
    after: leave.toObject(),
    meta: { reviewNotes: leave.reviewNotes }
  })

  return { leave }
})
