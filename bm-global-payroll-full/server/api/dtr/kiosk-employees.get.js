import Employee from '~/server/models/Employee'
import { requireKioskSession } from '~/server/utils/auth'

// GET /api/dtr/kiosk-employees
// Returns minimal fields for the kiosk name picker + scan lookup.
// Uses raw MongoDB collection access to guarantee hash presence flags
// are accurate regardless of Mongoose schema caching state.
export default defineEventHandler(async (event) => {
  requireKioskSession(event)
  await connectDB()

  // Fetch via raw collection to guarantee hash fields are returned even if
  // there's a Mongoose model caching mismatch on the running server.
  const docs = await Employee.collection
    .find(
      { status: 'active', role: { $ne: 'super_admin' } },
      { projection: { _id: 1, firstName: 1, lastName: 1, employeeNumber: 1, department: 1, role: 1, dtrPinHash: 1, dtrBarcodeHash: 1, dtrNfcHash: 1, dtrQrHash: 1 } }
    )
    .sort({ lastName: 1, firstName: 1 })
    .toArray()

  const result = docs.map((e) => ({
    _id: e._id,
    firstName: e.firstName,
    lastName: e.lastName,
    employeeNumber: e.employeeNumber,
    department: e.department || '',
    role: e.role || 'employee',
    hasDtrPin: !!e.dtrPinHash,
    hasDtrBarcode: !!e.dtrBarcodeHash,
    hasDtrNfc: !!e.dtrNfcHash,
    hasDtrQr: !!e.dtrQrHash
  }))

  return { employees: result }
})
