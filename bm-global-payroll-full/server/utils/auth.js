import jwt from 'jsonwebtoken'

const COOKIE_NAME = 'bm_payroll_session'
const TOKEN_TTL = '8h'

export function signToken(payload) {
  const config = useRuntimeConfig()
  return jwt.sign(payload, config.jwtSecret, { expiresIn: TOKEN_TTL })
}

export function verifyToken(token) {
  const config = useRuntimeConfig()
  try {
    return jwt.verify(token, config.jwtSecret)
  } catch {
    return null
  }
}

export function setSessionCookie(event, token) {
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8 // 8 hours
  })
}

export function clearSessionCookie(event) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

export function getSessionFromEvent(event) {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return null
  return verifyToken(token)
}

/**
 * Throws a 401 if there's no valid session. Returns the decoded session payload
 * ({ id, role, email }) otherwise. Use at the top of any protected API handler.
 */
export function requireAuth(event) {
  const session = getSessionFromEvent(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }
  return session
}

/**
 * Throws a 403 if the authenticated user isn't an admin or super_admin.
 * super_admin is treated as a superset of admin — anywhere admin access is
 * required, a super_admin can do it too.
 */
export function requireAdmin(event) {
  const session = requireAuth(event)
  if (session.role !== 'admin' && session.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }
  return session
}

/**
 * Throws a 403 if the authenticated user isn't specifically a super_admin.
 * Use for the most sensitive views — audit trail, login logs, managing other
 * admins' roles — where even a regular admin shouldn't have access.
 */
export function requireSuperAdmin(event) {
  const session = requireAuth(event)
  if (session.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Super admin access required' })
  }
  return session
}

// --- DTR Kiosk session ---
// Deliberately separate from the main employee session above: different
// cookie name, different token payload shape (kiosk: true, no id/role/email),
// and verified with its own helper. This makes it structurally impossible for
// a kiosk session to be mistaken for — or escalated into — a real employee
// login anywhere else in the app. A kiosk session grants access to exactly
// one thing: the DTR punch flow for whichever employee identifies themselves
// with a valid PIN at that moment. It never carries any employee identity by
// itself.
const KIOSK_COOKIE_NAME = 'bm_payroll_kiosk_session'
const KIOSK_TOKEN_TTL = '12h' // kiosks are meant to stay unlocked for a full shift/day

export function signKioskToken() {
  const config = useRuntimeConfig()
  return jwt.sign({ kiosk: true }, config.jwtSecret, { expiresIn: KIOSK_TOKEN_TTL })
}

export function setKioskSessionCookie(event, token) {
  setCookie(event, KIOSK_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12
  })
}

export function clearKioskSessionCookie(event) {
  deleteCookie(event, KIOSK_COOKIE_NAME, { path: '/' })
}

/**
 * Throws a 401 if there's no valid kiosk session unlocked on this device.
 * Use at the top of every kiosk-facing API handler (employee list for the
 * picker, PIN verification, punch). Does NOT accept a regular employee
 * session token — the kiosk cookie is a completely separate cookie.
 */
export function requireKioskSession(event) {
  const token = getCookie(event, KIOSK_COOKIE_NAME)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Kiosk is locked' })
  }
  const config = useRuntimeConfig()
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    if (!payload?.kiosk) {
      throw createError({ statusCode: 401, statusMessage: 'Kiosk is locked' })
    }
    return payload
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Kiosk is locked' })
  }
}
