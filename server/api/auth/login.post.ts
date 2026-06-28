import { readBody, setCookie, createError } from 'h3'
import User from '../../models/User'
import { signToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const { email, password } = await readBody(event)

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'Email and password are required' })
  }

  const user = await User.findOne({ email: email.toLowerCase(), isActive: true })
  if (!user) {
    throw createError({ statusCode: 401, message: 'Invalid email or password' })
  }

  const isValid = await user.comparePassword(password)
  if (!isValid) {
    throw createError({ statusCode: 401, message: 'Invalid email or password' })
  }

  const token = signToken({
    userId: user._id.toString(),
    role: user.role,
    name: user.name,
    email: user.email
  })

  setCookie(event, 'auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  })

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      position: user.position,
      department: user.department,
      color: user.color
    }
  }
})
