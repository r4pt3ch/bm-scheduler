/**
 * Lightweight, dependency-free User-Agent parsing for login logs.
 * This is intentionally simple — good enough to show "Chrome on Windows
 * (Desktop)" in a log table, not a forensic-grade UA database. If precise
 * detection ever matters, swap this for a real package (e.g. ua-parser-js).
 */
export function parseUserAgent(ua) {
  if (!ua) return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' }

  const lower = ua.toLowerCase()

  // --- Device type ---
  let device = 'Desktop'
  if (/ipad|tablet/.test(lower)) {
    device = 'Tablet'
  } else if (/mobile|iphone|android/.test(lower)) {
    device = 'Mobile'
  }

  // --- OS ---
  let os = 'Unknown'
  if (lower.includes('windows')) os = 'Windows'
  else if (lower.includes('mac os') || lower.includes('macintosh')) os = 'macOS'
  else if (lower.includes('android')) os = 'Android'
  else if (lower.includes('iphone') || lower.includes('ipad') || lower.includes('ios')) os = 'iOS'
  else if (lower.includes('linux')) os = 'Linux'

  // --- Browser ---
  // Order matters: Edge/Chrome/Opera UAs all contain "safari" and many contain
  // "chrome" too, so check the more specific tokens first.
  let browser = 'Unknown'
  if (lower.includes('edg/') || lower.includes('edge/')) browser = 'Edge'
  else if (lower.includes('opr/') || lower.includes('opera')) browser = 'Opera'
  else if (lower.includes('chrome/') && !lower.includes('chromium')) browser = 'Chrome'
  else if (lower.includes('firefox/')) browser = 'Firefox'
  else if (lower.includes('safari/') && !lower.includes('chrome/')) browser = 'Safari'

  return { device, browser, os }
}
