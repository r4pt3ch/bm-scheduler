import Employee from '~/server/models/Employee'
import { requireAuth, requireAdmin, requireSuperAdmin } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/auditLog'

export default defineEventHandler(async (event) => {
  await connectDB()
  const id = getRouterParam(event, 'id')
  const method = event.method

  if (method === 'GET') {
    const session = requireAuth(event)
    const isAdminRole = session.role === 'admin' || session.role === 'super_admin'
    if (!isAdminRole && session.id !== id) {
      throw createError({ statusCode: 403, statusMessage: 'You can only view your own profile' })
    }
    const employee = await Employee.findById(id)
    if (!employee) throw createError({ statusCode: 404, statusMessage: 'Employee not found' })

    // A regular admin cannot view a super_admin's profile at all — not even
    // read-only. Super admin accounts are fully off-limits to anyone but
    // another super_admin (or the account itself).
    if (employee.role === 'super_admin' && session.role !== 'super_admin' && session.id !== id) {
      throw createError({ statusCode: 403, statusMessage: 'Only a super admin can view a super admin account' })
    }

    return { employee }
  }

  if (method === 'PUT' || method === 'PATCH') {
    const session = requireAuth(event)
    const body = await readBody(event)
    const isAdminRole = session.role === 'admin' || session.role === 'super_admin'

    // Employees may update limited self-service fields; admins can edit everything.
    if (!isAdminRole) {
      if (session.id !== id) {
        throw createError({ statusCode: 403, statusMessage: 'You can only edit your own profile' })
      }
      const allowed = ['phone', 'address', 'bankAccount']
      const filtered = {}
      for (const key of allowed) {
        if (body[key] !== undefined) filtered[key] = body[key]
      }
      const employee = await Employee.findByIdAndUpdate(id, filtered, { new: true })
      return { employee }
    }

    delete body.passwordHash
    delete body.email // email changes go through a dedicated, more careful flow in a real system

    const target = await Employee.findById(id)
    if (!target) throw createError({ statusCode: 404, statusMessage: 'Employee not found' })

    // A super_admin account is fully off-limits to a regular admin — not just
    // the role field, but every field. Only another super_admin can edit a
    // super_admin's record at all. This also covers granting the super_admin
    // role to someone else, since that itself requires editing a record that
    // (post-change) would be a super_admin.
    if ((target.role === 'super_admin' || body.role === 'super_admin') && session.role !== 'super_admin') {
      throw createError({ statusCode: 403, statusMessage: 'Only a super admin can edit a super admin account' })
    }

    // Prevent demoting the last remaining admin/super_admin combined — without
    // this, a system could end up with nobody able to manage it at all.
    if (body.role && body.role === 'employee' && (target.role === 'admin' || target.role === 'super_admin')) {
      const managerCount = await Employee.countDocuments({
        role: { $in: ['admin', 'super_admin'] },
        status: { $ne: 'separated' }
      })
      if (managerCount <= 1) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Cannot remove admin access from the last remaining admin/super admin. Promote another employee first.'
        })
      }
    }

    // Separately, prevent demoting the last super_admin specifically — even if
    // there are other regular admins left, losing the only super_admin would
    // permanently lock everyone out of Audit Trail and Login Logs.
    if (body.role && body.role !== 'super_admin' && target.role === 'super_admin') {
      const superAdminCount = await Employee.countDocuments({ role: 'super_admin', status: { $ne: 'separated' } })
      if (superAdminCount <= 1) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Cannot remove super admin access from the last remaining super admin. Promote another employee to super admin first.'
        })
      }
    }

    const before = target.toObject()
    const employee = await Employee.findByIdAndUpdate(id, body, { new: true })
    if (!employee) throw createError({ statusCode: 404, statusMessage: 'Employee not found' })

    await logAudit(event, {
      action: 'employee.update',
      resourceType: 'Employee',
      resourceId: employee._id,
      before,
      after: employee.toObject()
    })

    return { employee }
  }

  if (method === 'DELETE') {
    requireAdmin(event)

    const target = await Employee.findById(id)

    // Only a super_admin can separate another super_admin.
    if (target?.role === 'super_admin') {
      requireSuperAdmin(event)
    }

    // Same combined-lockout protection as above — separating the last
    // admin/super_admin would have the same effect as demoting them.
    if (target?.role === 'admin' || target?.role === 'super_admin') {
      const managerCount = await Employee.countDocuments({
        role: { $in: ['admin', 'super_admin'] },
        status: { $ne: 'separated' }
      })
      if (managerCount <= 1) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Cannot separate the last remaining admin/super admin. Promote another employee first.'
        })
      }
    }
    if (target?.role === 'super_admin') {
      const superAdminCount = await Employee.countDocuments({ role: 'super_admin', status: { $ne: 'separated' } })
      if (superAdminCount <= 1) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Cannot separate the last remaining super admin. Promote another employee to super admin first.'
        })
      }
    }

    // Soft-delete: mark separated rather than destroying payroll history
    const employee = await Employee.findByIdAndUpdate(
      id,
      { status: 'separated', dateSeparated: new Date() },
      { new: true }
    )
    if (!employee) throw createError({ statusCode: 404, statusMessage: 'Employee not found' })

    await logAudit(event, {
      action: 'employee.separate',
      resourceType: 'Employee',
      resourceId: employee._id,
      before: target ? target.toObject() : null,
      after: employee.toObject()
    })

    return { employee }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
