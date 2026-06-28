import { requireManager } from '../../utils/auth'
import Shift from '../../models/Shift'

export default defineEventHandler(async (event) => {
  requireManager(event)
  const id = event.context.params?.id

  const shift = await Shift.findByIdAndDelete(id)
  if (!shift) {
    throw createError({ statusCode: 404, message: 'Shift not found' })
  }

  return { success: true }
})
