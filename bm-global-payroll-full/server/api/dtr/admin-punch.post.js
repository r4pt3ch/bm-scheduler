import Employee from '~/server/models/Employee'
import { requireAdmin } from '~/server/utils/auth'
import { recordPunch } from '~/server/utils/dtrPunch'
import { logAudit } from '~/server/utils/auditLog'

// POST /api/dtr/admin-punch
// body: { employeeId, type: 'in' | 'out' }
// Lets an Admin or Super Admin manually record a clock in/out punch on behalf
// of an employee — e.g. someone forgot to badge at the Kiosk, or the Kiosk
// was unavailable. This is deliberately separate from the (now-disabled)
// self-service /api/dtr/punch endpoint: this is an admin acting on someone
// else's record, not a self-punch shortcut, so every use is audit-logged
// with both the acting admin's identity and the target employee's.
export default defineEventHandler(async (event) => {
  const session = requireAdmin(event)
  await connectDB()

  const body = await readBody(event)
  const { employeeId, type } = body || {}

  if (!employeeId) throw createError({ statusCode: 400, statusMessage: 'employeeId is required' })
  if (type !== 'in' && type !== 'out') {
    throw createError({ statusCode: 400, statusMessage: 'type must be "in" or "out"' })
  }

  const employee = await Employee.findOne({ _id: employeeId, status: { $ne: 'separated' } })
  if (!employee) throw createError({ statusCode: 404, statusMessage: 'Employee not found' })
  if (employee.role === 'super_admin') {
    throw createError({ statusCode: 400, statusMessage: 'Super admin accounts do not use the DTR system' })
  }

  const result = await recordPunch(employee, type)

  await logAudit(event, {
    action: type === 'in' ? 'dtr.admin_clock_in' : 'dtr.admin_clock_out',
    resourceType: 'DtrEntry',
    resourceId: result.entry._id,
    meta: {
      employeeId: employee._id,
      employeeName: employee.fullName,
      recordedByAdmin: session.id,
      punchTime: result.punchTime,
      punchCount: result.entry.punches.length
    }
  })

  return {
    entry: result.entry,
    currentlyIn: result.currentlyIn,
    hoursWorkedToday: result.hoursWorkedToday,
    employeeName: employee.fullName
  }
})
