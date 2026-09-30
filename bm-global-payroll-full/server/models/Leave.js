import mongoose from 'mongoose'

const LeaveSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  type: { type: String, enum: ['vacation', 'sick', 'emergency', 'unpaid', 'other'], default: 'vacation' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  reviewedAt: { type: Date, default: null }
}, { timestamps: true })

export default mongoose.models.Leave || mongoose.model('Leave', LeaveSchema)
