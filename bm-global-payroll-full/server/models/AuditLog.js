import mongoose from 'mongoose'

const { Schema } = mongoose

// One AuditLog entry = one write action taken by an authenticated user.
// Captures enough context to answer "who changed what, when" without storing
// every field of every document forever — before/after snapshots are kept,
// but callers should avoid logging huge payloads (e.g. full attendance bulk
// imports log a summary, not every row).
const AuditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'Employee', default: null }, // null if the action was unauthenticated (shouldn't normally happen for writes)
    actorEmail: { type: String, default: '' }, // denormalized snapshot in case the actor account is later separated/changed
    actorRole: { type: String, default: '' },

    action: { type: String, required: true }, // e.g. "employee.update", "payroll.generate", "leave.approve"
    resourceType: { type: String, default: '' }, // e.g. "Employee", "PayrollRecord"
    resourceId: { type: Schema.Types.Mixed, default: null },

    // Snapshots — kept loose (Mixed) since the shape varies per resource type.
    // Sensitive fields (passwordHash) are stripped by the logging helper before
    // they ever reach here.
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },

    // Free-form extra context (e.g. { generated: 12, errors: [...] } for a payroll run)
    meta: { type: Schema.Types.Mixed, default: null },

    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' }
  },
  { timestamps: true }
)

AuditLogSchema.index({ createdAt: -1 })
AuditLogSchema.index({ actor: 1, createdAt: -1 })
AuditLogSchema.index({ action: 1, createdAt: -1 })

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema)
