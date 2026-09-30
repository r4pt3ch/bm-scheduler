import PayrollRecord from '~/server/models/PayrollRecord'
import { requireAdmin } from '~/server/utils/auth'
import dayjs from 'dayjs'

// GET /api/reports/remittance?from=YYYY-MM-DD&to=YYYY-MM-DD
// Summarizes SSS/PhilHealth/Pag-IBIG/BIR amounts due for the period — the figures
// HR needs to prepare SSS R-3/R-5, PhilHealth RF-1, HDMF M1-1, and BIR 1601-C filings.
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await connectDB()

  const query = getQuery(event)
  const from = query.from ? dayjs(query.from).toDate() : dayjs().startOf('month').toDate()
  const to = query.to ? dayjs(query.to).toDate() : dayjs().endOf('month').toDate()

  const records = await PayrollRecord.find({
    periodStart: { $gte: from },
    periodEnd: { $lte: to },
    status: { $nin: ['draft', 'cancelled'] }
  }).populate('employee', 'firstName lastName employeeNumber governmentIds')

  const totals = {
    sssEmployee: 0,
    sssEmployer: 0,
    ecContribution: 0,
    philhealthEmployee: 0,
    philhealthEmployer: 0,
    pagibigEmployee: 0,
    pagibigEmployer: 0,
    withholdingTax: 0,
    grossPay: 0,
    netPay: 0,
    totalReimbursements: 0
  }

  const byEmployee = {}

  for (const r of records) {
    totals.sssEmployee += r.deductions.sssEmployee
    totals.sssEmployer += r.employerContributions.sssEmployer
    totals.ecContribution += r.employerContributions.ecContribution
    totals.philhealthEmployee += r.deductions.philhealthEmployee
    totals.philhealthEmployer += r.employerContributions.philhealthEmployer
    totals.pagibigEmployee += r.deductions.pagibigEmployee
    totals.pagibigEmployer += r.employerContributions.pagibigEmployer
    totals.withholdingTax += r.deductions.withholdingTax
    totals.grossPay += r.earnings.grossPay
    totals.netPay += r.netPay
    totals.totalReimbursements += r.totalReimbursements || 0

    const empId = r.employee._id.toString()
    if (!byEmployee[empId]) {
      byEmployee[empId] = {
        employee: r.employee,
        sssEmployee: 0,
        philhealthEmployee: 0,
        pagibigEmployee: 0,
        withholdingTax: 0,
        grossPay: 0,
        netPay: 0,
        totalReimbursements: 0
      }
    }
    byEmployee[empId].sssEmployee += r.deductions.sssEmployee
    byEmployee[empId].philhealthEmployee += r.deductions.philhealthEmployee
    byEmployee[empId].pagibigEmployee += r.deductions.pagibigEmployee
    byEmployee[empId].withholdingTax += r.deductions.withholdingTax
    byEmployee[empId].grossPay += r.earnings.grossPay
    byEmployee[empId].netPay += r.netPay
    byEmployee[empId].totalReimbursements += r.totalReimbursements || 0
  }

  const round2 = (n) => Math.round(n * 100) / 100
  for (const key in totals) totals[key] = round2(totals[key])
  for (const empId in byEmployee) {
    const row = byEmployee[empId]
    for (const key in row) {
      if (key !== 'employee') row[key] = round2(row[key])
    }
  }

  return {
    period: { from, to },
    totals,
    byEmployee: Object.values(byEmployee),
    recordCount: records.length
  }
})
