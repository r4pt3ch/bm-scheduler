import { readBody, createError } from 'h3'
import { getAuthUser } from '../../utils/auth'
import TimeOffRequest from '../../models/TimeOffRequest'

export default defineEventHandler(async (event) => {
  const authUser = getAuthUser(event)
  const body = await readBody(event)

  const { startDate, endDate, type, reason } = body

  if (!startDate || !endDate || !type) {
    throw createError({ statusCode: 400, message: 'Start date, end date, and type are required' })
  }

  if (new Date(endDate) < new Date(startDate)) {
    throw createError({ statusCode: 400, message: 'End date must be after start date' })
  }

  const request = await TimeOffRequest.create({
    employeeId: authUser.userId,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    type,
    reason: reason || ''
  })

  const populated = await request.populate('employeeId', 'name email color department position')

  return { request: populated }
})
