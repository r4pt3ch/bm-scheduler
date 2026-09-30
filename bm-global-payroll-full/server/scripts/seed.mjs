/**
 * Seed script — creates the first admin account and (optionally) a couple of
 * sample employees so you can explore the system right away.
 *
 * Usage:
 *   1. Copy .env.example to .env and set NUXT_MONGODB_URI
 *   2. npm run seed
 *
 * Note: this script runs standalone via Node (not through Nuxt's runtimeConfig
 * system), so it reads process.env directly. It accepts either NUXT_MONGODB_URI
 * (the name used by the Nuxt app itself) or a plain MONGODB_URI, for convenience.
 */
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.NUXT_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/bm_global_payroll'

const EmployeeSchema = new mongoose.Schema(
  {
    employeeNumber: String,
    firstName: String,
    middleName: String,
    lastName: String,
    email: String,
    passwordHash: String,
    role: String,
    department: String,
    position: String,
    employmentType: String,
    dateHired: Date,
    status: String,
    basicSalary: Number,
    payFrequency: String,
    allowances: { deMinimis: Number, taxableAllowance: Number },
    governmentIds: { sssNumber: String, philhealthNumber: String, pagibigNumber: String, tin: String },
    leaveCredits: { vacation: Number, sick: Number },
    mustChangePassword: Boolean
  },
  { timestamps: true }
)

const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema)

async function run() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to', MONGODB_URI)

  const superAdminEmail = 'superadmin@bmglobalventures.com'
  const existingSuperAdmin = await Employee.findOne({ email: superAdminEmail })

  if (existingSuperAdmin) {
    console.log('Super admin account already exists:', superAdminEmail)
  } else {
    const passwordHash = await bcrypt.hash('ChangeMe123!', 10)
    await Employee.create({
      employeeNumber: 'BMGV-0000',
      firstName: 'System',
      lastName: 'Super Admin',
      email: superAdminEmail,
      passwordHash,
      role: 'super_admin',
      department: 'IT / Systems',
      position: 'Super Administrator',
      employmentType: 'regular',
      dateHired: new Date(),
      status: 'active',
      basicSalary: 0,
      payFrequency: 'semi-monthly',
      allowances: { deMinimis: 0, taxableAllowance: 0 },
      governmentIds: {},
      leaveCredits: { vacation: 0, sick: 0 },
      mustChangePassword: true
    })
    console.log('Created super admin account:')
    console.log('  Email:    ', superAdminEmail)
    console.log('  Password: ', 'ChangeMe123!')
    console.log('  (You will be required to change this password on first login.)')
    console.log('  This account can access Audit Trail and Login Logs, which no other role can see.')
  }

  const adminEmail = 'admin@bmglobalventures.com'
  const existingAdmin = await Employee.findOne({ email: adminEmail })

  if (existingAdmin) {
    console.log('Admin account already exists:', adminEmail)
  } else {
    const passwordHash = await bcrypt.hash('ChangeMe123!', 10)
    await Employee.create({
      employeeNumber: 'BMGV-0001',
      firstName: 'HR',
      lastName: 'Administrator',
      email: adminEmail,
      passwordHash,
      role: 'admin',
      department: 'Human Resources',
      position: 'Payroll Administrator',
      employmentType: 'regular',
      dateHired: new Date(),
      status: 'active',
      basicSalary: 40000,
      payFrequency: 'semi-monthly',
      allowances: { deMinimis: 0, taxableAllowance: 0 },
      governmentIds: {},
      leaveCredits: { vacation: 15, sick: 15 },
      mustChangePassword: true
    })
    console.log('Created admin account:')
    console.log('  Email:    ', adminEmail)
    console.log('  Password: ', 'ChangeMe123!')
    console.log('  (You will be required to change this password on first login.)')
  }

  const sampleEmail = 'juan.delacruz@bmglobalventures.com'
  const existingSample = await Employee.findOne({ email: sampleEmail })
  if (!existingSample) {
    const passwordHash = await bcrypt.hash('Welcome123!', 10)
    await Employee.create({
      employeeNumber: 'BMGV-0002',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      email: sampleEmail,
      passwordHash,
      role: 'employee',
      department: 'Operations',
      position: 'Operations Associate',
      employmentType: 'regular',
      dateHired: new Date('2024-01-15'),
      status: 'active',
      basicSalary: 25000,
      payFrequency: 'semi-monthly',
      allowances: { deMinimis: 1500, taxableAllowance: 0 },
      governmentIds: { sssNumber: '', philhealthNumber: '', pagibigNumber: '', tin: '' },
      leaveCredits: { vacation: 15, sick: 15 },
      mustChangePassword: true
    })
    console.log('Created sample employee:')
    console.log('  Email:    ', sampleEmail)
    console.log('  Password: ', 'Welcome123!')
  } else {
    console.log('Sample employee already exists:', sampleEmail)
  }

  await mongoose.disconnect()
  console.log('Done.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
