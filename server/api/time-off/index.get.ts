import { getQuery } from 'h3'
import { getAuthUser } from '../../utils/auth'
import TimeOffRequest from '../../models/TimeOffRequest'

export default defineEventHandler(async (event) => {
  const authUser = getAuthUser(event)
  const query = getQuery(event)

  const filter: Record<string, unknown> = {}

  if (authUser.role === 'employee') {
    filter.employeeId = authUser.userId
  } else if (query.employeeId) {
    filter.employeeId = query.employeeId
  }

  if (query.status) {
    filter.status = query.status
  }

  const requests = await TimeOffRequest.find(filter)
    .populate('employeeId', 'name email color department position')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 })

  return { requests }
})
