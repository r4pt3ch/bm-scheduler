import Employee from '~/server/models/Employee'
import bcrypt from 'bcryptjs'
import { requireSuperAdmin } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/auditLog'

// POST /api/dtr/assign-credential
// body: { employeeId, credentialType: 'barcode'|'nfc', value }
// Super-admin only. Assigns (or clears) a barcode or NFC credential for
// an employee. To clear a credential, pass value: null or value: ''.
// The raw credential value is NEVER stored — only its bcrypt hash. All
// reads/writes go through the raw MongoDB collection rather than Mongoose
// document mutation, to guarantee correctness regardless of any schema
// caching mismatch on the running server.
export default defineEventHandler(async (event) => {
  requireSuperAdmin(event)
  await connectDB()

  const body = await readBody(event)
  const { employeeId, credentialType, value } = body

  if (!employeeId) throw createError({ statusCode: 400, statusMessage: 'employeeId is required' })
  if (credentialType !== 'barcode' && credentialType !== 'nfc') {
    throw createError({ statusCode: 400, statusMessage: 'credentialType must be barcode or nfc' })
  }

  const employee = await Employee.findById(employeeId)
  if (!employee) throw createError({ statusCode: 404, statusMessage: 'Employee not found' })
  if (employee.role === 'super_admin') {
    throw createError({ statusCode: 400, statusMessage: 'Super admin accounts do not use the DTR kiosk' })
  }

  const fieldName = credentialType === 'barcode' ? 'dtrBarcodeHash' : 'dtrNfcHash'

  if (!value) {
    // Clear the credential
    await Employee.collection.updateOne({ _id: employee._id }, { $set: { [fieldName]: null } })
    await logAudit(event, {
      action: `dtr.${credentialType}_credential_cleared`,
      resourceType: 'Employee',
      resourceId: employee._id
    })
    return { success: true, credentialType, cleared: true }
  }

  // Check for collisions — each barcode/NFC value must be unique across all
  // employees (you can't assign the same card to two people). Read raw
  // hashes via the collection to guarantee they're returned.
  const otherDocs = await Employee.collection.find(
    { status: { $ne: 'separated' }, _id: { $ne: employee._id }, [fieldName]: { $ne: null } },
    { projection: { _id: 1, [fieldName]: 1 } }
  ).toArray()

  for (const doc of otherDocs) {
    if (doc[fieldName] && await bcrypt.compare(String(value), doc[fieldName])) {
      throw createError({
        statusCode: 409,
        statusMessage: `This ${credentialType} value is already assigned to another employee`
      })
    }
  }

  const hash = await bcrypt.hash(String(value), 10)
  const writeResult = await Employee.collection.updateOne(
    { _id: employee._id },
    { $set: { [fieldName]: hash } }
  )

  if (writeResult.matchedCount === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Employee not found' })
  }

  // Verify directly against the raw collection
  const verifyDoc = await Employee.collection.findOne(
    { _id: employee._id },
    { projection: { [fieldName]: 1 } }
  )
  if (!verifyDoc?.[fieldName]) {
    console.error(`[assign-credential] ${fieldName} not present after write for employee:`, employeeId)
    throw createError({ statusCode: 500, statusMessage: 'Credential could not be saved. Please contact the system administrator.' })
  }

  await logAudit(event, {
    action: `dtr.${credentialType}_credential_set`,
    resourceType: 'Employee',
    resourceId: employee._id
    // deliberately no before/after — never log credential values
  })

  return { success: true, credentialType, cleared: false }
})
