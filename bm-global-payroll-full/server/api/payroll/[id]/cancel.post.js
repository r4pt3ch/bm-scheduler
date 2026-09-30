import PayrollRecord from '~/server/models/PayrollRecord'
import { requireAdmin } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/auditLog'

// POST /api/payroll/[id]/cancel
// body: { reason?: string }
// Cancels a payroll record at ANY status (draft, finalized, or paid). The record
// is never deleted — only marked 'cancelled' — so the audit trail stays intact
// even for a payslip that had already been marked paid. Use with care: cancelling
// a 'paid' record does not reverse any actual money movement outside this system;
// it only marks the record so it stops counting toward reports and stops showing
// to the employee. Any real-world reversal (bank reversal, manual correction)
// is the admin's responsibility outside this app.
export default defineEventHandler(async (event) => {
  const session = requireAdmin(event)
  await connectDB()

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const record = await PayrollRecord.findById(id)
  if (!record) throw createError({ statusCode: 404, statusMessage: 'Payslip not found' })

  if (record.status === 'cancelled') {
    throw createError({ statusCode: 400, statusMessage: 'This payslip is already cancelled' })
  }

  const statusBefore = record.status
  record.statusBeforeCancellation = record.status
  record.status = 'cancelled'
  record.cancelledAt = new Date()
  record.cancelledBy = session.id
  record.cancellationReason = (body?.reason || '').trim()
  await record.save()

  // Cancelling a payroll record is high-stakes — especially at 'paid' status,
  // where real money may have already moved — so this gets logged with the
  // reason and the status it was cancelled from, not just a generic update entry.
  await logAudit(event, {
    action: 'payroll.cancel',
    resourceType: 'PayrollRecord',
    resourceId: record._id,
    before: { status: statusBefore },
    after: { status: 'cancelled' },
    meta: { reason: record.cancellationReason, statusBeforeCancellation: statusBefore }
  })

  return { record }
})
