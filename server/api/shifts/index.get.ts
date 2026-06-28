import { getQuery } from 'h3'
import { getAuthUser } from '../../utils/auth'
import Shift from '../../models/Shift'

export default defineEventHandler(async (event) => {
  const authUser = getAuthUser(event)
  const query = getQuery(event)

  const filter: Record<string, unknown> = {}

  if (query.startDate && query.endDate) {
    filter.date = {
      $gte: new Date(query.startDate as string),
      $lte: new Date(query.endDate as string)
    }
  }

  // Employees only see their own shifts
  if (authUser.role === 'employee') {
    filter.employeeId = authUser.userId
  } else if (query.employeeId) {
    filter.employeeId = query.employeeId
  }

  const shifts = await Shift.find(filter)
    .populate('employeeId', 'name email color position department')
    .populate('createdBy', 'name')
    .sort({ date: 1, startTime: 1 })

  return { shifts }
})
