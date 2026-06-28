import { getAuthUser } from '../../utils/auth'
import Shift from '../../models/Shift'
import User from '../../models/User'
import TimeOffRequest from '../../models/TimeOffRequest'

export default defineEventHandler(async (event) => {
  const authUser = getAuthUser(event)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  if (authUser.role === 'manager') {
    const [totalEmployees, todayShifts, weekShifts, pendingRequests] = await Promise.all([
      User.countDocuments({ isActive: true, role: 'employee' }),
      Shift.countDocuments({ date: { $gte: today, $lt: tomorrow }, status: 'scheduled' }),
      Shift.countDocuments({ date: { $gte: weekStart, $lt: weekEnd }, status: 'scheduled' }),
      TimeOffRequest.countDocuments({ status: 'pending' })
    ])

    const upcomingShifts = await Shift.find({
      date: { $gte: today, $lt: tomorrow },
      status: 'scheduled'
    })
      .populate('employeeId', 'name color position')
      .sort({ startTime: 1 })
      .limit(10)

    return { totalEmployees, todayShifts, weekShifts, pendingRequests, upcomingShifts }
  } else {
    const [myTodayShifts, myWeekShifts, myPendingRequests] = await Promise.all([
      Shift.countDocuments({ employeeId: authUser.userId, date: { $gte: today, $lt: tomorrow } }),
      Shift.countDocuments({ employeeId: authUser.userId, date: { $gte: weekStart, $lt: weekEnd } }),
      TimeOffRequest.countDocuments({ employeeId: authUser.userId, status: 'pending' })
    ])

    const upcomingShifts = await Shift.find({
      employeeId: authUser.userId,
      date: { $gte: today },
      status: 'scheduled'
    })
      .sort({ date: 1, startTime: 1 })
      .limit(5)

    return {
      myTodayShifts,
      myWeekShifts,
      myPendingRequests,
      upcomingShifts
    }
  }
})
