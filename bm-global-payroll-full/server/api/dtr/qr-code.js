import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import Employee from '~/server/models/Employee'
import { requireSuperAdmin } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/auditLog'

// GET  /api/dtr/qr-code?employeeId=     — fetch the current QR value (generates one if none exists)
// POST /api/dtr/qr-code  { employeeId } — force-regenerate, invalidating the old code
// Super-admin only. The QR value itself is a system-generated random token,
// not a real secret like a password — it's closer to an ID badge number —
// so it's kept in retrievable form for reprinting, alongside a hash used for
// the actual kiosk scan comparison (same verification pattern as barcode/NFC).
export default defineEventHandler(async (event) => {
  requireSuperAdmin(event)
  await connectDB()

  if (event.method === 'GET') {
    const query = getQuery(event)
    const employeeId = query.employeeId
    if (!employeeId) throw createError({ statusCode: 400, statusMessage: 'employeeId is required' })

    const employee = await Employee.findById(employeeId)
    if (!employee) throw createError({ statusCode: 404, statusMessage: 'Employee not found' })
    if (employee.role === 'super_admin') {
      throw createError({ statusCode: 400, statusMessage: 'Super admin accounts do not use the DTR kiosk' })
    }

    // Fetch via raw collection to guarantee the field is returned regardless
    // of Mongoose schema caching state (same precaution as PIN/barcode/NFC).
    const rawDoc = await Employee.collection.findOne(
      { _id: employee._id },
      { projection: { dtrQrValue: 1 } }
    )

    let qrValue = rawDoc?.dtrQrValue
    let generated = false

    if (!qrValue) {
      qrValue = generateQrToken(employee)
      const qrHash = await bcrypt.hash(qrValue, 10)
      await Employee.collection.updateOne(
        { _id: employee._id },
        { $set: { dtrQrValue: qrValue, dtrQrHash: qrHash } }
      )
      generated = true

      await logAudit(event, {
        action: 'dtr.qr_generated',
        resourceType: 'Employee',
        resourceId: employee._id
        // deliberately no before/after — never log the QR value itself
      })
    }

    return {
      employeeId: employee._id,
      employeeName: employee.fullName,
      qrValue,
      generated
    }
  }

  if (event.method === 'POST') {
    const body = await readBody(event)
    const employeeId = body?.employeeId
    if (!employeeId) throw createError({ statusCode: 400, statusMessage: 'employeeId is required' })

    const employee = await Employee.findById(employeeId)
    if (!employee) throw createError({ statusCode: 404, statusMessage: 'Employee not found' })
    if (employee.role === 'super_admin') {
      throw createError({ statusCode: 400, statusMessage: 'Super admin accounts do not use the DTR kiosk' })
    }

    // Regenerate — the old QR code (e.g. a lost or compromised printed badge)
    // immediately stops working since dtrQrHash is overwritten.
    const qrValue = generateQrToken(employee)
    const qrHash = await bcrypt.hash(qrValue, 10)
    await Employee.collection.updateOne(
      { _id: employee._id },
      { $set: { dtrQrValue: qrValue, dtrQrHash: qrHash } }
    )

    await logAudit(event, {
      action: 'dtr.qr_regenerated',
      resourceType: 'Employee',
      resourceId: employee._id
    })

    return {
      employeeId: employee._id,
      employeeName: employee.fullName,
      qrValue,
      generated: true
    }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})

/**
 * Generates a unique, random QR token for an employee. Prefixed with the
 * employee number for human-readability if ever inspected, followed by a
 * cryptographically random suffix so it can't be guessed or reconstructed
 * from the employee number alone.
 */
function generateQrToken(employee) {
  const randomPart = crypto.randomBytes(16).toString('hex')
  return `BMGV-DTR-${employee.employeeNumber}-${randomPart}`
}
