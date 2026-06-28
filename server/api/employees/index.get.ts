import { getAuthUser } from '../../utils/auth'
import User from '../../models/User'

export default defineEventHandler(async (event) => {
  getAuthUser(event)
  const users = await User.find({ isActive: true }).select('-password').sort({ name: 1 })
  return { employees: users }
})
