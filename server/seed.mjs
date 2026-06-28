/**
 * Seed script — run with: node server/seed.mjs
 * Creates a default manager account and some sample employees.
 * Requires MONGODB_URI in .env
 */
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env manually
try {
  const env = readFileSync(resolve(process.cwd(), '.env'), 'utf8')
  for (const line of env.split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
  }
} catch {}

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI is not set in .env')
  process.exit(1)
}

const UserSchema = new mongoose.Schema({
  name: String, email: { type: String, unique: true }, password: String,
  role: { type: String, default: 'employee' },
  position: String, department: String, phone: String, hourlyRate: Number,
  color: String, isActive: { type: Boolean, default: true },
  availability: {
    monday: Boolean, tuesday: Boolean, wednesday: Boolean,
    thursday: Boolean, friday: Boolean, saturday: Boolean, sunday: Boolean
  }
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', UserSchema)

const seed = [
  {
    name: 'Alex Manager', email: 'manager@demo.com', password: 'manager123',
    role: 'manager', position: 'Store Manager', department: 'Management',
    color: '#7c3aed', hourlyRate: 25,
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false }
  },
  {
    name: 'Sarah Johnson', email: 'sarah@demo.com', password: 'employee123',
    role: 'employee', position: 'Cashier', department: 'Front End',
    color: '#3b82f6', hourlyRate: 15,
    availability: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: false }
  },
  {
    name: 'Mike Chen', email: 'mike@demo.com', password: 'employee123',
    role: 'employee', position: 'Stocker', department: 'Inventory',
    color: '#10b981', hourlyRate: 14,
    availability: { monday: false, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }
  },
  {
    name: 'Emma Wilson', email: 'emma@demo.com', password: 'employee123',
    role: 'employee', position: 'Customer Service', department: 'Front End',
    color: '#f59e0b', hourlyRate: 16,
    availability: { monday: true, tuesday: false, wednesday: true, thursday: false, friday: true, saturday: true, sunday: false }
  }
]

await mongoose.connect(MONGODB_URI)
console.log('✅ Connected to MongoDB')

for (const userData of seed) {
  const existing = await User.findOne({ email: userData.email })
  if (existing) {
    console.log(`⏭  Skipped (already exists): ${userData.email}`)
    continue
  }
  userData.password = await bcrypt.hash(userData.password, 12)
  await User.create(userData)
  console.log(`✅ Created: ${userData.name} (${userData.email})`)
}

console.log('\n🎉 Seed complete!\n')
console.log('📧 Manager login:  manager@demo.com  /  manager123')
console.log('📧 Employee login: sarah@demo.com    /  employee123')

await mongoose.disconnect()
