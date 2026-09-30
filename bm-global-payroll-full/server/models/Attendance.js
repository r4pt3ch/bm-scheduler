import mongoose from 'mongoose'

const { Schema } = mongoose

// One record per employee per calendar date.
// Manual entry per cutoff: HR/admin records days worked, absences, leaves, late/undertime.
const AttendanceSchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },

    // 'no-work' = day the employee was never expected/scheduled to work (default —
    //   an untouched row is treated as unpaid, not silently paid). Different from
    //   'absent', which is a scheduled work day the employee failed to show up for
    //   (a disciplinary/attendance-policy distinction). Both are unpaid, but tracked
    //   separately in payroll (see server/utils/payrollEngine.js).
    status: {
      type: String,
      enum: [
        'no-work',
        'present',
        'absent',
        'half-day',
        'leave',
        'rest-day',
        'special-non-working-day',
        'regular-holiday'
      ],
      default: 'no-work'
    },

    // Hours actually rendered that day (for regular + overtime computation)
    hoursWorked: { type: Number, default: 8, min: 0, max: 24 },
    overtimeHours: { type: Number, default: 0, min: 0, max: 16 },

    // Manually-entered clock times, stored as "HH:mm" (24-hour) strings —
    // purely for record-keeping/display alongside the computed late/undertime
    // minutes below. Not parsed into late/undertime automatically; admin still
    // enters those directly.
    timeIn: { type: String, trim: true, default: '' },
    timeOut: { type: String, trim: true, default: '' },

    // Late / undertime in minutes, deducted from pay at hourly rate
    lateMinutes: { type: Number, default: 0, min: 0 },
    undertimeMinutes: { type: Number, default: 0, min: 0 },

    // If status === 'leave', link to which leave type was applied
    leaveType: { type: String, enum: ['vacation', 'sick', 'unpaid', null], default: null },

    notes: { type: String, trim: true, default: '' },

    recordedBy: { type: Schema.Types.ObjectId, ref: 'Employee' }
  },
  { timestamps: true }
)

AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true })

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema)
