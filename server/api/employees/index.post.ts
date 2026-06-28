import { readBody, createError } from 'h3'
import { requireManager } from '../../utils/auth'
import User from '../../models/User'

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
]

export default defineEventHandler(async (event) => {
  requireManager(event)
  const body = await readBody(event)

  const { name, email, password, role, position, department, phone, hourlyRate, availability } = body

  if (!name || !email || !password) {
    throw createError({ statusCode: 400, message: 'Name, email, and password are required' })
  }

  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) {
    throw createError({ statusCode: 409, message: 'An account with this email already exists' })
  }

  const count = await User.countDocuments()
  const color = COLORS[count % COLORS.length]

  const user = await User.create({
    name,
    email,
    password,
    role: role || 'employee',
    position: position || '',
    department: department || '',
    phone: phone || '',
    hourlyRate: hourlyRate || 0,
    color,
    availability: availability || undefined
  })

  const { password: _, ...userObj } = user.toObject()
  return { employee: userObj }
})
