import Employee from '~/server/models/Employee'
import bcrypt from 'bcryptjs'
import { requireKioskSession } from '~/server/utils/auth'
import { recordPunch } from '~/server/utils/dtrPunch'
import { logAudit } from '~/server/utils/auditLog'

// POST /api/dtr/kiosk-punch
// body (PIN flow):     { employeeId, credentialType: 'pin', credential, type: 'in'|'out' }
// body (scan flows):   { credentialType: 'barcode'|'nfc'|'qr', credential, type: 'in'|'out' }
//
// Barcode/NFC/QR flows do NOT require employeeId — the credential itself is
// used to look up the employee. The system finds who the card/code belongs to
// and auto-punches, toggling in/out based on their current state so the
// employee never has to choose — scanning once = punch in, scanning again = punch out.
export default defineEventHandler(async (event) => {
  requireKioskSession(event)
  await connectDB()

  const body = await readBody(event)
  const { credentialType, credential, type } = body

  if (!credentialType || !credential) {
    throw createError({ statusCode: 400, statusMessage: 'credentialType and credential are required' })
  }
  if (type && type !== 'in' && type !== 'out') {
    throw createError({ statusCode: 400, statusMessage: 'type must be "in" or "out"' })
  }

  let employee = null

  if (credentialType === 'pin') {
    // PIN flow: employee already selected from the picker, we just verify their PIN
    if (!body.employeeId) {
      throw createError({ statusCode: 400, statusMessage: 'employeeId is required for PIN authentication' })
    }
    if (!type) {
      throw createError({ statusCode: 400, statusMessage: 'type (in/out) is required for PIN authentication' })
    }

    employee = await Employee.findOne(
      { _id: body.employeeId, status: 'active', role: { $ne: 'super_admin' } }
    )
    if (!employee) throw createError({ statusCode: 404, statusMessage: 'Employee not found' })

    // Fetch dtrPinHash directly from MongoDB via the raw collection to
    // guarantee we get the field even if there's a Mongoose schema/cache
    // mismatch — this is belt-and-suspenders against the most common deploy
    // timing issue where the schema update and the saved data are out of sync.
    const rawDoc = await Employee.collection.findOne(
      { _id: employee._id },
      { projection: { dtrPinHash: 1 } }
    )
    const storedPinHash = rawDoc?.dtrPinHash

    if (!storedPinHash) throw createError({ statusCode: 403, statusMessage: 'PIN not configured. Contact HR.' })

    const valid = await bcrypt.compare(String(credential), storedPinHash)
    if (!valid) throw createError({ statusCode: 401, statusMessage: 'Incorrect PIN' })

  } else if (credentialType === 'barcode') {
    employee = await findEmployeeByHash('dtrBarcodeHash', credential)
    if (!employee) throw createError({ statusCode: 401, statusMessage: 'Barcode not recognized. Contact HR to assign your card.' })

  } else if (credentialType === 'nfc') {
    employee = await findEmployeeByHash('dtrNfcHash', credential)
    if (!employee) throw createError({ statusCode: 401, statusMessage: 'NFC card not recognized. Contact HR to assign your card.' })

  } else if (credentialType === 'qr') {
    employee = await findEmployeeByHash('dtrQrHash', credential)
    if (!employee) throw createError({ statusCode: 401, statusMessage: 'QR code not recognized or has been regenerated. Contact HR.' })

  } else if (credentialType === 'scan') {
    // Used by the camera scanner, which can't tell in advance whether it
    // decoded a QR code or a regular barcode — try QR first (most likely,
    // since QR is what Settings generates and prints), then fall back to
    // barcode before giving up.
    employee = (await findEmployeeByHash('dtrQrHash', credential)) || (await findEmployeeByHash('dtrBarcodeHash', credential))
    if (!employee) throw createError({ statusCode: 401, statusMessage: 'Code not recognized. Contact HR to assign your card.' })

  } else {
    throw createError({ statusCode: 400, statusMessage: 'credentialType must be pin, barcode, nfc, qr, or scan' })
  }

  // For barcode/NFC: auto-determine in/out based on current punch state
  // (scan once = clock in, scan again = clock out, no choice needed)
  const DtrEntry = (await import('~/server/models/DtrEntry')).default
  const dayjs = (await import('dayjs')).default
  const today = dayjs().startOf('day').toDate()
  const existingEntry = await DtrEntry.findOne({ employee: employee._id, date: today })
  const lastPunch = existingEntry?.punches?.[existingEntry.punches.length - 1]
  const currentlyIn = lastPunch?.type === 'in'

  const resolvedType = type || (currentlyIn ? 'out' : 'in')

  const result = await recordPunch(employee, resolvedType)

  await logAudit(event, {
    action: resolvedType === 'in' ? 'dtr.kiosk_clock_in' : 'dtr.kiosk_clock_out',
    resourceType: 'DtrEntry',
    resourceId: result.entry._id,
    meta: {
      credentialType,
      employeeId: employee._id,
      employeeName: employee.fullName,
      punchTime: result.punchTime,
      hoursWorkedToday: result.hoursWorkedToday
    }
  })

  return {
    success: true,
    employeeName: employee.fullName,
    employeeNumber: employee.employeeNumber,
    type: resolvedType,
    punchTime: result.punchTime,
    currentlyIn: result.currentlyIn,
    hoursWorkedToday: result.hoursWorkedToday,
    credentialType
  }
})

/**
 * Looks up an active, non-super-admin employee by comparing a raw scanned/
 * entered value against a hashed field (dtrBarcodeHash, dtrNfcHash, or
 * dtrQrHash) across all employees who have that field set. Uses the raw
 * MongoDB collection (not Mongoose queries) to guarantee the hash field is
 * actually returned regardless of any Mongoose schema caching mismatch.
 * Returns a full Mongoose Employee document on match, or null.
 */
async function findEmployeeByHash(hashField, rawValue) {
  const activeDocs = await Employee.collection.find(
    { status: 'active', role: { $ne: 'super_admin' }, [hashField]: { $ne: null } },
    { projection: { _id: 1, [hashField]: 1 } }
  ).toArray()

  for (const doc of activeDocs) {
    if (doc[hashField] && await bcrypt.compare(String(rawValue), doc[hashField])) {
      return Employee.findById(doc._id)
    }
  }
  return null
}
