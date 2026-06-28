import { getAuthUser } from '../../utils/auth'
import User from '../../models/User'

export default defineEventHandler(async (event) => {
  getAuthUser(event)
  const id = event.context.params?.id

  const user = await User.findById(id).select('-password')
  if (!user) {
    throw createError({ statusCode: 404, message: 'Employee not found' })
  }
  return { employee: user }
})
