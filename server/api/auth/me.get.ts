import { getAuthUser } from '../../utils/auth'
import User from '../../models/User'

export default defineEventHandler(async (event) => {
  const authUser = getAuthUser(event)
  const user = await User.findById(authUser.userId).select('-password')
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }
  return { user }
})
