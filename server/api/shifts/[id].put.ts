import { readBody } from 'h3'
import { requireManager } from '../../utils/auth'
import Shift from '../../models/Shift'

export default defineEventHandler(async (event) => {
  requireManager(event)
  const id = event.context.params?.id
  const body = await readBody(event)

  const updates: Record<string, unknown> = {}
  const fields = ['date', 'startTime', 'endTime', 'position', 'department', 'notes', 'status', 'employeeId']

  for (const field of fields) {
    if (body[field] !== undefined) {
      updates[field] = field === 'date' ? new Date(body[field]) : body[field]
    }
  }

  const shift = await Shift.findByIdAndUpdate(id, updates, { new: true })
    .populate('employeeId', 'name email color position department')

  if (!shift) {
    throw createError({ statusCode: 404, message: 'Shift not found' })
  }

  return { shift }
})
