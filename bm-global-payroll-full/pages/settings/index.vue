<template>
  <div class="max-w-2xl">
    <header class="mb-8">
      <p class="text-xs uppercase tracking-[0.18em] text-ink-400 font-semibold">Settings</p>
      <h1 class="font-display text-3xl text-ink-50 mt-1">Settings</h1>
      <p class="text-sm text-ink-400 mt-1">Kiosk configuration, work schedule, and DTR–Attendance import.</p>
    </header>

    <!-- Kiosk Password (admin) -->
    <UiCard class="mb-6">
      <h2 class="font-display text-lg text-ink-50 mb-1">Kiosk Password</h2>
      <p class="text-xs text-ink-400 mb-4">
        Shared password that unlocks the kiosk screen on a device.
        <span v-if="kioskIsSet" class="text-emerald-300"> Currently set.</span>
        <span v-else class="text-amber-300"> Not set — kiosk cannot be unlocked yet.</span>
      </p>
      <div class="space-y-3">
        <UiInput v-model="kioskPassword" type="password" :label="kioskIsSet ? 'New kiosk password' : 'Set kiosk password'" placeholder="At least 6 characters" />
        <UiInput v-model="confirmKioskPassword" type="password" label="Confirm password" />
        <p v-if="kioskPwError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg">{{ kioskPwError }}</p>
        <p v-if="kioskPwSuccess" class="text-sm text-emerald-300 bg-emerald-400/10 px-3 py-2 rounded-lg">Kiosk password updated.</p>
        <div class="flex gap-3 items-center">
          <UiButton size="sm" :loading="settingKioskPw" @click="handleSetKioskPassword">{{ kioskIsSet ? 'Update' : 'Set Password' }}</UiButton>
          <NuxtLink to="/kiosk" target="_blank" class="text-sm text-ink-300 hover:underline">Open kiosk →</NuxtLink>
        </div>
      </div>
    </UiCard>

    <!-- Work Schedule (admin) -->
    <UiCard class="mb-6">
      <h2 class="font-display text-lg text-ink-50 mb-1">Work Schedule</h2>
      <p class="text-xs text-ink-400 mb-4">Used to compute late minutes and undertime when syncing DTR punches to Attendance.</p>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <UiInput v-model="workStart" type="time" label="Official start time" />
        <UiInput v-model="workEnd" type="time" label="Official end time" />
      </div>
      <div class="flex items-center gap-3 mb-4">
        <label class="flex items-center gap-2 text-sm text-ink-100 cursor-pointer">
          <input v-model="autoSync" type="checkbox" class="rounded border-sand-200 accent-brand-500" />
          Auto-sync DTR punches to Attendance in real time
        </label>
      </div>
      <p class="text-xs text-ink-400 mb-4">When enabled, every kiosk or app punch automatically updates the employee's Attendance record. Admins can still manually override Attendance entries at any time.</p>
      <p v-if="scheduleSaved" class="text-sm text-emerald-300 bg-emerald-400/10 px-3 py-2 rounded-lg mb-3">Schedule saved.</p>
      <p v-if="scheduleError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg mb-3">{{ scheduleError }}</p>
      <UiButton size="sm" :loading="savingSchedule" @click="handleSaveSchedule">Save Schedule</UiButton>
    </UiCard>

    <!-- Payroll Reminder Cutoff Days (admin) -->
    <UiCard class="mb-6">
      <h2 class="font-display text-lg text-ink-50 mb-1">Payroll Reminder</h2>
      <p class="text-xs text-ink-400 mb-4">
        The Dashboard shows a reminder when payroll hasn't been generated for the most recent cutoff date below.
        Choose two days per month.
      </p>
      <div class="flex flex-wrap gap-2 mb-4">
        <button
          v-for="preset in reminderPresets"
          :key="preset.label"
          type="button"
          class="px-3 py-1.5 rounded-full text-xs border transition-colors"
          :class="reminderDay1 === preset.day1 && reminderDay2 === preset.day2
            ? 'bg-brand-500 text-white border-brand-500'
            : 'border-sand-200 text-ink-300 hover:border-brand-400'"
          @click="reminderDay1 = preset.day1; reminderDay2 = preset.day2"
        >
          {{ preset.label }}
        </button>
      </div>
      <div class="grid grid-cols-2 gap-4 mb-2">
        <UiInput v-model.number="reminderDay1" type="number" min="1" max="31" label="First cutoff day" />
        <UiInput v-model.number="reminderDay2" type="number" min="1" max="31" label="Second cutoff day" />
      </div>
      <p class="text-xs text-ink-500 mb-4">
        Use 30 or 31 for "end of month" — it automatically adjusts for shorter months (e.g. February).
      </p>
      <p v-if="payrollIntervalSaved" class="text-sm text-emerald-300 bg-emerald-400/10 px-3 py-2 rounded-lg mb-3">Cutoff days saved.</p>
      <p v-if="payrollIntervalError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg mb-3">{{ payrollIntervalError }}</p>
      <UiButton size="sm" :loading="savingPayrollInterval" @click="handleSavePayrollInterval">Save</UiButton>
    </UiCard>

    <!-- Employee PIN reset (admin) -->
    <UiCard class="mb-6">
      <h2 class="font-display text-lg text-ink-50 mb-1">Reset Employee PIN</h2>
      <p class="text-xs text-ink-400 mb-4">Reset a PIN for an employee who forgot theirs. They can also update it themselves from their Profile.</p>
      <div class="space-y-3">
        <UiSelect v-model="pinEmployee" label="Employee" :options="employeeOptions" placeholder="Choose an employee" />
        <UiInput v-if="pinEmployee" v-model="adminPin" type="text" inputmode="numeric" autocomplete="off" maxlength="8" label="New PIN (4–8 digits)" placeholder="e.g. 1234" />
        <p v-if="pinResetError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg">{{ pinResetError }}</p>
        <p v-if="pinResetSuccess" class="text-sm text-emerald-300 bg-emerald-400/10 px-3 py-2 rounded-lg">PIN reset.</p>
        <UiButton size="sm" :disabled="!pinEmployee || !adminPin" :loading="resettingPin" @click="handleResetPin">Reset PIN</UiButton>
      </div>
    </UiCard>

    <!-- DTR → Attendance Import (admin) -->
    <UiCard class="mb-6">
      <h2 class="font-display text-lg text-ink-50 mb-1">Import DTR to Attendance</h2>
      <p class="text-xs text-ink-400 mb-4">Convert DTR punch records to Attendance entries for a date range. Preview first — existing Attendance records will be updated with status, late minutes, and undertime from the punches.</p>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <UiInput v-model="importFrom" type="date" label="From" />
        <UiInput v-model="importTo" type="date" label="To" />
      </div>
      <div class="flex gap-3 mb-4">
        <UiButton size="sm" variant="secondary" :loading="previewing" @click="handleImport(true)">Preview</UiButton>
        <UiButton size="sm" :loading="importing" :disabled="!importPreview" @click="handleImport(false)">Import {{ importPreview ? `(${importPreview.recordCount} records)` : '' }}</UiButton>
      </div>
      <p v-if="importError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg mb-3">{{ importError }}</p>
      <p v-if="importSuccess" class="text-sm text-emerald-300 bg-emerald-400/10 px-3 py-2 rounded-lg mb-3">{{ importSuccess }}</p>

      <div v-if="importPreview" class="mt-4">
        <p class="text-xs text-ink-400 mb-2">
          Will create <strong class="text-ink-100">{{ importPreview.willCreate }}</strong> new records and update <strong class="text-ink-100">{{ importPreview.willOverwrite }}</strong> existing. Work hours based on {{ importPreview.workStartTime }}–{{ importPreview.workEndTime }}.
        </p>
        <div class="max-h-48 overflow-y-auto border border-sand-200 rounded-lg">
          <table class="w-full text-xs">
            <thead class="bg-sand-200 sticky top-0">
              <tr class="text-ink-400 uppercase tracking-wide">
                <th class="px-3 py-2 text-left">Employee</th>
                <th class="px-3 py-2 text-left">Date</th>
                <th class="px-3 py-2 text-left">In</th>
                <th class="px-3 py-2 text-left">Out</th>
                <th class="px-3 py-2 text-left">Late</th>
                <th class="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-sand-200">
              <tr v-for="r in importPreview.results" :key="`${r.employee._id}-${r.date}`">
                <td class="px-3 py-2 text-ink-100">{{ r.employee.name }}</td>
                <td class="px-3 py-2 text-ink-300">{{ formatDate(r.date) }}</td>
                <td class="px-3 py-2 text-ink-300">{{ r.firstIn ? formatTime(r.firstIn) : '—' }}</td>
                <td class="px-3 py-2 text-ink-300">{{ r.lastOut ? formatTime(r.lastOut) : '—' }}</td>
                <td class="px-3 py-2" :class="r.lateMinutes > 0 ? 'text-amber-300' : 'text-ink-300'">{{ r.lateMinutes > 0 ? `${r.lateMinutes}m` : '—' }}</td>
                <td class="px-3 py-2"><span :class="r.willCreate ? 'text-emerald-300' : 'text-amber-300'">{{ r.willCreate ? 'Create' : 'Update' }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </UiCard>

    <!-- Barcode & NFC Credential Assignment (super-admin only) -->
    <UiCard v-if="auth.isSuperAdmin" class="mb-6">
      <h2 class="font-display text-lg text-ink-50 mb-1">Barcode & NFC Credentials</h2>
      <p class="text-xs text-ink-400 mb-4">Assign a barcode value or NFC card UID to each employee. Scan/tap the card or type the value — it's hashed before saving. To clear a credential, leave the value blank and save. Super Admin access only.</p>

      <div class="space-y-3 mb-4">
        <UiSelect v-model="credEmployee" label="Employee" :options="employeeOptions" placeholder="Choose an employee" />
        <UiSelect v-model="credType" label="Credential type" :options="[{ value: 'barcode', label: 'Barcode / QR Code' }, { value: 'nfc', label: 'NFC Card / Fob' }]" />
        <UiInput v-model="credValue" :label="`${credType === 'nfc' ? 'NFC UID' : 'Barcode value'} — scan/type, or leave blank to clear`" placeholder="Scan card or type value" />
      </div>

      <p v-if="credError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg mb-3">{{ credError }}</p>
      <p v-if="credSuccess" class="text-sm text-emerald-300 bg-emerald-400/10 px-3 py-2 rounded-lg mb-3">{{ credSuccess }}</p>

      <UiButton size="sm" :disabled="!credEmployee || !credType" :loading="savingCred" @click="handleSaveCredential">
        {{ credValue ? 'Assign Credential' : 'Clear Credential' }}
      </UiButton>
    </UiCard>

    <!-- QR Code for DTR (super-admin only) -->
    <UiCard v-if="auth.isSuperAdmin" class="mb-6">
      <h2 class="font-display text-lg text-ink-50 mb-1">QR Code for DTR</h2>
      <p class="text-xs text-ink-400 mb-4">Generate a printable QR badge for an employee to scan at the kiosk camera. Each employee's code is unique. Regenerating immediately invalidates the old one — reprint and redistribute if you do.</p>

      <UiSelect v-model="qrEmployee" label="Employee" :options="employeeOptions" placeholder="Choose an employee" class="mb-4" />

      <p v-if="qrError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg mb-3">{{ qrError }}</p>

      <div v-if="qrEmployee" class="flex gap-3 mb-4">
        <UiButton size="sm" :loading="loadingQr" @click="handleViewQr">View / Generate QR</UiButton>
        <UiButton v-if="qrValue" size="sm" variant="secondary" :loading="regeneratingQr" @click="handleRegenerateQr">Regenerate</UiButton>
        <UiButton v-if="qrValue" size="sm" variant="ghost" @click="printQr">Print Badge</UiButton>
      </div>

      <div v-if="qrValue" class="flex flex-col items-center gap-3 border border-sand-200 rounded-xl p-6" id="qr-print-area">
        <canvas ref="qrCanvasRef" class="bg-white p-3 rounded-lg"></canvas>
        <p class="text-sm font-medium text-ink-100">{{ qrEmployeeName }}</p>
        <p class="text-xs text-ink-500">BM Global Ventures Inc. — Time Clock Badge</p>
      </div>
    </UiCard>
  </div>
</template>

<script setup>
import dayjs from 'dayjs'

definePageMeta({ layout: 'default' })
const auth = useAuthStore()

// --- Kiosk password ---
const kioskPassword = ref('')
const confirmKioskPassword = ref('')
const kioskPwError = ref('')
const kioskPwSuccess = ref(false)
const settingKioskPw = ref(false)
const kioskIsSet = ref(false)

const { data: kioskStatus } = await useFetch('/api/dtr/kiosk-password')
kioskIsSet.value = kioskStatus.value?.isSet ?? false

async function handleSetKioskPassword() {
  kioskPwError.value = ''
  kioskPwSuccess.value = false
  if (kioskPassword.value !== confirmKioskPassword.value) { kioskPwError.value = 'Passwords do not match.'; return }
  settingKioskPw.value = true
  try {
    await $fetch('/api/dtr/kiosk-password', { method: 'POST', body: { password: kioskPassword.value } })
    kioskPwSuccess.value = true; kioskIsSet.value = true
    kioskPassword.value = ''; confirmKioskPassword.value = ''
    setTimeout(() => (kioskPwSuccess.value = false), 3000)
  } catch (err) { kioskPwError.value = err?.data?.statusMessage || 'Failed.' }
  finally { settingKioskPw.value = false }
}

// --- Work schedule & auto-sync ---
const workStart = ref('09:00')
const workEnd = ref('18:00')
const autoSync = ref(false)
const savingSchedule = ref(false)
const scheduleSaved = ref(false)
const scheduleError = ref('')

const { data: scheduleData } = await useFetch('/api/settings/schedule')
if (scheduleData.value) {
  workStart.value = scheduleData.value.workStart || '09:00'
  workEnd.value = scheduleData.value.workEnd || '18:00'
  autoSync.value = scheduleData.value.autoSync ?? false
}

async function handleSaveSchedule() {
  savingSchedule.value = true; scheduleError.value = ''; scheduleSaved.value = false
  try {
    await $fetch('/api/settings/schedule', { method: 'POST', body: { workStart: workStart.value, workEnd: workEnd.value, autoSync: autoSync.value } })
    scheduleSaved.value = true
    setTimeout(() => (scheduleSaved.value = false), 3000)
  } catch (err) { scheduleError.value = err?.data?.statusMessage || 'Failed.' }
  finally { savingSchedule.value = false }
}

// --- Payroll reminder cutoff days ---
const reminderDay1 = ref(15)
const reminderDay2 = ref(30)
const savingPayrollInterval = ref(false)
const payrollIntervalSaved = ref(false)
const payrollIntervalError = ref('')

const reminderPresets = [
  { label: '5th & 25th', day1: 5, day2: 25 },
  { label: '10th & 20th', day1: 10, day2: 20 },
  { label: '15th & 30th', day1: 15, day2: 30 }
]

const { data: payrollScheduleData } = await useFetch('/api/settings/payroll-schedule')
if (payrollScheduleData.value) {
  reminderDay1.value = payrollScheduleData.value.day1 || 15
  reminderDay2.value = payrollScheduleData.value.day2 || 30
}

async function handleSavePayrollInterval() {
  savingPayrollInterval.value = true; payrollIntervalError.value = ''; payrollIntervalSaved.value = false
  try {
    await $fetch('/api/settings/payroll-schedule', {
      method: 'POST',
      body: { day1: reminderDay1.value, day2: reminderDay2.value }
    })
    payrollIntervalSaved.value = true
    setTimeout(() => (payrollIntervalSaved.value = false), 3000)
  } catch (err) { payrollIntervalError.value = err?.data?.statusMessage || 'Failed.' }
  finally { savingPayrollInterval.value = false }
}

// --- Employee options (shared) ---
const { data: empData } = await useFetch('/api/employees', { query: { status: 'active' } })
const employeeOptions = computed(() =>
  (empData.value?.employees || [])
    .filter((e) => e.role !== 'super_admin')
    .map((e) => ({ value: e._id, label: `${e.firstName} ${e.lastName} (${e.employeeNumber})` }))
)

// --- PIN reset ---
const pinEmployee = ref('')
const adminPin = ref('')
const pinResetError = ref('')
const pinResetSuccess = ref(false)
const resettingPin = ref(false)

async function handleResetPin() {
  pinResetError.value = ''; pinResetSuccess.value = false
  if (!/^\d{4,8}$/.test(adminPin.value)) { pinResetError.value = 'PIN must be 4 to 8 digits.'; return }
  resettingPin.value = true
  try {
    await $fetch('/api/dtr/set-pin', { method: 'POST', body: { employeeId: pinEmployee.value, pin: adminPin.value } })
    pinResetSuccess.value = true; adminPin.value = ''; pinEmployee.value = ''
    setTimeout(() => (pinResetSuccess.value = false), 3000)
  } catch (err) { pinResetError.value = err?.data?.statusMessage || 'Failed.' }
  finally { resettingPin.value = false }
}

// --- DTR → Attendance import ---
const importFrom = ref(dayjs().startOf('month').format('YYYY-MM-DD'))
const importTo = ref(dayjs().format('YYYY-MM-DD'))
const importPreview = ref(null)
const previewing = ref(false)
const importing = ref(false)
const importError = ref('')
const importSuccess = ref('')

async function handleImport(isPreview) {
  importError.value = ''; importSuccess.value = ''
  if (isPreview) { previewing.value = true; importPreview.value = null }
  else importing.value = true
  try {
    const res = await $fetch('/api/dtr/import-attendance', {
      method: 'POST',
      body: { from: importFrom.value, to: importTo.value, preview: isPreview }
    })
    if (isPreview) {
      importPreview.value = res
      if (!res.recordCount) importError.value = 'No DTR records found in this date range.'
    } else {
      importSuccess.value = `Imported ${res.recordCount} records (${res.willCreate} created, ${res.willOverwrite} updated).`
      importPreview.value = null
    }
  } catch (err) { importError.value = err?.data?.statusMessage || 'Import failed.' }
  finally { previewing.value = false; importing.value = false }
}

// --- Barcode/NFC credential assignment (super-admin only) ---
const credEmployee = ref('')
const credType = ref('barcode')
const credValue = ref('')
const credError = ref('')
const credSuccess = ref('')
const savingCred = ref(false)

async function handleSaveCredential() {
  credError.value = ''; credSuccess.value = ''
  savingCred.value = true
  try {
    const res = await $fetch('/api/dtr/assign-credential', {
      method: 'POST',
      body: { employeeId: credEmployee.value, credentialType: credType.value, value: credValue.value || null }
    })
    credSuccess.value = res.cleared
      ? `${credType.value} credential cleared.`
      : `${credType.value} credential assigned.`
    credValue.value = ''; credEmployee.value = ''
    setTimeout(() => (credSuccess.value = ''), 3000)
  } catch (err) { credError.value = err?.data?.statusMessage || 'Failed.' }
  finally { savingCred.value = false }
}

function formatDate(d) { return dayjs(d).format('MMM D') }
function formatTime(d) { return dayjs(d).format('h:mm A') }

// --- QR Code for DTR (super-admin only) ---
const qrEmployee = ref('')
const qrValue = ref('')
const qrEmployeeName = ref('')
const qrError = ref('')
const loadingQr = ref(false)
const regeneratingQr = ref(false)
const qrCanvasRef = ref(null)

// Load the qrcode rendering library from CDN, only when needed (this page,
// super-admin section only) rather than bundling it for every page load.
let qrLibLoaded = false
function loadQrLib() {
  return new Promise((resolve, reject) => {
    if (qrLibLoaded || window.QRCode) { qrLibLoaded = true; resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
    script.onload = () => { qrLibLoaded = true; resolve() }
    script.onerror = () => reject(new Error('Failed to load QR library'))
    document.head.appendChild(script)
  })
}

watch(qrEmployee, () => {
  // Reset the displayed QR whenever a different employee is selected, so we
  // never show a stale code under the wrong name.
  qrValue.value = ''
  qrError.value = ''
})

async function handleViewQr() {
  if (!qrEmployee.value) return
  loadingQr.value = true
  qrError.value = ''
  try {
    const res = await $fetch('/api/dtr/qr-code', { query: { employeeId: qrEmployee.value } })
    qrValue.value = res.qrValue
    qrEmployeeName.value = res.employeeName
    await renderQr()
  } catch (err) {
    qrError.value = err?.data?.statusMessage || 'Failed to load QR code.'
  } finally {
    loadingQr.value = false
  }
}

async function handleRegenerateQr() {
  if (!qrEmployee.value) return
  if (!confirm('Regenerate this QR code? The old printed badge will stop working immediately.')) return
  regeneratingQr.value = true
  qrError.value = ''
  try {
    const res = await $fetch('/api/dtr/qr-code', { method: 'POST', body: { employeeId: qrEmployee.value } })
    qrValue.value = res.qrValue
    qrEmployeeName.value = res.employeeName
    await renderQr()
  } catch (err) {
    qrError.value = err?.data?.statusMessage || 'Failed to regenerate QR code.'
  } finally {
    regeneratingQr.value = false
  }
}

async function renderQr() {
  await loadQrLib()
  await nextTick()
  if (!qrCanvasRef.value || !window.QRCode) return
  // qrcodejs draws into a container div, not directly to a canvas — render
  // into a temporary div, then transfer the resulting canvas/img.
  const container = document.createElement('div')
  new window.QRCode(container, { text: qrValue.value, width: 220, height: 220 })
  // qrcodejs renders asynchronously into an <img> or <canvas> inside container
  await new Promise((r) => setTimeout(r, 100))
  const inner = container.querySelector('canvas') || container.querySelector('img')
  const ctx = qrCanvasRef.value.getContext('2d')
  qrCanvasRef.value.width = 220
  qrCanvasRef.value.height = 220
  if (inner) {
    if (inner.tagName === 'CANVAS') {
      ctx.drawImage(inner, 0, 0)
    } else {
      await new Promise((resolve) => {
        if (inner.complete) resolve()
        else inner.onload = resolve
      })
      ctx.drawImage(inner, 0, 0, 220, 220)
    }
  }
}

function printQr() {
  const printContents = document.getElementById('qr-print-area').innerHTML
  const printWindow = window.open('', '_blank', 'width=400,height=500')
  printWindow.document.write(`
    <html>
      <head><title>DTR Badge — ${qrEmployeeName.value}</title></head>
      <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;padding:24px;">
        ${printContents}
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => { printWindow.print(); printWindow.close() }, 300)
}
</script>
