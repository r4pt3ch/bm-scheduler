/**
 * Philippine statutory deduction calculations.
 *
 * IMPORTANT: SSS, PhilHealth, Pag-IBIG, and BIR withholding tables are updated
 * periodically by their respective agencies. The brackets below are a reasonable
 * approximation for general use but MUST be reviewed and updated by your
 * accountant/payroll officer against the current official tables before this
 * system is relied on for actual government remittances. Do not treat these
 * numbers as compliance-certified out of the box.
 */

// SSS monthly contribution table (approximate, employee share only).
// Each bracket: [salaryCeiling, employeeContribution]
const SSS_TABLE = [
  [4250, 180], [4750, 202.5], [5250, 225], [5750, 247.5], [6250, 270],
  [6750, 292.5], [7250, 315], [7750, 337.5], [8250, 360], [8750, 382.5],
  [9250, 405], [9750, 427.5], [10250, 450], [10750, 472.5], [11250, 495],
  [11750, 517.5], [12250, 540], [12750, 562.5], [13250, 585], [13750, 607.5],
  [14250, 630], [14750, 652.5], [15250, 675], [15750, 697.5], [16250, 720],
  [16750, 742.5], [17250, 765], [17750, 787.5], [18250, 810], [18750, 832.5],
  [19250, 855], [19750, 877.5], [20250, 900], [20750, 922.5], [21250, 945],
  [21750, 967.5], [22250, 990], [22750, 1012.5], [23250, 1035], [23750, 1057.5],
  [24250, 1080], [24750, 1102.5], [Infinity, 1125]
]

export function calcSSS(monthlySalary) {
  for (const [ceiling, contribution] of SSS_TABLE) {
    if (monthlySalary <= ceiling) return contribution
  }
  return SSS_TABLE[SSS_TABLE.length - 1][1]
}

// PhilHealth: 5% of monthly salary, split 50/50, employee share only.
// Salary floor 10,000 / ceiling 100,000 (approximate current policy).
export function calcPhilHealth(monthlySalary) {
  const floor = 10000
  const ceiling = 100000
  const base = Math.min(Math.max(monthlySalary, floor), ceiling)
  const total = base * 0.05
  return round2(total / 2)
}

// Pag-IBIG: 1% if salary <= 1,500, else 2%, employee share, capped at 100 based on 5,000 cap.
export function calcPagIbig(monthlySalary) {
  const rate = monthlySalary <= 1500 ? 0.01 : 0.02
  const base = Math.min(monthlySalary, 5000)
  return round2(base * rate)
}

// BIR withholding tax — monthly table, TRAIN law style graduated brackets.
// taxableIncome = gross - SSS - PhilHealth - PagIbig (and other non-taxable deductions)
const BIR_TABLE = [
  { upTo: 20833, base: 0, rate: 0, over: 0 },
  { upTo: 33332, base: 0, rate: 0.15, over: 20833 },
  { upTo: 66666, base: 1875, rate: 0.20, over: 33333 },
  { upTo: 166666, base: 8541.8, rate: 0.25, over: 66667 },
  { upTo: 666666, base: 33541.8, rate: 0.30, over: 166667 },
  { upTo: Infinity, base: 183541.8, rate: 0.35, over: 666667 }
]

export function calcWithholdingTax(taxableMonthlyIncome) {
  const bracket = BIR_TABLE.find((b) => taxableMonthlyIncome <= b.upTo) || BIR_TABLE[BIR_TABLE.length - 1]
  if (bracket.rate === 0) return 0
  const excess = Math.max(0, taxableMonthlyIncome - bracket.over)
  return round2(bracket.base + excess * bracket.rate)
}

export function round2(n) {
  return Math.round(n * 100) / 100
}

/**
 * Computes a full payroll line for one employee over a cutoff period.
 * @param {number} baseSalary - monthly base salary
 * @param {number} daysWorked - days actually worked in the cutoff
 * @param {number} daysInCutoff - total working days expected in the cutoff
 * @param {boolean} includeThirteenthMonth - whether to add a prorated 13th month accrual
 */
export function computePayrollLine({ baseSalary, daysWorked, daysInCutoff, includeThirteenthMonth = false }) {
  const dailyRate = baseSalary / (daysInCutoff * 2) // assumes semi-monthly cutoffs, ~2/month
  const grossPay = round2(dailyRate * daysWorked)

  // Statutory deductions are computed on the full monthly-equivalent salary,
  // then halved for a semi-monthly cutoff (common PH practice: SSS/PhilHealth/PagIbig
  // deducted on one cutoff per month, but we split evenly here for simplicity).
  const monthlySSS = calcSSS(baseSalary)
  const monthlyPhilHealth = calcPhilHealth(baseSalary)
  const monthlyPagIbig = calcPagIbig(baseSalary)

  const sss = round2(monthlySSS / 2)
  const philHealth = round2(monthlyPhilHealth / 2)
  const pagIbig = round2(monthlyPagIbig / 2)

  const taxableMonthly = baseSalary - monthlySSS - monthlyPhilHealth - monthlyPagIbig
  const monthlyTax = calcWithholdingTax(taxableMonthly)
  const withholdingTax = round2(monthlyTax / 2)

  const thirteenthMonthAccrual = includeThirteenthMonth
    ? round2((baseSalary / 12) * (daysWorked / (daysInCutoff * 2)))
    : 0

  const totalDeductions = round2(sss + philHealth + pagIbig + withholdingTax)
  const netPay = round2(grossPay + thirteenthMonthAccrual - totalDeductions)

  return {
    dailyRate: round2(dailyRate),
    grossPay,
    sss,
    philHealth,
    pagIbig,
    withholdingTax,
    thirteenthMonthAccrual,
    totalDeductions,
    netPay
  }
}
