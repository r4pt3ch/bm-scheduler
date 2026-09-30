import Employee from '~/server/models/Employee'
import { requireAdmin } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/auditLog'

// PUT /api/employees/[id]/leave-balance
// body: { vacation: number, sick: number, reason?: string }
// Manually sets an employee's vacation/sick leave balance — e.g. correcting a
// mistake, granting extra days, prorating a new hire's allotment, or doing an
// annual reset. Kept as a separate, dedicated action (distinct from the
// general employee update) so it's clearly distinguishable in the audit trail
// and isn't bundled in accidentally with an unrelated profile edit.
export default defineEventHandler(async (event) => {
  const session = requireAdmin(event)
  await connectDB()

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const vacation = Number(body?.vacation)
  const sick = Number(body?.sick)

  if (!Number.isFinite(vacation) || vacation < 0) {
    throw createError({ statusCode: 400, statusMessage: 'Vacation balance must be a non-negative number' })
  }
  if (!Number.isFinite(sick) || sick < 0) {
    throw createError({ statusCode: 400, statusMessage: 'Sick balance must be a non-negative number' })
  }

  const target = await Employee.findById(id)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Employee not found' })

  // Same restriction as editing any other field on a super_admin — only
  // another super_admin can adjust a super_admin's leave balance.
  if (target.role === 'super_admin' && session.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Only a super admin can edit a super admin account' })
  }

  const before = { vacation: target.leaveCredits?.vacation ?? 0, sick: target.leaveCredits?.sick ?? 0 }

  target.leaveCredits.vacation = vacation
  target.leaveCredits.sick = sick
  await target.save()

  const after = { vacation, sick }

  await logAudit(event, {
    action: 'employee.leave_balance_adjust',
    resourceType: 'Employee',
    resourceId: target._id,
    before,
    after,
    meta: { reason: (body?.reason || '').trim() }
  })

  return { employee: target }
})
