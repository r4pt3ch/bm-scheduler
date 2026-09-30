import mongoose from 'mongoose'

const { Schema } = mongoose

// Minimal key-value store for app-wide settings that don't belong on any
// single Employee/PayrollRecord document — e.g. the DTR kiosk password hash.
// Each setting is one document, keyed by a unique string.
const AppSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
)

export default mongoose.models.AppSetting || mongoose.model('AppSetting', AppSettingSchema)
