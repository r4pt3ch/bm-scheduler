<template>
  <div>
    <header class="mb-8">
      <p class="text-xs uppercase tracking-[0.18em] text-ink-400 font-semibold">Attendance</p>
      <h1 class="font-display text-3xl text-ink-50 mt-1">{{ auth.isAdmin ? 'Cutoff Attendance Entry' : 'My Attendance' }}</h1>
    </header>

    <template v-if="auth.isAdmin">
      <UiCard class="mb-6">
        <div class="grid sm:grid-cols-3 gap-4 mb-4">
          <UiSelect v-model="selectedEmployee" label="Employee" :options="employeeOptions" placeholder="Select an employee" />
          <UiInput v-model="rangeFrom" type="date" label="From" />
          <UiInput v-model="rangeTo" type="date" label="To" />
        </div>
        <p v-if="rangeError" class="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg mb-4">{{ rangeError }}</p>
        <UiButton size="sm" variant="secondary" @click="loadRange">Load Days in Range</UiButton>
      </UiCard>

      <UiCard v-if="days.length" :padded="false">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-sand-200">
              <th class="px-4 py-3">Date</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Time In</th>
              <th class="px-4 py-3">Time Out</th>
              <th class="px-4 py-3">Late (min)</th>
              <th class="px-4 py-3">Undertime (min)</th>
              <th class="px-4 py-3">Hours Present</th>
              <th class="px-4 py-3">Overtime (hrs)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-sand-200">
            <tr v-for="(d, i) in days" :key="d.date">
              <td class="px-4 py-2.5 text-ink-100">{{ formatDay(d.date) }}</td>
              <td class="px-4 py-2.5">
                <select
                  v-model="d.status"
                  class="focus-ring rounded-md border border-sand-200 bg-sand-50 text-ink-50 px-2 py-1.5 text-sm"
                  @change="onStatusChange(d)"
                >
                  <option value="no-work">No Work</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="half-day">Half-day</option>
                  <option value="leave">Leave</option>
                  <option value="rest-day">Rest day</option>
                  <option value="special-non-working-day">Special non-working day</option>
                  <option value="regular-holiday">Regular holiday</option>
                </select>
              </td>
              <td class="px-4 py-2.5"><input v-model="d.timeIn" type="time" class="focus-ring w-28 rounded-md border border-sand-200 bg-sand-50 text-ink-50 px-2 py-1.5 text-sm" /></td>
              <td class="px-4 py-2.5"><input v-model="d.timeOut" type="time" class="focus-ring w-28 rounded-md border border-sand-200 bg-sand-50 text-ink-50 px-2 py-1.5 text-sm" /></td>
              <td class="px-4 py-2.5"><input v-model.number="d.lateMinutes" type="number" min="0" class="focus-ring w-20 rounded-md border border-sand-200 bg-sand-50 text-ink-50 px-2 py-1.5 text-sm" /></td>
              <td class="px-4 py-2.5"><input v-model.number="d.undertimeMinutes" type="number" min="0" class="focus-ring w-20 rounded-md border border-sand-200 bg-sand-50 text-ink-50 px-2 py-1.5 text-sm" /></td>
              <td class="px-4 py-2.5">
                <input
                  v-model.number="d.hoursWorked"
                  type="number" min="0" max="24" step="0.5"
                  :disabled="d.status === 'absent' || d.status === 'leave' || d.status === 'no-work'"
                  class="focus-ring w-20 rounded-md border border-sand-200 bg-sand-50 text-ink-50 px-2 py-1.5 text-sm disabled:opacity-40"
                />
              </td>
              <td class="px-4 py-2.5">
                <input
                  v-model.number="d.overtimeHours"
                  type="number" min="0" step="0.5"
                  :disabled="d.status === 'absent' || d.status === 'leave' || d.status === 'no-work'"
                  class="focus-ring w-20 rounded-md border border-sand-200 bg-sand-50 text-ink-50 px-2 py-1.5 text-sm disabled:opacity-40"
                />
              </td>
            </tr>
          </tbody>
        </table>
        <p class="px-4 pt-3 text-xs text-ink-400">
          Rows default to <strong>No Work</strong> and are unpaid unless changed — mark a day Present (or another
          worked day type) for the employee to be paid for it. "Hours Present" matters most for Half-day, Rest day,
          Special non-working day, and Regular holiday rows — it drives the half-day and holiday/rest-day premium pay
          calculations.
        </p>
        <div class="p-4 flex justify-end gap-3 border-t border-sand-200">
          <p v-if="saveMsg" class="text-sm text-emerald-300 self-center">{{ saveMsg }}</p>
          <UiButton :loading="saving" @click="saveDays">Save Attendance</UiButton>
        </div>
      </UiCard>
    </template>

    <template v-else>
      <UiCard :padded="false">
        <div v-if="!myRecords.length" class="p-6 text-sm text-ink-400">No attendance records yet.</div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-sand-200">
              <th class="px-4 py-3">Date</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Time In</th>
              <th class="px-4 py-3">Time Out</th>
              <th class="px-4 py-3">Late</th>
              <th class="px-4 py-3">Undertime</th>
              <th class="px-4 py-3">Overtime</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-sand-200">
            <tr v-for="r in myRecords" :key="r._id">
              <td class="px-4 py-2.5 text-ink-100">{{ formatDay(r.date) }}</td>
              <td class="px-4 py-2.5"><UiBadge :tone="badgeTone(r.status)">{{ r.status }}</UiBadge></td>
              <td class="px-4 py-2.5 text-ink-300">{{ r.timeIn || '—' }}</td>
              <td class="px-4 py-2.5 text-ink-300">{{ r.timeOut || '—' }}</td>
              <td class="px-4 py-2.5 text-ink-300">{{ r.lateMinutes || 0 }} min</td>
              <td class="px-4 py-2.5 text-ink-300">{{ r.undertimeMinutes || 0 }} min</td>
              <td class="px-4 py-2.5 text-ink-300">{{ r.overtimeHours || 0 }} hrs</td>
            </tr>
          </tbody>
        </table>
      </UiCard>
    </template>
  </div>
</template>

<script setup>
import dayjs from 'dayjs'

definePageMeta({ layout: 'default' })
const auth = useAuthStore()

// --- Employee self-view ---
// useFetch must be called unconditionally; we gate it with `immediate` instead
// of skipping the call, so admin sessions just end up with an empty, unused result.
const { data: myData } = await useFetch('/api/attendance', { immediate: !auth.isAdmin })
const myRecords = computed(() => myData?.value?.records || [])

// --- Admin entry ---
const employeeOptions = ref([])
const selectedEmployee = ref('')
const rangeFrom = ref(dayjs().startOf('month').format('YYYY-MM-DD'))
const rangeTo = ref(dayjs().format('YYYY-MM-DD'))
const days = ref([])
const saving = ref(false)
const saveMsg = ref('')
const rangeError = ref('')

// Note: auth.isAdmin is fixed for the lifetime of this page instance (it only
// changes via a fresh login), so this conditional call is safe in practice.
if (auth.isAdmin) {
  const { data: empData } = await useFetch('/api/employees', { query: { status: 'active' } })
  employeeOptions.value = (empData.value?.employees || []).map((e) => ({
    value: e._id,
    label: `${e.firstName} ${e.lastName} (${e.employeeNumber})`
  }))
}

async function loadRange() {
  rangeError.value = ''

  if (!selectedEmployee.value) {
    rangeError.value = 'Select an employee first.'
    return
  }

  // Guard against empty/invalid date inputs — without this, an empty
  // rangeFrom/rangeTo (e.g. cleared while typing instead of using the
  // calendar picker) silently produces an Invalid Date that then gets
  // stamped onto every generated row below.
  const start = dayjs(rangeFrom.value)
  const end = dayjs(rangeTo.value)
  if (!rangeFrom.value || !rangeTo.value || !start.isValid() || !end.isValid()) {
    rangeError.value = 'Please select both a valid "From" and "To" date.'
    return
  }
  if (end.isBefore(start, 'day')) {
    rangeError.value = '"To" date must be on or after the "From" date.'
    return
  }

  const { records } = await $fetch('/api/attendance', {
    query: { employee: selectedEmployee.value, from: rangeFrom.value, to: rangeTo.value }
  })
  const existingByDate = {}
  for (const r of records) existingByDate[dayjs(r.date).format('YYYY-MM-DD')] = r

  const result = []
  let cursor = start
  while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
    const key = cursor.format('YYYY-MM-DD')
    const existing = existingByDate[key]
    const status = existing?.status || 'no-work'
    result.push({
      date: key,
      status,
      timeIn: existing?.timeIn || '',
      timeOut: existing?.timeOut || '',
      lateMinutes: existing?.lateMinutes || 0,
      undertimeMinutes: existing?.undertimeMinutes || 0,
      hoursWorked: existing?.hoursWorked ?? defaultHoursForStatus(status),
      overtimeHours: existing?.overtimeHours || 0
    })
    cursor = cursor.add(1, 'day')
  }
  days.value = result
}

// Sensible default hours-present per status, used when a row is first loaded
// (not yet saved) so the "Hours Present" field starts with a reasonable value
// rather than 0 for day types that are typically worked in full.
function defaultHoursForStatus(status) {
  if (status === 'no-work' || status === 'absent' || status === 'leave') return 0
  if (status === 'half-day') return 4
  return 8 // present, rest-day, special-non-working-day, regular-holiday
}

// When the admin changes a row's day-type dropdown, reset Hours Present to
// that type's default. Without this, switching e.g. Present -> Half-day
// silently keeps the old 8-hour value, which zeroes out the half-day
// deduction (and, symmetrically, switching away from Half-day keeps a stale
// 4-hour value that understates rest-day/special-day/holiday premium pay).
// Overtime hours are also cleared on No Work/Absent/Leave since OT doesn't apply.
function onStatusChange(day) {
  day.hoursWorked = defaultHoursForStatus(day.status)
  if (day.status === 'no-work' || day.status === 'absent' || day.status === 'leave') {
    day.overtimeHours = 0
  }
}

async function saveDays() {
  saving.value = true
  saveMsg.value = ''
  try {
    const payload = days.value.map((d) => ({
      employee: selectedEmployee.value,
      date: d.date,
      status: d.status,
      timeIn: d.timeIn || '',
      timeOut: d.timeOut || '',
      lateMinutes: d.lateMinutes,
      undertimeMinutes: d.undertimeMinutes,
      overtimeHours: d.status === 'no-work' || d.status === 'absent' || d.status === 'leave' ? 0 : d.overtimeHours,
      hoursWorked: d.status === 'no-work' || d.status === 'absent' || d.status === 'leave' ? 0 : (d.hoursWorked ?? defaultHoursForStatus(d.status))
    }))
    await $fetch('/api/attendance', { method: 'POST', body: payload })
    saveMsg.value = 'Saved.'
    setTimeout(() => (saveMsg.value = ''), 2500)
  } finally {
    saving.value = false
  }
}

function formatDay(d) {
  const parsed = dayjs(d)
  return parsed.isValid() ? parsed.format('ddd, MMM D, YYYY') : '—'
}

function badgeTone(status) {
  if (status === 'present') return 'success'
  if (status === 'absent') return 'danger'
  if (status === 'leave') return 'info'
  if (status === 'regular-holiday') return 'warning'
  if (status === 'special-non-working-day' || status === 'rest-day') return 'neutral'
  if (status === 'no-work') return 'neutral'
  return 'neutral'
}
</script>
