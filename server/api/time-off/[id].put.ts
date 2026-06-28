import { readBody, createError } from 'h3'
import { getAuthUser } from '../../utils/auth'
import TimeOffRequest from '../../models/TimeOffRequest'

export default defineEventHandler(async (event) => {
  const authUser = getAuthUser(event)
  const id = event.context.params?.id
  const body = await readBody(event)

  const request = await TimeOffRequest.findById(id)
  if (!request) {
    throw createError({ statusCode: 404, message: 'Request not found' })
  }

  // Managers can approve/deny; employees can only cancel their own pending requests
  if (authUser.role === 'manager') {
    if (body.status && ['approved', 'denied', 'pending'].includes(body.status)) {
      request.status = body.status
      request.reviewedBy = authUser.userId as unknown as typeof request.reviewedBy
      request.reviewNote = body.reviewNote || ''
    }
  } else {
    if (request.employeeId.toString() !== authUser.userId) {
      throw createError({ statusCode: 403, message: 'Forbidden' })
    }
    if (body.status === 'pending' && request.status === 'pending') {
      // Allow employee to cancel (by deleting or updating reason)
      request.reason = body.reason ?? request.reason
    }
  }

  await request.save()

  const populated = await request.populate([
    { path: 'employeeId', select: 'name email color department position' },
    { path: 'reviewedBy', select: 'name' }
  ])

  return { request: populated }
})
