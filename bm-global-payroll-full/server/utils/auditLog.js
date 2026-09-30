import AuditLog from '~/server/models/AuditLog'
import LoginLog from '~/server/models/LoginLog'
import { parseUserAgent } from '~/server/utils/userAgent'
import { getSessionFromEvent } from '~/server/utils/auth'

/**
 * Strips fields that should never be persisted in a log snapshot, even
 * though they may appear in a Mongoose document's before/after state.
 */
function sanitizeSnapshot(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const clone = { ...obj }
  delete clone.passwordHash
  delete clone.__v
  return clone
}

/**
 * Records one audit log entry for a write action. Call this AFTER the write
 * succeeds, passing the before/after state where relevant. Logging failures
 * are caught and swallowed (logged to console) rather than thrown — an audit
 * log write failing should never break the actual user-facing action it's
 * recording.
 *
 * @param {Object} event - the Nitro event (used to pull actor session, IP, UA)
 * @param {Object} params
 * @param {string} params.action - e.g. "employee.update", "payroll.cancel"
 * @param {string} [params.resourceType] - e.g. "Employee", "PayrollRecord"
 * @param {*} [params.resourceId]
 * @param {Object} [params.before]
 * @param {Object} [params.after]
 * @param {Object} [params.meta] - any extra free-form context
 */
export async function logAudit(event, { action, resourceType = '', resourceId = null, before = null, after = null, meta = null }) {
  try {
    const session = getSessionFromEvent(event)
    const ip = getRequestIP(event, { xForwardedFor: true }) || ''
    const ua = getRequestHeader(event, 'user-agent') || ''

    await AuditLog.create({
      actor: session?.id || null,
      actorEmail: session?.email || '',
      actorRole: session?.role || '',
      action,
      resourceType,
      resourceId,
      before: sanitizeSnapshot(before),
      after: sanitizeSnapshot(after),
      meta,
      ipAddress: ip,
      userAgent: ua
    })
  } catch (err) {
    // Never let audit logging break the actual request it's logging.
    console.error('[audit-log] failed to write entry:', err.message)
  }
}

/**
 * Records one login attempt — call this for BOTH successful and failed
 * logins. Failures matter as much as successes for spotting brute-force
 * patterns. Like logAudit, failures here are swallowed, not thrown.
 *
 * @param {Object} event
 * @param {Object} params
 * @param {boolean} params.success
 * @param {string} params.emailAttempted
 * @param {string} [params.employeeId] - only set on success (or if the email matched an account)
 * @param {string} [params.failureReason] - e.g. "invalid_password", "unknown_email", "account_separated"
 */
export async function logLoginAttempt(event, { success, emailAttempted, employeeId = null, failureReason = '' }) {
  try {
    const ip = getRequestIP(event, { xForwardedFor: true }) || ''
    const ua = getRequestHeader(event, 'user-agent') || ''
    const { device, browser, os } = parseUserAgent(ua)

    await LoginLog.create({
      employee: employeeId,
      emailAttempted,
      success,
      failureReason,
      ipAddress: ip,
      userAgent: ua,
      device,
      browser,
      os
    })
  } catch (err) {
    console.error('[login-log] failed to write entry:', err.message)
  }
}
