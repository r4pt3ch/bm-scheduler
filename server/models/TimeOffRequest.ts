import mongoose, { Schema, Document } from 'mongoose'

export interface ITimeOffRequest extends Document {
  employeeId: mongoose.Types.ObjectId
  startDate: Date
  endDate: Date
  type: 'vacation' | 'sick' | 'personal' | 'other'
  reason: string
  status: 'pending' | 'approved' | 'denied'
  reviewedBy?: mongoose.Types.ObjectId
  reviewNote?: string
  createdAt: Date
  updatedAt: Date
}

const TimeOffRequestSchema = new Schema<ITimeOffRequest>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    type: { type: String, enum: ['vacation', 'sick', 'personal', 'other'], required: true },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String, default: '' }
  },
  { timestamps: true }
)

TimeOffRequestSchema.index({ employeeId: 1, status: 1 })

export default mongoose.models.TimeOffRequest || mongoose.model<ITimeOffRequest>('TimeOffRequest', TimeOffRequestSchema)
