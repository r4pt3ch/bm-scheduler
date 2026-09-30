import crypto from 'node:crypto'
import Employee from '~/server/models/Employee'
import { requireSuperAdmin } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/auditLog'

// POST /api/employees/:id/reset-password
//
// Only a super_admin can force-reset another account's password — and this
// works across every role (employee, admin, and even another super_admin),
// since super_admin is the only role permitted to touch super_admin accounts
// at all (same rule already enforced in server/api/employees/[id].js).
//
// Rather than accepting a password typed in by the super_admin (which could
// be weak, reused, or guessable), this generates a random temporary password
// server-side and returns it once in the response. The affected account is
// forced to change it on next login via mustChangePassword — the same flow
// already used for newly created accounts.
function generateTempPassword() {
  // Avoid visually ambiguous characters (0/O, 1/l/I) since this may need to
  // be read aloud, handwritten, or typed from a printed slip.
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.randomBytes(12)
  let password = ''
  for (const byte of bytes) {
    password += alphabet[byte % alphabet.length]
  }
  return password
}

export default defineEventHandler(async (event) => {
  const session = requireSuperAdmin(event)
  await connectDB()

  const id = getRouterParam(event, 'id')
  const employee = await Employee.findById(id)
  if (!employee) {
    throw createError({ statusCode: 404, statusMessage: 'Employee not found' })
  }

  if (employee.status === 'separated') {
    throw createError({ statusCode: 400, statusMessage: 'Cannot reset the password of a separated employee' })
  }

  const tempPassword = generateTempPassword()
  employee.passwordHash = await Employee.hashPassword(tempPassword)
  employee.mustChangePassword = true
  await employee.save()

  // Deliberately no before/after document snapshot here — never persist
  // password material, hashed or otherwise, in the audit trail. Who reset
  // whose password, and when, is what matters for the trail; the credential
  // itself never touches storage beyond the immediate hash on the account.
  await logAudit(event, {
    action: 'employee.password_reset',
    resourceType: 'Employee',
    resourceId: employee._id,
    meta: { targetRole: employee.role, resetBy: session.id }
  })

  return {
    success: true,
    tempPassword,
    employee: { id: employee._id, fullName: employee.fullName, role: employee.role }
  }
})
