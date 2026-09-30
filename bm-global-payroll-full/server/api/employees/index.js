import Employee from '~/server/models/Employee'
import { requireAuth, requireAdmin } from '~/server/utils/auth'
import { generateUniqueEmployeeNumber } from '~/server/utils/employeeNumber'
import { logAudit } from '~/server/utils/auditLog'

export default defineEventHandler(async (event) => {
  await connectDB()
  const method = event.method

  if (method === 'GET') {
    const session = requireAuth(event) // any logged-in user can list active/inactive staff (UI restricts what's shown); admin-only fields filtered client-side if needed
    const isAdminRole = session.role === 'admin' || session.role === 'super_admin'
    const query = getQuery(event)
    const filter = {}
    if (query.status) {
      const statuses = String(query.status).split(',').map((s) => s.trim()).filter(Boolean)

      // The separated-employee archive is admin-only — a regular employee
      // has no self-service need to browse former staff, and separation
      // dates/reasons aren't meant to be visible company-wide.
      if (statuses.includes('separated') && !isAdminRole) {
        throw createError({ statusCode: 403, statusMessage: 'Only admins can view separated employees' })
      }

      filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0]
    }
    if (query.department) filter.department = query.department
    if (query.search) {
      const re = new RegExp(query.search, 'i')
      filter.$or = [{ firstName: re }, { lastName: re }, { employeeNumber: re }, { email: re }]
    }

    // Super admin accounts are invisible to everyone except other super admins
    // — not listed in the directory at all, regardless of status/department/
    // search filters. This applies on top of any other filter in the query.
    if (session.role !== 'super_admin') {
      filter.role = { $ne: 'super_admin' }
    }

    const employees = await Employee.find(filter).sort({ lastName: 1, firstName: 1 })
    return { employees }
  }

  if (method === 'POST') {
    requireAdmin(event)
    const body = await readBody(event)

    // employeeNumber is no longer required from the client — it's auto-generated
    // below if not supplied. Admins can still pass one explicitly to override.
    const required = ['firstName', 'lastName', 'email', 'basicSalary', 'dateHired']
    for (const field of required) {
      if (!body[field]) {
        throw createError({ statusCode: 400, statusMessage: `Field "${field}" is required` })
      }
    }

    const existingEmail = await Employee.findOne({ email: body.email.toLowerCase() })
    if (existingEmail) {
      throw createError({ statusCode: 409, statusMessage: 'An employee with this email already exists' })
    }

    if (body.employeeNumber) {
      const existingNumber = await Employee.findOne({ employeeNumber: body.employeeNumber })
      if (existingNumber) {
        throw createError({ statusCode: 409, statusMessage: 'An employee with this employee number already exists' })
      }
    }

    const tempPassword = body.tempPassword || generateTempPassword()
    const passwordHash = await Employee.hashPassword(tempPassword)

    // Retry loop: generate a candidate number and attempt the insert. If a
    // concurrent request grabbed the same number in the gap between our
    // generation check and this insert, MongoDB's unique index rejects it
    // with error code 11000 — in that rare case, generate a fresh number
    // and try again rather than failing the whole request.
    const MAX_INSERT_ATTEMPTS = 3
    let employee
    let lastError
    for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt++) {
      const employeeNumber = body.employeeNumber || (await generateUniqueEmployeeNumber())
      try {
        employee = await Employee.create({
          ...body,
          employeeNumber,
          email: body.email.toLowerCase(),
          passwordHash,
          mustChangePassword: true
        })
        lastError = null
        break
      } catch (err) {
        if (err?.code === 11000 && !body.employeeNumber) {
          // Auto-generated number collided under concurrent load — retry with a new one.
          lastError = err
          continue
        }
        throw err
      }
    }

    if (lastError) {
      throw createError({ statusCode: 409, statusMessage: 'Could not generate a unique employee number — please try again' })
    }

    await logAudit(event, {
      action: 'employee.create',
      resourceType: 'Employee',
      resourceId: employee._id,
      after: employee.toObject() // tempPassword is never stored on the document, so it can't leak into the log here
    })

    return { employee, tempPassword }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})

function generateTempPassword() {
  return 'BMGV-' + Math.random().toString(36).slice(2, 8).toUpperCase()
}
