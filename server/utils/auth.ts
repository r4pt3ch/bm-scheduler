import jwt from 'jsonwebtoken'
import { H3Event, getCookie, createError } from 'h3'

export interface JWTPayload {
  userId: string
  role: string
  name: string
  email: string
}

export function signToken(payload: JWTPayload): string {
  const config = useRuntimeConfig()
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload {
  const config = useRuntimeConfig()
  return jwt.verify(token, config.jwtSecret) as JWTPayload
}

export function getAuthUser(event: H3Event): JWTPayload {
  const token = getCookie(event, 'auth_token')
  if (!token) {
    throw createError({ statusCode: 401, message: 'Unauthorized: No token provided' })
  }
  try {
    return verifyToken(token)
  } catch {
    throw createError({ statusCode: 401, message: 'Unauthorized: Invalid or expired token' })
  }
}

export function requireManager(event: H3Event): JWTPayload {
  const user = getAuthUser(event)
  if (user.role !== 'manager') {
    throw createError({ statusCode: 403, message: 'Forbidden: Manager access required' })
  }
  return user
}
