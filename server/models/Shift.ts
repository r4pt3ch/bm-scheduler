import mongoose, { Schema, Document } from 'mongoose'

export interface IShift extends Document {
  employeeId: mongoose.Types.ObjectId
  date: Date
  startTime: string
  endTime: string
  position: string
  department: string
  notes: string
  status: 'scheduled' | 'completed' | 'cancelled'
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const ShiftSchema = new Schema<IShift>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    position: { type: String, default: '' },
    department: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
)

ShiftSchema.index({ date: 1, employeeId: 1 })
ShiftSchema.index({ date: 1 })

export default mongoose.models.Shift || mongoose.model<IShift>('Shift', ShiftSchema)
