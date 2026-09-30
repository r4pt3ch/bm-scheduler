import Employee from '~/server/models/Employee'
import { requireAuth } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/auditLog'

export default defineEventHandler(async (event) => {
  const session = requireAuth(event)
  await connectDB()

  const body = await readBody(event)
  const currentPassword = body?.currentPassword || ''
  const newPassword = body?.newPassword || ''

  if (!newPassword || newPassword.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'New password must be at least 8 characters' })
  }

  const employee = await Employee.findById(session.id)
  if (!employee) {
    throw createError({ statusCode: 404, statusMessage: 'Account not found' })
  }

  // Skip current-password check only on forced first-login change
  if (!employee.mustChangePassword) {
    const valid = await employee.comparePassword(currentPassword)
    if (!valid) {
      throw createError({ statusCode: 401, statusMessage: 'Current password is incorrect' })
    }
  }

  employee.passwordHash = await Employee.hashPassword(newPassword)
  employee.mustChangePassword = false
  await employee.save()

  // Deliberately log only that the password changed — never the password
  // itself, hashed or otherwise, and no before/after document snapshot here
  // since Employee.toJSON already strips passwordHash but it's safer to just
  // not pass the document through this path at all.
  await logAudit(event, {
    action: 'auth.change_password',
    resourceType: 'Employee',
    resourceId: employee._id
  })

  return { success: true }
})
