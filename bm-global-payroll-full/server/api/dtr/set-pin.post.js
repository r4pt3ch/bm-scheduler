import Employee from '~/server/models/Employee'
import bcrypt from 'bcryptjs'
import { requireAuth } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/auditLog'

// POST /api/dtr/set-pin
// body: { pin } — 4–8 digit numeric PIN
// Employees and admins both set their own PIN from Profile (only
// super_admin is excluded — they don't use the kiosk). Admins can also set
// it for any other employee by passing { employeeId }. Writes and verifies
// directly via the raw MongoDB collection to guarantee correctness
// regardless of any Mongoose schema caching mismatch on the running server.
export default defineEventHandler(async (event) => {
  const session = requireAuth(event)
  await connectDB()

  const body = await readBody(event)
  const pin = String(body?.pin || '')
  const isAdminRole = session.role === 'admin' || session.role === 'super_admin'
  const targetId = isAdminRole && body?.employeeId ? body.employeeId : session.id

  if (!/^\d{4,8}$/.test(pin)) {
    throw createError({ statusCode: 400, statusMessage: 'PIN must be 4 to 8 digits' })
  }

  const employee = await Employee.findById(targetId)
  if (!employee) throw createError({ statusCode: 404, statusMessage: 'Employee not found' })

  if (employee.role === 'super_admin') {
    throw createError({ statusCode: 400, statusMessage: 'Super admin accounts do not use the DTR kiosk' })
  }

  if (!isAdminRole && session.id !== targetId) {
    throw createError({ statusCode: 403, statusMessage: 'You can only set your own PIN' })
  }

  const dtrPinHash = await bcrypt.hash(pin, 10)

  // Write directly via the raw MongoDB collection — bypasses Mongoose
  // entirely on both the write AND the verification read, so a stale
  // cached schema definition can't cause either step to silently fail.
  const writeResult = await Employee.collection.updateOne(
    { _id: employee._id },
    { $set: { dtrPinHash } }
  )

  if (writeResult.matchedCount === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Employee not found' })
  }

  // Verify directly against the raw collection, not a Mongoose document.
  const verifyDoc = await Employee.collection.findOne(
    { _id: employee._id },
    { projection: { dtrPinHash: 1 } }
  )

  if (!verifyDoc?.dtrPinHash) {
    console.error('[set-pin] dtrPinHash not present after write for employee:', targetId)
    throw createError({ statusCode: 500, statusMessage: 'PIN could not be saved. Please contact the system administrator.' })
  }

  await logAudit(event, {
    action: 'dtr.pin_set',
    resourceType: 'Employee',
    resourceId: employee._id
  })

  return { success: true }
})
