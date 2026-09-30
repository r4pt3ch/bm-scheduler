import Employee from '~/server/models/Employee'
import { getSessionFromEvent } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = getSessionFromEvent(event)
  if (!session) {
    return { user: null }
  }

  await connectDB()
  const employee = await Employee.findById(session.id)
  if (!employee || employee.status === 'separated') {
    return { user: null }
  }

  return {
    user: {
      id: employee._id,
      email: employee.email,
      role: employee.role,
      name: employee.fullName,
      employeeNumber: employee.employeeNumber,
      mustChangePassword: employee.mustChangePassword
    }
  }
})
