import { requireAuth } from '~/server/utils/auth'

// POST /api/dtr/punch
// Deprecated/disabled: self-service clock in/out from the main app has been
// removed. Punching is now only allowed through the DTR Kiosk
// (/api/dtr/kiosk-punch), which every role — including employees — must use.
// This endpoint is kept (rather than deleted) so any stale client/cached
// build hitting it gets a clear, actionable error instead of a 404.
export default defineEventHandler(async (event) => {
  requireAuth(event)
  throw createError({
    statusCode: 410,
    statusMessage: 'Self-service clock in/out has been discontinued. Please use the DTR Kiosk to clock in or out.'
  })
})
