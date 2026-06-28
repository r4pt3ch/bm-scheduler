import { readBody, createError } from 'h3'
import { requireManager } from '../../utils/auth'
import Shift from '../../models/Shift'

export default defineEventHandler(async (event) => {
  const authUser = requireManager(event)
  const body = await readBody(event)

  const { employeeId, date, startTime, endTime, position, department, notes } = body

  if (!employeeId || !date || !startTime || !endTime) {
    throw createError({ statusCode: 400, message: 'Employee, date, start time, and end time are required' })
  }

  const shift = await Shift.create({
    employeeId,
    date: new Date(date),
    startTime,
    endTime,
    position: position || '',
    department: department || '',
    notes: notes || '',
    createdBy: authUser.userId
  })

  const populated = await shift.populate('employeeId', 'name email color position department')

  return { shift: populated }
})
