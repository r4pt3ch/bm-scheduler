import mongoose from 'mongoose'

const { Schema } = mongoose

// One DtrEntry per employee per calendar date — holds the raw punch log for
// that day. This is a SEPARATE, independent system from Attendance.js: DTR is
// the employee's own self-service time clock (punch in/out), while Attendance
// stays the admin-entered record actually used for payroll computation. They
// intentionally don't drive each other — admins still manually mark
// attendance status as before; DTR exists purely as the employee's own
// reference/record of when they actually clocked in and out.
//
// Multiple in/out pairs per day are supported (e.g. clock out for an errand,
// clock back in) — punches is just an ordered log, not fixed slots.
const DtrEntrySchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true }, // calendar date this entry belongs to (midnight, local-day boundary)

    punches: [
      {
        type: { type: String, enum: ['in', 'out'], required: true },
        at: { type: Date, required: true }
      }
    ],

    notes: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
)

DtrEntrySchema.index({ employee: 1, date: 1 }, { unique: true })

// Total worked hours for the day, computed from completed in/out pairs.
// An unclosed trailing "in" punch (still clocked in) contributes 0 — it's
// only counted once a matching "out" exists.
DtrEntrySchema.methods.computeHoursWorked = function () {
  let totalMs = 0
  let openIn = null
  for (const punch of this.punches) {
    if (punch.type === 'in') {
      openIn = punch.at
    } else if (punch.type === 'out' && openIn) {
      totalMs += new Date(punch.at).getTime() - new Date(openIn).getTime()
      openIn = null
    }
  }
  return Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100
}

export default mongoose.models.DtrEntry || mongoose.model('DtrEntry', DtrEntrySchema)
