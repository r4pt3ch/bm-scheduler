import Employee from '~/server/models/Employee'
import { signToken, setSessionCookie } from '~/server/utils/auth'
import { logLoginAttempt } from '~/server/utils/auditLog'

export default defineEventHandler(async (event) => {
  await connectDB()

  const body = await readBody(event)
  const email = (body?.email || '').trim().toLowerCase()
  const password = body?.password || ''

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Email and password are required' })
  }

  const employee = await Employee.findOne({ email })
  if (!employee) {
    await logLoginAttempt(event, { success: false, emailAttempted: email, failureReason: 'unknown_email' })
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }

  if (employee.status === 'separated') {
    await logLoginAttempt(event, {
      success: false,
      emailAttempted: email,
      employeeId: employee._id,
      failureReason: 'account_separated'
    })
    throw createError({ statusCode: 403, statusMessage: 'This account no longer has access' })
  }

  const valid = await employee.comparePassword(password)
  if (!valid) {
    await logLoginAttempt(event, {
      success: false,
      emailAttempted: email,
      employeeId: employee._id,
      failureReason: 'invalid_password'
    })
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }

  const token = signToken({
    id: employee._id.toString(),
    role: employee.role,
    email: employee.email,
    name: employee.fullName
  })

  setSessionCookie(event, token)

  await logLoginAttempt(event, { success: true, emailAttempted: email, employeeId: employee._id })

  return {
    user: {
      id: employee._id,
      email: employee.email,
      role: employee.role,
      name: employee.fullName,
      mustChangePassword: employee.mustChangePassword
    }
  }
})
