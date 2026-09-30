import Employee from '~/server/models/Employee'

const PREFIX = 'BMGV-'
const PAD_LENGTH = 4

/**
 * Finds the highest existing employee number matching the BMGV-#### pattern
 * and returns the next one in sequence (e.g. existing max BMGV-0007 -> BMGV-0008).
 * Starts at BMGV-0001 if no employees exist yet.
 *
 * This alone is not safe against two simultaneous creations both computing the
 * same "next" number — see generateUniqueEmployeeNumber() below, which wraps
 * this with retry-on-conflict logic backed by the schema's unique index.
 */
async function getNextEmployeeNumber() {
  const employees = await Employee.find({ employeeNumber: { $regex: `^${PREFIX}\\d+$` } })
    .select('employeeNumber')
    .lean()

  let maxNum = 0
  for (const e of employees) {
    const num = parseInt(e.employeeNumber.slice(PREFIX.length), 10)
    if (!isNaN(num) && num > maxNum) maxNum = num
  }

  const next = maxNum + 1
  return PREFIX + String(next).padStart(PAD_LENGTH, '0')
}

/**
 * Generates an employee number guaranteed not to collide with an existing one
 * at the moment of generation. Used right before Employee.create() — the
 * caller should still handle a possible duplicate-key error from the actual
 * insert, since a number can theoretically be taken between this check and
 * the insert under heavy concurrent load; this makes that exceedingly unlikely
 * rather than impossible.
 */
export async function generateUniqueEmployeeNumber() {
  const MAX_ATTEMPTS = 5
  let candidate = await getNextEmployeeNumber()

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const exists = await Employee.exists({ employeeNumber: candidate })
    if (!exists) return candidate

    // Collision (e.g. a concurrent request just took this number) — bump and retry.
    const num = parseInt(candidate.slice(PREFIX.length), 10)
    candidate = PREFIX + String(num + 1).padStart(PAD_LENGTH, '0')
  }

  throw new Error('Could not generate a unique employee number after several attempts')
}
