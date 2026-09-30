import PayrollRecord from '~/server/models/PayrollRecord'
import { requireAdmin } from '~/server/utils/auth'
import { logAudit } from '~/server/utils/auditLog'

// POST /api/payroll/bulk-delete
// body: { runLabel } and/or { ids: [] } — at least one is required
//
// Bulk equivalent of DELETE /api/payroll/[id]. Mirrors that endpoint's safety
// rule exactly: only 'draft' records can be hard-deleted, regardless of how
// they're targeted. Anything finalized, paid, or already cancelled is silently
// excluded from the match rather than erroring the whole request — this lets
// a caller pass a runLabel for a run that's a mix of draft and finalized
// records and just have the drafts cleared out.
//
// Deletion is NOT the tool for retiring finalized/paid records — that's what
// POST /api/payroll/[id]/cancel is for, since it preserves the record and
// audit trail. This endpoint only ever removes drafts, same as the individual
// delete route.
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await connectDB()

  const body = await readBody(event)
  const { runLabel, ids } = body || {}

  const hasIds = Array.isArray(ids) && ids.length > 0
  if (!runLabel && !hasIds) {
    throw createError({ statusCode: 400, statusMessage: 'runLabel or ids is required' })
  }

  const filter = { status: 'draft' }
  if (runLabel) filter.runLabel = runLabel
  if (hasIds) filter._id = { $in: ids }

  const records = await PayrollRecord.find(filter)
  if (records.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'No draft payroll records matched for deletion' })
  }

  const deletedIds = records.map((r) => r._id)
  const snapshots = records.map((r) => {
    const obj = r.toObject()
    return { _id: obj._id, employee: obj.employee, periodStart: obj.periodStart, periodEnd: obj.periodEnd, netPay: obj.netPay }
  })

  await PayrollRecord.deleteMany({ _id: { $in: deletedIds } })

  // Logged as one summarized entry for the whole batch — same convention as
  // payroll.generate and payroll.bulk_status_change — rather than one entry
  // per deleted record.
  await logAudit(event, {
    action: 'payroll.bulk_delete_draft',
    resourceType: 'PayrollRecord',
    meta: {
      runLabel: runLabel || null,
      requestedIds: hasIds ? ids : null,
      deletedCount: deletedIds.length,
      deletedRecords: snapshots
    }
  })

  return { deleted: deletedIds.length }
})
