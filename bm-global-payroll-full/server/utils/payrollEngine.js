/**
 * Philippine statutory payroll calculations for BM Global Ventures Inc.
 *
 * Rates below reflect the schedules effective as of 2026:
 *  - SSS:        RA 11199, SSS Circular 2024-006 (effective Jan 2025, carried into 2026)
 *  - PhilHealth: RA 11223 (Universal Health Care Act), 5% rate confirmed for 2026
 *  - Pag-IBIG:   RA 9679, HDMF Circular No. 460 (effective Feb 2024, carried into 2026)
 *  - BIR:        RA 10963 (TRAIN Law), Revenue Regulations 11-2018, Phase 2 (Jan 2023 onward,
 *                unchanged through 2026)
 *
 * IMPORTANT: Government agencies issue new circulars periodically. Before relying on this
 * in production, verify the current tables against sss.gov.ph, philhealth.gov.ph,
 * pagibigfund.gov.ph, and bir.gov.ph. The constants below are isolated in one place
 * specifically so they're easy to update when rates change.
 */

// ---------------------------------------------------------------------------
// SSS — 15% total of Monthly Salary Credit (MSC), 5% employee / 10% employer,
// MSC ranges from ₱5,000 to ₱35,000 in ₱500 brackets. EC is employer-only.
// ---------------------------------------------------------------------------
const SSS_MIN_MSC = 5000
const SSS_MAX_MSC = 35000
const SSS_BRACKET_STEP = 500
const SSS_EMPLOYEE_RATE = 0.05
const SSS_EMPLOYER_RATE = 0.10
const SSS_EC_LOW = 10 // MSC below 15,000
const SSS_EC_HIGH = 30 // MSC 15,000 and above

function getMSC(monthlySalary) {
  if (monthlySalary <= SSS_MIN_MSC) return SSS_MIN_MSC
  if (monthlySalary >= SSS_MAX_MSC) return SSS_MAX_MSC
  // Snap up to the nearest ₱500 bracket, matching SSS's "range of compensation" table behavior
  const steps = Math.ceil((monthlySalary - SSS_MIN_MSC) / SSS_BRACKET_STEP)
  return SSS_MIN_MSC + steps * SSS_BRACKET_STEP
}

export function computeSSS(monthlySalary) {
  const msc = getMSC(monthlySalary)
  const employee = round2(msc * SSS_EMPLOYEE_RATE)
  const employerBase = round2(msc * SSS_EMPLOYER_RATE)
  const ec = msc < 15000 ? SSS_EC_LOW : SSS_EC_HIGH
  const employer = round2(employerBase + ec)
  return { msc, employee, employer: employerBase, ec, employerTotal: employer }
}

// ---------------------------------------------------------------------------
// PhilHealth — flat 5% of monthly basic salary, split 2.5% / 2.5%,
// floor ₱10,000, ceiling ₱100,000.
// ---------------------------------------------------------------------------
const PHILHEALTH_RATE = 0.05
const PHILHEALTH_FLOOR = 10000
const PHILHEALTH_CEILING = 100000

export function computePhilHealth(monthlySalary) {
  const base = Math.min(Math.max(monthlySalary, PHILHEALTH_FLOOR), PHILHEALTH_CEILING)
  const total = round2(base * PHILHEALTH_RATE)
  const employee = round2(total / 2)
  const employer = round2(total - employee)
  return { base, total, employee, employer }
}

// ---------------------------------------------------------------------------
// Pag-IBIG — 2% employee / 2% employer of monthly salary, capped at the
// ₱10,000 Maximum Fund Salary (so max ₱200 per side). 1% employee rate
// applies only at salaries ≤ ₱1,500 (rare in practice, kept for completeness).
// ---------------------------------------------------------------------------
const PAGIBIG_MFS_CAP = 10000
const PAGIBIG_LOW_THRESHOLD = 1500
const PAGIBIG_LOW_EMPLOYEE_RATE = 0.01
const PAGIBIG_STANDARD_RATE = 0.02

export function computePagIbig(monthlySalary) {
  const base = Math.min(monthlySalary, PAGIBIG_MFS_CAP)
  const employeeRate = monthlySalary <= PAGIBIG_LOW_THRESHOLD ? PAGIBIG_LOW_EMPLOYEE_RATE : PAGIBIG_STANDARD_RATE
  const employee = round2(base * employeeRate)
  const employer = round2(base * PAGIBIG_STANDARD_RATE)
  return { base, employee, employer }
}

// ---------------------------------------------------------------------------
// BIR Withholding Tax — TRAIN Law (RA 10963) Phase 2 graduated table,
// effective Jan 2023, unchanged through 2026. Monthly brackets shown
// (annual brackets ÷ 12). Progressive: rate applies only to the excess
// over the bracket's compensation level (CL).
// ---------------------------------------------------------------------------
const MONTHLY_TAX_BRACKETS = [
  { upTo: 20833, base: 0, rate: 0, excessOver: 0 },
  { upTo: 33333, base: 0, rate: 0.15, excessOver: 20833 },
  { upTo: 66667, base: 1875, rate: 0.20, excessOver: 33333 },
  { upTo: 166667, base: 13541.8, rate: 0.25, excessOver: 66667 },
  { upTo: 666667, base: 38541.8, rate: 0.30, excessOver: 166667 },
  { upTo: Infinity, base: 188541.8, rate: 0.35, excessOver: 666667 }
]

export function computeWithholdingTax(monthlyTaxableIncome) {
  if (monthlyTaxableIncome <= 0) return 0
  const bracket = MONTHLY_TAX_BRACKETS.find((b) => monthlyTaxableIncome <= b.upTo)
  if (!bracket || bracket.rate === 0) return 0
  const tax = bracket.base + (monthlyTaxableIncome - bracket.excessOver) * bracket.rate
  return round2(tax)
}

// ---------------------------------------------------------------------------
// Rate basis — monthly-rated, 6-day work week (Mon–Sat), Sunday off.
//
//   Daily Rate  = Monthly Salary ÷ number of Mon–Sat days in THAT calendar month
//   Hourly Rate = Daily Rate ÷ 8
//
// The divisor changes month to month (e.g. 24 in Feb 2026, 27 in Oct 2026), so
// every attendance day is valued at the rate of the month it falls in. A
// cutoff that crosses a month boundary therefore uses two different rates.
//
// Pay is earned per day ("No Work" default): only days marked worked or paid
// earn anything. Absent / No Work / unrecorded days earn ₱0 rather than being
// deducted from a flat salary. Basic pay for ordinary days is anchored to the
// monthly salary (Monthly Salary × days ÷ month's working days), so an
// employee present on every Mon–Sat day of a month earns exactly the salary.
// ---------------------------------------------------------------------------
export const REST_DAY_WEEKDAY = 0 // 0 = Sunday (JS getUTCDay convention)
const PH_UTC_OFFSET_MS = 8 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Premium / overtime multipliers — DOLE Handbook on Workers' Statutory
// Monetary Benefits (2024 ed.), "Guide Computations for Holiday Pay, Premium
// Pay, Overtime Pay" and Arts. 87, 93–94 of the Labor Code.
//
//  Work on:                               First 8 hrs     OT (per hour)
//  Ordinary day                           100%            × 125%
//  Sunday / rest day                      130%            × 130% × 130% = 169%
//  Special non-working day                130%            × 130% × 130% = 169%
//  Special non-working day on rest day    150%            × 150% × 130% = 195%
//  Regular holiday                        200%            × 200% × 130% = 260%
//  Regular holiday on rest day            260%            × 260% × 130% = 338%
//  Regular holiday, not worked            100% (holiday pay)
//  Special non-working day, not worked    no work, no pay
// ---------------------------------------------------------------------------
export const RATES = {
  ORDINARY_OT: 1.25,
  REST_DAY: 1.3,
  SPECIAL_DAY: 1.3,
  SPECIAL_DAY_ON_REST_DAY: 1.5,
  REGULAR_HOLIDAY: 2.0,
  REGULAR_HOLIDAY_ON_REST_DAY: 2.6,
  OT_ON_PREMIUM_DAY: 1.3
}

// ---------------------------------------------------------------------------
// 13th month pay — PD 851: total basic salary earned in the calendar year
// divided by 12. Exempt from tax up to a combined ₱90,000/year with other
// "other benefits"; excess is taxable.
// ---------------------------------------------------------------------------
export const THIRTEENTH_MONTH_TAX_EXEMPT_CAP = 90000

export function compute13thMonthPay(totalBasicSalaryEarnedThisYear) {
  return round2(totalBasicSalaryEarnedThisYear / 12)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function peso(n) {
  return `₱${round2(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function pct(m) {
  return `${round2(m * 100)}%`
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Philippine calendar date (YYYY-MM-DD) for a stored Date. Works whether the
 * date was saved as UTC midnight or Manila midnight (16:00 UTC the day
 * before), and regardless of the server's own timezone (DigitalOcean = UTC).
 */
export function phDateKey(d) {
  return new Date(new Date(d).getTime() + PH_UTC_OFFSET_MS).toISOString().slice(0, 10)
}

function weekdayOfKey(key) {
  return new Date(`${key}T00:00:00Z`).getUTCDay()
}

function addDaysToKey(key, n) {
  const d = new Date(`${key}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

/** Number of Mon–Sat days (everything except the rest day) in a calendar month. month1 = 1..12 */
export function workingDaysInMonth(year, month1) {
  const daysInMonth = new Date(Date.UTC(year, month1, 0)).getUTCDate()
  let count = 0
  for (let day = 1; day <= daysInMonth; day++) {
    if (new Date(Date.UTC(year, month1 - 1, day)).getUTCDay() !== REST_DAY_WEEKDAY) count++
  }
  return count
}

/** Daily/hourly rate for the calendar month a date key ('YYYY-MM-DD') falls in. */
export function monthlyRateBasis(basicSalary, dateKey) {
  const [y, m] = dateKey.split('-').map(Number)
  const workingDays = workingDaysInMonth(y, m)
  const dailyRate = round2(basicSalary / workingDays)
  const hourlyRate = round2(dailyRate / 8)
  return { month: dateKey.slice(0, 7), workingDays, dailyRate, hourlyRate }
}

/**
 * Values every day of a cutoff at its own month's rate and returns the
 * day-by-day lines (for the payslip breakdown) plus the aggregated buckets
 * `computePayroll` turns into earnings.
 *
 * @param {Array} attendanceRecords - raw Attendance documents for the cutoff
 * @param {Object} opts - { basicSalary, periodStart, periodEnd }
 */
export function computeDailyPay(attendanceRecords, { basicSalary, periodStart, periodEnd }) {
  const rateCache = {}
  const rateFor = (key) => {
    const mk = key.slice(0, 7)
    if (!rateCache[mk]) rateCache[mk] = monthlyRateBasis(basicSalary, key)
    return rateCache[mk]
  }

  // Ordinary paid days (present / half-day / paid leave) per month, used to
  // anchor basic pay to the monthly salary: salary × units ÷ working days.
  const basicUnitsByMonth = {}
  const basicLineSumByMonth = {}
  const addBasic = (mk, units, lineAmount) => {
    basicUnitsByMonth[mk] = (basicUnitsByMonth[mk] || 0) + units
    basicLineSumByMonth[mk] = round2((basicLineSumByMonth[mk] || 0) + lineAmount)
  }

  const b = {
    restDayPay: 0,
    specialDayPay: 0,
    holidayPay: 0,
    ordinaryOvertimePay: 0,
    restDayOvertimePay: 0,
    specialDayOvertimePay: 0,
    holidayOvertimePay: 0,
    lateUndertimeDeduction: 0
  }

  const summary = {
    scheduledDays: 0,
    daysWorked: 0,
    absences: 0,
    noWorkDays: 0,
    lateMinutes: 0,
    undertimeMinutes: 0,
    halfDayHoursShort: 0,
    ordinaryOvertimeHours: 0,
    restDayHoursWorked: 0,
    restDayOvertimeHours: 0,
    specialDayHoursWorked: 0,
    specialDayOvertimeHours: 0,
    holidayHoursWorked: 0,
    holidayOvertimeHours: 0,
    leaveDaysPaid: 0,
    leaveDaysUnpaid: 0
  }

  const recordedKeys = new Set()
  const lines = []

  for (const r of attendanceRecords) {
    const key = phDateKey(r.date)
    recordedKeys.add(key)

    const { dailyRate: DR, hourlyRate: HR, workingDays, month } = rateFor(key)
    const onRestDay = weekdayOfKey(key) === REST_DAY_WEEKDAY
    const hoursWorked = r.hoursWorked ?? 0
    const overtimeHours = r.overtimeHours || 0
    const lateMinutes = r.lateMinutes || 0
    const undertimeMinutes = r.undertimeMinutes || 0
    const rateNote = `Daily Rate ${peso(DR)} (${peso(basicSalary)} ÷ ${workingDays} Mon–Sat days, ${monthLabel(month)})`

    let amount = 0
    let dayLabel = ''
    const parts = []

    // 'present' logged on a Sunday is rest-day work.
    const effectiveStatus = r.status === 'present' && onRestDay ? 'rest-day' : r.status

    switch (effectiveStatus) {
      case 'no-work':
        dayLabel = 'No Work'
        summary.noWorkDays += 1
        parts.push('No work — unpaid')
        break

      case 'absent':
        dayLabel = 'Absent'
        summary.absences += 1
        parts.push('Absent — unpaid')
        break

      case 'leave':
        if (r.leaveType === 'unpaid') {
          dayLabel = 'Unpaid Leave'
          summary.leaveDaysUnpaid += 1
          summary.absences += 1
          parts.push('Unpaid leave — unpaid')
        } else {
          dayLabel = `Paid Leave${r.leaveType ? ` (${r.leaveType})` : ''}`
          summary.leaveDaysPaid += 1
          amount += DR
          addBasic(month, 1, DR)
          parts.push(`Paid leave — ${rateNote} × 100% = +${peso(DR)}`)
        }
        break

      case 'half-day': {
        dayLabel = 'Half Day'
        const hoursPresent = r.hoursWorked ?? 4
        const pay = round2(HR * hoursPresent)
        summary.daysWorked += 1
        summary.halfDayHoursShort += Math.max(0, 8 - hoursPresent)
        amount += pay
        addBasic(month, hoursPresent / 8, pay)
        parts.push(`Half day — ${hoursPresent} hrs × Hourly Rate ${peso(HR)} (Daily Rate ${peso(DR)} ÷ 8; ${peso(basicSalary)} ÷ ${workingDays} Mon–Sat days, ${monthLabel(month)}) = +${peso(pay)}`)
        break
      }

      case 'rest-day': {
        dayLabel = onRestDay ? 'Rest Day (Sunday)' : 'Rest Day'
        const hrs = r.status === 'present' ? (hoursWorked || 8) : hoursWorked
        if (hrs <= 0 && overtimeHours <= 0) {
          parts.push('Rest day — not worked, no pay')
          break
        }
        const pay = round2(DR * RATES.REST_DAY * (hrs / 8))
        summary.daysWorked += 1
        summary.restDayHoursWorked += hrs
        b.restDayPay = round2(b.restDayPay + pay)
        amount += pay
        parts.push(`Rest day worked — ${rateNote} × ${pct(RATES.REST_DAY)} × ${hrs}/8 hrs = +${peso(pay)}`)
        if (overtimeHours > 0) {
          const m = RATES.REST_DAY * RATES.OT_ON_PREMIUM_DAY
          const otPay = round2(HR * m * overtimeHours)
          summary.restDayOvertimeHours += overtimeHours
          b.restDayOvertimePay = round2(b.restDayOvertimePay + otPay)
          amount += otPay
          parts.push(`Rest day OT — ${overtimeHours} hrs × ${peso(HR)} × ${pct(RATES.REST_DAY)} × ${pct(RATES.OT_ON_PREMIUM_DAY)} (${pct(m)}) = +${peso(otPay)}`)
        }
        break
      }

      case 'special-non-working-day': {
        const mult = onRestDay ? RATES.SPECIAL_DAY_ON_REST_DAY : RATES.SPECIAL_DAY
        dayLabel = onRestDay ? 'Special Day on Rest Day' : 'Special Non-Working Day'
        if (hoursWorked <= 0 && overtimeHours <= 0) {
          parts.push('Special non-working day — not worked, no work no pay')
          break
        }
        const pay = round2(DR * mult * (hoursWorked / 8))
        summary.daysWorked += 1
        summary.specialDayHoursWorked += hoursWorked
        b.specialDayPay = round2(b.specialDayPay + pay)
        amount += pay
        parts.push(
          `Special day${onRestDay ? ' on rest day' : ''} worked — ${rateNote} × ${pct(mult)} × ${hoursWorked}/8 hrs = +${peso(pay)}`
        )
        if (overtimeHours > 0) {
          const m = mult * RATES.OT_ON_PREMIUM_DAY
          const otPay = round2(HR * m * overtimeHours)
          summary.specialDayOvertimeHours += overtimeHours
          b.specialDayOvertimePay = round2(b.specialDayOvertimePay + otPay)
          amount += otPay
          parts.push(`Special day OT — ${overtimeHours} hrs × ${peso(HR)} × ${pct(mult)} × ${pct(RATES.OT_ON_PREMIUM_DAY)} (${pct(m)}) = +${peso(otPay)}`)
        }
        break
      }

      case 'regular-holiday': {
        const mult = onRestDay ? RATES.REGULAR_HOLIDAY_ON_REST_DAY : RATES.REGULAR_HOLIDAY
        dayLabel = onRestDay ? 'Regular Holiday on Rest Day' : 'Regular Holiday'
        if (hoursWorked <= 0) {
          // Unworked regular holiday: 100% holiday pay (Art. 94).
          b.holidayPay = round2(b.holidayPay + DR)
          amount += DR
          parts.push(`Regular holiday not worked — holiday pay ${rateNote} × 100% = +${peso(DR)}`)
        } else {
          // 100% holiday pay for the day + the worked premium on top, scaled by
          // hours worked — at 8 hrs this is exactly 200% (or 260% on rest day).
          const factor = 1 + (mult - 1) * (hoursWorked / 8)
          const pay = round2(DR * factor)
          summary.daysWorked += 1
          summary.holidayHoursWorked += hoursWorked
          b.holidayPay = round2(b.holidayPay + pay)
          amount += pay
          parts.push(
            `Regular holiday${onRestDay ? ' on rest day' : ''} worked — ${rateNote} × (100% + ${pct(mult - 1)} × ${hoursWorked}/8 hrs) = +${peso(pay)} [${pct(mult)} for a full day]`
          )
        }
        if (overtimeHours > 0) {
          const m = mult * RATES.OT_ON_PREMIUM_DAY
          const otPay = round2(HR * m * overtimeHours)
          summary.holidayOvertimeHours += overtimeHours
          b.holidayOvertimePay = round2(b.holidayOvertimePay + otPay)
          amount += otPay
          parts.push(`Holiday OT — ${overtimeHours} hrs × ${peso(HR)} × ${pct(mult)} × ${pct(RATES.OT_ON_PREMIUM_DAY)} (${pct(m)}) = +${peso(otPay)}`)
        }
        break
      }

      case 'present':
      default: {
        dayLabel = 'Regular'
        summary.daysWorked += 1
        amount += DR
        addBasic(month, 1, DR)
        parts.push(`Regular work day — ${rateNote} = +${peso(DR)}`)
        if (overtimeHours > 0) {
          const otPay = round2(HR * RATES.ORDINARY_OT * overtimeHours)
          summary.ordinaryOvertimeHours += overtimeHours
          b.ordinaryOvertimePay = round2(b.ordinaryOvertimePay + otPay)
          amount += otPay
          parts.push(`Overtime — ${overtimeHours} hrs × ${peso(HR)} × ${pct(RATES.ORDINARY_OT)} = +${peso(otPay)}`)
        }
        break
      }
    }

    if (lateMinutes + undertimeMinutes > 0) {
      const ded = round2(((lateMinutes + undertimeMinutes) / 60) * HR)
      summary.lateMinutes += lateMinutes
      summary.undertimeMinutes += undertimeMinutes
      b.lateUndertimeDeduction = round2(b.lateUndertimeDeduction + ded)
      amount -= ded
      parts.push(`Late/undertime — (${lateMinutes}+${undertimeMinutes} min ÷ 60) × ${peso(HR)} = -${peso(ded)}`)
    }

    lines.push({
      date: r.date,
      dateKey: key,
      status: r.status,
      dayLabel,
      hoursWorked,
      overtimeHours,
      lateMinutes,
      undertimeMinutes,
      amount: round2(amount),
      formula: parts.join(' | ')
    })
  }

  // Scheduled (Mon–Sat) days in the cutoff with no attendance entered — unpaid.
  const startKey = phDateKey(periodStart)
  const endKey = phDateKey(periodEnd)
  for (let key = startKey; key <= endKey; key = addDaysToKey(key, 1)) {
    if (weekdayOfKey(key) === REST_DAY_WEEKDAY) continue
    rateFor(key) // make sure every month in the cutoff appears in the rate basis
    summary.scheduledDays += 1
    if (recordedKeys.has(key)) continue
    summary.noWorkDays += 1
    lines.push({
      date: new Date(`${key}T00:00:00Z`),
      dateKey: key,
      status: 'unrecorded',
      dayLabel: 'Unrecorded',
      hoursWorked: 0,
      overtimeHours: 0,
      lateMinutes: 0,
      undertimeMinutes: 0,
      amount: 0,
      formula: 'No attendance entered — unpaid (No Work default)'
    })
  }

  lines.sort((a, b2) => (a.dateKey < b2.dateKey ? -1 : a.dateKey > b2.dateKey ? 1 : 0))

  // Basic pay anchored to the monthly salary, one figure per month in the cutoff.
  let basicPay = 0
  for (const mk of Object.keys(basicUnitsByMonth)) {
    const { workingDays } = rateCache[mk]
    const units = basicUnitsByMonth[mk]
    const anchored = round2((basicSalary * units) / workingDays)
    basicPay = round2(basicPay + anchored)
    const diff = round2(anchored - basicLineSumByMonth[mk])
    if (Math.abs(diff) >= 0.01) {
      lines.push({
        date: null,
        dateKey: `${mk}-99`,
        status: 'rounding',
        dayLabel: `Rounding (${monthLabel(mk)})`,
        hoursWorked: 0,
        overtimeHours: 0,
        lateMinutes: 0,
        undertimeMinutes: 0,
        amount: diff,
        formula: `Basic pay tied to monthly salary — ${peso(basicSalary)} × ${round2(units)} days ÷ ${workingDays} = ${peso(anchored)} vs ${peso(basicLineSumByMonth[mk])} from the daily lines`
      })
    }
  }

  const rateBasis = Object.values(rateCache).sort((a, b2) => (a.month < b2.month ? -1 : 1))

  return { lines, buckets: b, basicPay, summary, rateBasis }
}

/**
 * Day-by-day computation trail for the payslip. Thin wrapper kept for
 * backward compatibility — `computePayroll` already returns `dailyBreakdown`.
 */
export function buildDailyBreakdown(attendanceRecords, opts) {
  return computeDailyPay(attendanceRecords, opts).lines
}

/**
 * Full payslip computation for one employee for one cutoff period.
 *
 * @param {Object} params
 * @param {number} params.basicSalary - employee's monthly salary rate
 * @param {'monthly'|'semi-monthly'} params.payFrequency
 * @param {Array} params.attendanceRecords - raw Attendance documents for the cutoff
 * @param {Date|string} params.periodStart
 * @param {Date|string} params.periodEnd
 * @param {number} params.taxableAllowance - taxable allowance for this cutoff
 * @param {number} params.deMinimis - non-taxable allowance for this cutoff
 * @param {number} params.thirteenthMonthPayout - 13th month amount to release this run, if any
 * @param {number} params.otherDeductions - ad hoc flat deductions for this cutoff
 * @param {Array} params.customDeductions - itemized per-employee deductions, each { label, percentage, fixedAmount }.
 *   percentage is % of monthly salary; fixedAmount is a flat ₱ amount per month. Both are prorated by pay
 *   frequency. These are AFTER-TAX deductions (e.g. loan repayments).
 * @param {number} params.otherEarnings - ad hoc earnings for this cutoff
 * @param {boolean} params.includeSSS / includePhilHealth / includePagIbig / includeWithholdingTax -
 *   each defaults to true; false excludes just that deduction (and its employer share) for this run
 */
export function computePayroll(params) {
  const {
    basicSalary,
    payFrequency = 'semi-monthly',
    attendanceRecords = [],
    periodStart,
    periodEnd,
    taxableAllowance = 0,
    deMinimis = 0,
    thirteenthMonthPayout = 0,
    otherDeductions = 0,
    customDeductions = [],
    otherEarnings = 0,
    // Each defaults to true (previous, only behavior). Set any to false to
    // exclude just that deduction — and its matching employer contribution
    // where one exists (SSS/PhilHealth/Pag-IBIG) — from this run. Independent
    // of each other, e.g. an employee can be excluded from SSS but still have
    // withholding tax applied.
    includeSSS = true,
    includePhilHealth = true,
    includePagIbig = true,
    includeWithholdingTax = true
  } = params

  if (!periodStart || !periodEnd) {
    throw new Error('computePayroll requires periodStart and periodEnd')
  }

  const periodDivisor = payFrequency === 'semi-monthly' ? 2 : 1

  // --- Attendance → pay, day by day, at each month's own rate ---
  const { lines, buckets, basicPay, summary, rateBasis } = computeDailyPay(attendanceRecords, {
    basicSalary,
    periodStart,
    periodEnd
  })

  const {
    restDayPay,
    specialDayPay,
    holidayPay,
    ordinaryOvertimePay,
    restDayOvertimePay,
    specialDayOvertimePay,
    holidayOvertimePay,
    lateUndertimeDeduction
  } = buckets

  const totalOvertimePay = round2(ordinaryOvertimePay + restDayOvertimePay + specialDayOvertimePay + holidayOvertimePay)
  const totalPremiumPay = round2(restDayPay + specialDayPay + holidayPay)
  const overtimePay = totalOvertimePay

  // No compensable work this cutoff → no statutory or other deductions, so
  // net pay can never go negative on an empty cutoff.
  const hasCompensableWork = round2(basicPay + overtimePay + totalPremiumPay) > 0

  // --- Statutory contributions: computed on the FULL monthly salary rate, then
  // apportioned to the cutoff (unchanged from before).
  const monthlySSS = includeSSS && hasCompensableWork ? computeSSS(basicSalary) : { employee: 0, employer: 0, ec: 0 }
  const monthlyPhilHealth = includePhilHealth && hasCompensableWork ? computePhilHealth(basicSalary) : { employee: 0, employer: 0 }
  const monthlyPagIbig = includePagIbig && hasCompensableWork ? computePagIbig(basicSalary) : { employee: 0, employer: 0 }

  const sssEmployeeThisPeriod = round2(monthlySSS.employee / periodDivisor)
  const sssEmployerThisPeriod = round2(monthlySSS.employer / periodDivisor)
  const sssEcThisPeriod = round2(monthlySSS.ec / periodDivisor)
  const philhealthEmployeeThisPeriod = round2(monthlyPhilHealth.employee / periodDivisor)
  const philhealthEmployerThisPeriod = round2(monthlyPhilHealth.employer / periodDivisor)
  const pagibigEmployeeThisPeriod = round2(monthlyPagIbig.employee / periodDivisor)
  const pagibigEmployerThisPeriod = round2(monthlyPagIbig.employer / periodDivisor)

  // --- Custom per-employee deductions (loans, cash advances, etc.) ---
  const customDeductionsApplied = customDeductions
    .filter((d) => d && d.active !== false)
    .map((d) => {
      const percentage = Number(d.percentage) || 0
      const fixedAmount = Number(d.fixedAmount) || 0
      const monthlyAmount = basicSalary * (percentage / 100) + fixedAmount
      const amount = hasCompensableWork ? round2(monthlyAmount / periodDivisor) : 0
      return { label: d.label, percentage, fixedAmount, amount }
    })
  const customDeductionsTotal = round2(customDeductionsApplied.reduce((sum, d) => sum + d.amount, 0))
  const totalOtherDeductions = hasCompensableWork ? round2(otherDeductions + customDeductionsTotal) : 0

  // --- Gross pay ---
  const grossPay = round2(
    basicPay + overtimePay + totalPremiumPay + taxableAllowance + deMinimis + thirteenthMonthPayout + otherEarnings - lateUndertimeDeduction
  )

  // --- Taxable income ---
  const taxableThirteenthMonth = Math.max(0, thirteenthMonthPayout - THIRTEENTH_MONTH_TAX_EXEMPT_CAP / 12)
  const taxableIncomeThisPeriod = round2(
    basicPay +
      overtimePay +
      totalPremiumPay +
      taxableAllowance +
      otherEarnings +
      taxableThirteenthMonth -
      lateUndertimeDeduction -
      sssEmployeeThisPeriod -
      philhealthEmployeeThisPeriod -
      pagibigEmployeeThisPeriod
  )

  // Tax on the monthly-equivalent taxable income, apportioned to the cutoff.
  const monthlyEquivalentTaxableIncome = round2(taxableIncomeThisPeriod * periodDivisor)
  const monthlyTax = includeWithholdingTax && hasCompensableWork ? computeWithholdingTax(monthlyEquivalentTaxableIncome) : 0
  const withholdingTax = round2(monthlyTax / periodDivisor)

  const totalDeductions = round2(
    sssEmployeeThisPeriod + philhealthEmployeeThisPeriod + pagibigEmployeeThisPeriod + withholdingTax + totalOtherDeductions
  )

  const netPay = round2(grossPay - totalDeductions)

  const totalOvertimeHours =
    summary.ordinaryOvertimeHours + summary.restDayOvertimeHours + summary.specialDayOvertimeHours + summary.holidayOvertimeHours

  return {
    attendanceSummary: {
      ...summary,
      overtimeHours: totalOvertimeHours
    },
    dailyBreakdown: lines.map(({ dateKey, ...line }) => line),
    rateBasis,
    earnings: {
      basicPay,
      overtimePay,
      overtimeBreakdown: {
        ordinaryOvertimePay,
        restDayOvertimePay,
        specialDayOvertimePay,
        holidayOvertimePay
      },
      premiumPay: totalPremiumPay,
      premiumBreakdown: {
        restDayPay,
        specialDayPay,
        holidayPay
      },
      allowances: taxableAllowance,
      deMinimis,
      thirteenthMonthPay: thirteenthMonthPayout,
      otherEarnings,
      grossPay
    },
    deductions: {
      sssEmployee: sssEmployeeThisPeriod,
      philhealthEmployee: philhealthEmployeeThisPeriod,
      pagibigEmployee: pagibigEmployeeThisPeriod,
      withholdingTax,
      lateUndertimeDeduction,
      // Unpaid days are simply not earned under the per-day model, so these
      // stay 0; kept for schema/report compatibility with older records.
      absenceDeduction: 0,
      noWorkDeduction: 0,
      halfDayDeduction: 0,
      otherDeductions: totalOtherDeductions,
      customDeductionsApplied,
      totalDeductions
    },
    employerContributions: {
      sssEmployer: sssEmployerThisPeriod,
      philhealthEmployer: philhealthEmployerThisPeriod,
      pagibigEmployer: pagibigEmployerThisPeriod,
      ecContribution: sssEcThisPeriod
    },
    netPay,
    meta: {
      rateBasis,
      // First month's rates, for older callers that expect a single figure.
      effectiveDailyRate: rateBasis[0]?.dailyRate || 0,
      hourlyRate: rateBasis[0]?.hourlyRate || 0,
      monthlyEquivalentTaxableIncome,
      hasCompensableWork,
      deductionsIncluded: {
        sss: includeSSS,
        philHealth: includePhilHealth,
        pagIbig: includePagIbig,
        withholdingTax: includeWithholdingTax
      }
    }
  }
}

/**
 * Legacy aggregate helper, kept exported in case anything else imports it.
 * The payroll run itself now uses computeDailyPay (per-day, per-month rates).
 */
export function computeOvertimeAndPremiumPay(hourlyRate, dailyRate, otInputs = {}) {
  const {
    ordinaryOvertimeHours = 0,
    restDayHoursWorked = 0,
    restDayOvertimeHours = 0,
    specialDayHoursWorked = 0,
    specialDayOvertimeHours = 0,
    holidayHoursWorked = 0,
    holidayOvertimeHours = 0
  } = otInputs
  const ordinaryOvertimePay = round2(hourlyRate * RATES.ORDINARY_OT * ordinaryOvertimeHours)
  const restDayPay = round2(dailyRate * RATES.REST_DAY * (restDayHoursWorked / 8))
  const restDayOvertimePay = round2(hourlyRate * RATES.REST_DAY * RATES.OT_ON_PREMIUM_DAY * restDayOvertimeHours)
  const specialDayPay = round2(dailyRate * RATES.SPECIAL_DAY * (specialDayHoursWorked / 8))
  const specialDayOvertimePay = round2(hourlyRate * RATES.SPECIAL_DAY * RATES.OT_ON_PREMIUM_DAY * specialDayOvertimeHours)
  const holidayPay = round2(dailyRate * RATES.REGULAR_HOLIDAY * (holidayHoursWorked / 8))
  const holidayOvertimePay = round2(hourlyRate * RATES.REGULAR_HOLIDAY * RATES.OT_ON_PREMIUM_DAY * holidayOvertimeHours)
  const totalOvertimePay = round2(ordinaryOvertimePay + restDayOvertimePay + specialDayOvertimePay + holidayOvertimePay)
  const totalPremiumPay = round2(restDayPay + specialDayPay + holidayPay)
  return {
    ordinaryOvertimePay,
    restDayPay,
    restDayOvertimePay,
    specialDayPay,
    specialDayOvertimePay,
    holidayPay,
    holidayOvertimePay,
    totalOvertimePay,
    totalPremiumPay
  }
}
