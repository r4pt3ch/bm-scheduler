import mongoose from 'mongoose'

const { Schema } = mongoose

// One LoginLog entry per login ATTEMPT — both successes and failures are
// recorded. Failures matter for security (repeated failed attempts against
// one account, or one IP hitting many accounts, are the signal worth seeing).
const LoginLogSchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', default: null }, // null if the email didn't match any account
    emailAttempted: { type: String, default: '' }, // always recorded, even on failure, so a brute-force pattern is visible

    success: { type: Boolean, required: true },
    failureReason: { type: String, default: '' }, // e.g. "invalid_password", "account_separated", "unknown_email"

    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },

    // Parsed from the User-Agent string for quick display — best-effort, not
    // a substitute for the raw userAgent field above, which is also kept.
    device: { type: String, default: '' }, // e.g. "Desktop", "Mobile", "Tablet"
    browser: { type: String, default: '' }, // e.g. "Chrome", "Safari"
    os: { type: String, default: '' } // e.g. "Windows", "macOS", "Android"
  },
  { timestamps: true }
)

LoginLogSchema.index({ createdAt: -1 })
LoginLogSchema.index({ employee: 1, createdAt: -1 })

export default mongoose.models.LoginLog || mongoose.model('LoginLog', LoginLogSchema)
