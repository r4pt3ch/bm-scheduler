import PayrollRecord from '~/server/models/PayrollRecord'
import { requireAuth, requireAdmin } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/auditLog'

export default defineEventHandler(async (event) => {
  await connectDB()
  const id = getRouterParam(event, 'id')
  const method = event.method

  if (method === 'GET') {
    const session = requireAuth(event)
    const record = await PayrollRecord.findById(id).populate(
      'employee',
      'firstName lastName employeeNumber department position governmentIds bankAccount'
    )
    if (!record) throw createError({ statusCode: 404, statusMessage: 'Payslip not found' })

    if (session.role !== 'admin' && session.role !== 'super_admin') {
      if (record.employee._id.toString() !== session.id) {
        throw createError({ statusCode: 403, statusMessage: 'You can only view your own payslips' })
      }
      if (record.status === 'draft' || record.status === 'cancelled') {
        throw createError({ statusCode: 403, statusMessage: 'This payslip is not available' })
      }
    }

    return { record }
  }

  if (method === 'PATCH') {
    const session = requireAdmin(event)
    const body = await readBody(event)

    // Used to transition draft -> finalized -> paid. Cancellation is intentionally
    // NOT allowed here — it goes through POST /api/payroll/[id]/cancel instead,
    // which captures who cancelled it, when, and why for the audit trail.
    if (body.status && !['draft', 'finalized', 'paid'].includes(body.status)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid status' })
    }

    const before = await PayrollRecord.findById(id)
    const record = await PayrollRecord.findByIdAndUpdate(id, body, { new: true })
    if (!record) throw createError({ statusCode: 404, statusMessage: 'Payslip not found' })

    await logAudit(event, {
      action: 'payroll.status_change',
      resourceType: 'PayrollRecord',
      resourceId: record._id,
      before: before ? { status: before.status } : null,
      after: { status: record.status }
    })

    return { record }
  }

  if (method === 'DELETE') {
    requireAdmin(event)
    const record = await PayrollRecord.findById(id)
    if (!record) throw createError({ statusCode: 404, statusMessage: 'Payslip not found' })
    if (record.status !== 'draft') {
      throw createError({ statusCode: 400, statusMessage: 'Only draft payslips can be deleted' })
    }
    const snapshot = record.toObject()
    await record.deleteOne()

    await logAudit(event, {
      action: 'payroll.delete_draft',
      resourceType: 'PayrollRecord',
      resourceId: id,
      before: snapshot
    })

    return { success: true }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
