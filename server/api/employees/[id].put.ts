import { readBody, createError } from 'h3'
import { getAuthUser } from '../../utils/auth'
import User from '../../models/User'

export default defineEventHandler(async (event) => {
  const authUser = getAuthUser(event)
  const id = event.context.params?.id

  // Employees can only edit their own profile; managers can edit anyone
  if (authUser.role !== 'manager' && authUser.userId !== id) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const body = await readBody(event)
  const allowedFields = ['name', 'phone', 'position', 'department', 'hourlyRate', 'availability', 'color', 'isActive']

  // Only managers can update role
  if (authUser.role === 'manager') allowedFields.push('role', 'email')

  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field]
  }

  // Handle password separately
  if (body.password && body.password.length >= 6) {
    const user = await User.findById(id)
    if (user) {
      user.password = body.password
      await user.save()
    }
  }

  const updated = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password')
  if (!updated) {
    throw createError({ statusCode: 404, message: 'Employee not found' })
  }

  return { employee: updated }
})
