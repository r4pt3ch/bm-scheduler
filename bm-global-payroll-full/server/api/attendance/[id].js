import { connectDB } from '../../utils/db'
import Attendance from '../../models/Attendance'
import { requireAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await connectDB()
  const id = getRouterParam(event, 'id')

  if (event.method === 'PUT') {
    const body = await readBody(event)
    const record = await Attendance.findByIdAndUpdate(id, body, { new: true })
    if (!record) throw createError({ statusCode: 404, statusMessage: 'Record not found' })
    return record
  }

  if (event.method === 'DELETE') {
    await Attendance.findByIdAndDelete(id)
    return { success: true }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})