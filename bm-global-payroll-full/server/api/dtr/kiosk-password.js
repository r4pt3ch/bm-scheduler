import { requireAdmin } from '~/server/utils/auth'
import { setKioskPassword, hasKioskPasswordBeenSet } from '~/server/utils/kioskSettings'
import { logAudit } from '~/server/utils/auditLog'

// GET: whether a kiosk password has been set yet (never returns the password itself)
// POST: set/replace the kiosk password — body: { password }
export default defineEventHandler(async (event) => {
  const session = requireAdmin(event)
  await connectDB()

  if (event.method === 'GET') {
    const isSet = await hasKioskPasswordBeenSet()
    return { isSet }
  }

  if (event.method === 'POST') {
    const body = await readBody(event)
    const password = body?.password || ''

    if (password.length < 6) {
      throw createError({ statusCode: 400, statusMessage: 'Kiosk password must be at least 6 characters' })
    }

    await setKioskPassword(password)

    await logAudit(event, {
      action: 'dtr.kiosk_password_set',
      resourceType: 'AppSetting'
      // deliberately no before/after/meta — never log anything password-related
    })

    return { success: true }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
