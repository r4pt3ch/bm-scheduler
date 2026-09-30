import PayrollRecord from '~/server/models/PayrollRecord'
import { requireAdmin } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/auditLog'

// POST /api/payroll/finalize  { runLabel, status: 'finalized' | 'paid' }
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await connectDB()

  const body = await readBody(event)
  const { runLabel, status } = body

  if (!runLabel || !['finalized', 'paid'].includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'runLabel and a valid status are required' })
  }

  const result = await PayrollRecord.updateMany({ runLabel }, { status })

  await logAudit(event, {
    action: 'payroll.bulk_status_change',
    resourceType: 'PayrollRecord',
    meta: { runLabel, newStatus: status, updatedCount: result.modifiedCount }
  })

  return { updated: result.modifiedCount }
})
