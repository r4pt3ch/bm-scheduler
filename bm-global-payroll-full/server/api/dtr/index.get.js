import DtrEntry from '~/server/models/DtrEntry'
import { requireAuth } from '~/server/utils/auth'
import dayjs from 'dayjs'

// GET /api/dtr?employee=&from=&to=&all=true
// Employees can only fetch their own entries (employee param ignored/forced
// to their own id). Admins can pass employee=<id> to view one employee's DTR,
// or all=true to view everyone's DTR for the date range (a daily roster view)
// — read-only either way, since admins don't edit DTR punches directly;
// that's the employee's own self-service record.
export default defineEventHandler(async (event) => {
  const session = requireAuth(event)
  await connectDB()

  const isAdminRole = session.role === 'admin' || session.role === 'super_admin'
  const query = getQuery(event)
  const wantsAll = isAdminRole && query.all === 'true'

  const filter = {}
  if (wantsAll) {
    // No employee filter at all — every employee's entries in range.
  } else if (isAdminRole && query.employee) {
    filter.employee = query.employee
  } else {
    filter.employee = session.id
  }

  if (query.from || query.to) {
    filter.date = {}
    if (query.from) filter.date.$gte = dayjs(query.from).startOf('day').toDate()
    if (query.to) filter.date.$lte = dayjs(query.to).startOf('day').toDate()
  } else {
    // Default to the current month if no range given, so this never silently
    // returns someone's entire multi-year punch history in one response.
    filter.date = {
      $gte: dayjs().startOf('month').toDate(),
      $lte: dayjs().endOf('month').toDate()
    }
  }

  const entries = await DtrEntry.find(filter)
    .sort({ date: -1 })
    .populate('employee', 'firstName lastName employeeNumber')

  const withHours = entries.map((e) => ({
    ...e.toObject(),
    hoursWorked: e.computeHoursWorked()
  }))

  // Today's open/closed clock state for the record currently being viewed —
  // used by the frontend to show "Clock In" vs "Clock Out" correctly, both
  // for an employee's own punch clock and for an admin's manual-punch
  // controls when viewing one specific employee. Not meaningful in the
  // "all employees" roster view, since there's no single target.
  let currentlyIn = false
  if (!wantsAll) {
    const today = dayjs().startOf('day').toDate()
    const todayEntry = entries.find((e) => dayjs(e.date).isSame(today, 'day'))
    const lastPunch = todayEntry?.punches?.[todayEntry.punches.length - 1]
    currentlyIn = lastPunch?.type === 'in'
  }

  return { entries: withHours, currentlyIn }
})
