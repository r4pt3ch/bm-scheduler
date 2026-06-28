import { requireManager } from '../../utils/auth'
import User from '../../models/User'

export default defineEventHandler(async (event) => {
  requireManager(event)
  const id = event.context.params?.id

  // Soft delete
  const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true })
  if (!user) {
    throw createError({ statusCode: 404, message: 'Employee not found' })
  }
  return { success: true }
})
