import mongoose from 'mongoose'

const { Schema } = mongoose

const LeaveRequestSchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    type: { type: String, enum: ['vacation', 'sick', 'unpaid', 'other'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true, min: 0.5 },
    reason: { type: String, trim: true, default: '' },

    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    reviewedAt: { type: Date, default: null },
    reviewNotes: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
)

export default mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', LeaveRequestSchema)
