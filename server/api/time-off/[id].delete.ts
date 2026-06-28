import { createError } from 'h3'
import { getAuthUser } from '../../utils/auth'
import TimeOffRequest from '../../models/TimeOffRequest'

export default defineEventHandler(async (event) => {
  const authUser = getAuthUser(event)
  const id = event.context.params?.id

  const request = await TimeOffRequest.findById(id)
  if (!request) {
    throw createError({ statusCode: 404, message: 'Request not found' })
  }

  // Only the employee or a manager can delete
  if (authUser.role !== 'manager' && request.employeeId.toString() !== authUser.userId) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  await TimeOffRequest.findByIdAndDelete(id)
  return { success: true }
})
