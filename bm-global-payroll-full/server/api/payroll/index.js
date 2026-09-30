import PayrollRecord from '~/server/models/PayrollRecord'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = requireAuth(event)
  await connectDB()

  const query = getQuery(event)
  const filter = {}

  if (session.role !== 'admin' && session.role !== 'super_admin') {
    filter.employee = session.id
    filter.status = { $nin: ['draft', 'cancelled'] } // employees never see draft or cancelled payslips
  } else {
    if (query.employee) filter.employee = query.employee
    if (query.status) filter.status = query.status
  }

  if (query.runLabel) filter.runLabel = query.runLabel

  const records = await PayrollRecord.find(filter)
    .sort({ periodStart: -1 })
    .populate('employee', 'firstName lastName employeeNumber department position')

  return { records }
})
