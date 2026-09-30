import { signKioskToken, setKioskSessionCookie } from '~/server/utils/auth'
import { verifyKioskPassword, hasKioskPasswordBeenSet } from '~/server/utils/kioskSettings'

// POST /api/dtr/kiosk-unlock
// body: { password }
// No employee auth required — this is the device-level gate that unlocks the
// kiosk screen for a full shift. Returns a kiosk session cookie (different
// cookie name/shape from the regular employee session) that only grants access
// to the DTR punch flow, nothing else.
export default defineEventHandler(async (event) => {
  await connectDB()

  const body = await readBody(event)
  const password = body?.password || ''

  if (!await hasKioskPasswordBeenSet()) {
    throw createError({ statusCode: 503, statusMessage: 'Kiosk password has not been configured yet. An admin must set it first.' })
  }

  const valid = await verifyKioskPassword(password)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Incorrect kiosk password' })
  }

  const token = signKioskToken()
  setKioskSessionCookie(event, token)

  return { success: true }
})
