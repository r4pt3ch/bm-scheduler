<template>
  <div class="min-h-screen bg-sand-50 flex flex-col">

    <!-- Locked screen -->
    <div v-if="state === 'locked'" class="flex-1 flex flex-col items-center justify-center px-6">
      <img src="/images/logo.png" alt="BM Global Ventures Inc." class="w-24 h-24 mb-6" />
      <h1 class="font-display text-3xl text-ink-50 mb-1">Time Clock Kiosk</h1>
      <p class="text-sm text-ink-400 mb-8">BM Global Ventures Inc.</p>
      <div class="w-full max-w-sm space-y-4">
        <UiInput v-model="kioskPassword" type="password" label="Kiosk Password" @keyup.enter="handleUnlock" />
        <p v-if="lockError" class="text-sm text-rose-300">{{ lockError }}</p>
        <UiButton class="w-full" :loading="unlocking" @click="handleUnlock">Unlock</UiButton>
      </div>
    </div>

    <!-- Employee picker -->
    <div v-else-if="state === 'picker'" class="flex-1 flex flex-col">
      <!-- Header bar -->
      <div class="bg-sand-100 border-b border-sand-200 px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/images/logo.png" alt="" class="w-10 h-10" />
          <div>
            <p class="text-xs text-brand-400 uppercase tracking-wide font-semibold">Time Clock Kiosk</p>
            <p class="font-display text-lg text-ink-50">{{ nowLabel }}</p>
          </div>
        </div>
        <div class="flex gap-2">
          <UiButton v-if="nfcSupported" variant="secondary" size="sm" :class="nfcListening ? 'ring-2 ring-brand-400' : ''" @click="toggleNfc">
            {{ nfcListening ? '📡 Listening…' : 'NFC' }}
          </UiButton>
          <UiButton variant="ghost" size="sm" @click="handleLock">Lock</UiButton>
        </div>
      </div>

      <!-- NFC status banner -->
      <div v-if="nfcListening" class="bg-brand-600/20 border-b border-brand-500/30 px-6 py-3 text-center text-sm text-brand-300">
        📡 Hold your NFC card/fob to the reader to punch in/out automatically…
        <button class="underline ml-2 text-brand-400" @click="stopNfc">Stop</button>
      </div>

      <!-- HID barcode scanner listener (hidden input, always focused) -->
      <input
        ref="hidInputRef"
        v-model="hidBuffer"
        class="opacity-0 absolute w-0 h-0"
        @keydown.enter.prevent="handleHidScan"
      />

      <div class="flex-1 p-6">
        <h2 class="font-display text-xl text-ink-50 mb-4 text-center">Who are you? <span class="text-sm font-sans text-ink-400">(tap your name, scan your card, or use NFC)</span></h2>

        <div class="flex gap-3 mb-4">
          <input
            v-model="search"
            placeholder="Search name…"
            class="focus-ring flex-1 rounded-lg border border-sand-200 bg-sand-100 text-ink-50 placeholder:text-ink-500/60 px-4 py-3 text-sm focus:border-brand-400"
          />
          <UiButton variant="secondary" size="sm" @click="showCameraScanner = !showCameraScanner">
            {{ showCameraScanner ? 'Hide Camera' : '📷 Scan QR' }}
          </UiButton>
        </div>

        <!-- Camera QR scanner -->
        <div v-if="showCameraScanner" class="mb-4 rounded-xl overflow-hidden border border-sand-200">
          <video ref="videoRef" class="w-full max-h-48 object-cover" autoplay muted playsinline />
          <p class="text-xs text-ink-400 text-center py-2">Point camera at employee barcode/QR</p>
        </div>

        <p v-if="scanError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg mb-4">{{ scanError }}</p>

        <!-- Regular employees — shown first, always visible -->
        <div v-if="filteredRegular.length === 0 && !search" class="text-center text-sm text-ink-400 py-8">No employees configured yet.</div>
        <div v-else-if="filteredRegular.length === 0 && search" class="text-center text-sm text-ink-400 py-4">No employees match your search.</div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          <button
            v-for="emp in filteredRegular" :key="emp._id"
            class="focus-ring bg-sand-100 border border-sand-200 rounded-xl p-4 text-left hover:border-brand-500 hover:bg-sand-200 transition"
            @click="selectEmployee(emp)"
          >
            <div class="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-semibold mb-2">
              {{ initials(emp) }}
            </div>
            <p class="text-sm font-medium text-ink-50 leading-tight">{{ emp.firstName }} {{ emp.lastName }}</p>
            <p class="text-xs text-ink-400 mt-0.5">{{ emp.employeeNumber }}</p>
            <div class="flex gap-1 mt-1">
              <span v-if="emp.hasDtrPin" class="text-[10px] text-ink-500 bg-sand-200 px-1.5 py-0.5 rounded">PIN</span>
              <span v-if="emp.hasDtrBarcode" class="text-[10px] text-ink-500 bg-sand-200 px-1.5 py-0.5 rounded">🔖</span>
              <span v-if="emp.hasDtrNfc" class="text-[10px] text-ink-500 bg-sand-200 px-1.5 py-0.5 rounded">📡</span>
              <span v-if="emp.hasDtrQr" class="text-[10px] text-ink-500 bg-sand-200 px-1.5 py-0.5 rounded">▦</span>
              <span v-if="!emp.hasDtrPin && !emp.hasDtrBarcode && !emp.hasDtrNfc && !emp.hasDtrQr" class="text-[10px] text-amber-400">No credential</span>
            </div>
          </button>
        </div>

        <!-- Admin section — hidden by default, revealed by toggle -->
        <div v-if="filteredAdmins.length > 0" class="border-t border-sand-200 pt-4">
          <button
            class="flex items-center gap-2 text-xs text-ink-500 hover:text-ink-300 mb-3 transition"
            @click="showAdmins = !showAdmins"
          >
            <svg class="w-3.5 h-3.5 transition-transform" :class="showAdmins ? 'rotate-90' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {{ showAdmins ? 'Hide' : 'Show' }} admins ({{ filteredAdmins.length }})
          </button>

          <div v-if="showAdmins" class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            <button
              v-for="emp in filteredAdmins" :key="emp._id"
              class="focus-ring bg-sand-100 border border-sand-200 rounded-lg p-3 text-left hover:border-brand-500 hover:bg-sand-200 transition"
              @click="selectEmployee(emp)"
            >
              <div class="w-8 h-8 rounded-full bg-brand-700 text-white flex items-center justify-center text-xs font-semibold mb-1.5">
                {{ initials(emp) }}
              </div>
              <p class="text-xs font-medium text-ink-100 leading-tight truncate">{{ emp.firstName }} {{ emp.lastName }}</p>
              <p class="text-[10px] text-ink-500 mt-0.5">{{ emp.employeeNumber }}</p>
              <div class="flex gap-1 mt-1">
                <span v-if="emp.hasDtrPin" class="text-[10px] text-ink-500 bg-sand-200 px-1 py-0.5 rounded">PIN</span>
                <span v-if="emp.hasDtrBarcode" class="text-[10px] text-ink-500 bg-sand-200 px-1 py-0.5 rounded">🔖</span>
                <span v-if="emp.hasDtrNfc" class="text-[10px] text-ink-500 bg-sand-200 px-1 py-0.5 rounded">📡</span>
                <span v-if="emp.hasDtrQr" class="text-[10px] text-ink-500 bg-sand-200 px-1 py-0.5 rounded">▦</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- PIN entry (after selecting from picker) -->
    <div v-else-if="state === 'pin'" class="flex-1 flex flex-col items-center justify-center px-6">
      <button class="self-start mb-6 text-sm text-ink-400 hover:underline" @click="backToPicker">← Back</button>
      <div class="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center text-lg font-semibold mb-3">
        {{ initials(selectedEmployee) }}
      </div>
      <h2 class="font-display text-2xl text-ink-50 mb-1">{{ selectedEmployee?.firstName }} {{ selectedEmployee?.lastName }}</h2>
      <p class="text-sm text-ink-400 mb-6">{{ selectedEmployee?.employeeNumber }}</p>
      <div class="w-full max-w-xs space-y-4">
        <UiInput v-model="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" label="Enter your PIN" placeholder="••••" @keyup.enter="submitPin" />
        <p v-if="pinError" class="text-sm text-rose-300">{{ pinError }}</p>
        <div class="grid grid-cols-2 gap-3">
          <UiButton variant="secondary" :loading="punching" @click="submitPinType('out')">Clock Out</UiButton>
          <UiButton :loading="punching" @click="submitPinType('in')">Clock In</UiButton>
        </div>
      </div>
    </div>

    <!-- Confirmation -->
    <div v-else-if="state === 'confirmation'" class="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div class="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        :class="lastPunchType === 'in' ? 'bg-emerald-400/20' : 'bg-sand-200'">
        <svg v-if="lastPunchType === 'in'" class="w-10 h-10 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <svg v-else class="w-10 h-10 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </div>
      <h2 class="font-display text-3xl text-ink-50 mb-1">{{ lastPunchType === 'in' ? 'Clocked In!' : 'Clocked Out!' }}</h2>
      <p class="text-lg text-ink-100 mb-2">{{ confirmationName }}</p>
      <p class="text-sm text-ink-400 mb-1">{{ formatTime(lastPunchTime) }}</p>
      <p v-if="hoursWorkedToday > 0" class="text-sm text-ink-400">{{ hoursWorkedToday }} hrs worked today</p>
      <p v-if="credentialUsed !== 'pin'" class="text-xs text-ink-500 mt-1">via {{ credentialUsed }}</p>
      <p class="text-xs text-ink-500 mt-8">Returning in {{ countdown }}s…</p>
      <UiButton variant="ghost" class="mt-2" @click="resetToPickerNow">Done</UiButton>
    </div>

  </div>
</template>

<script setup>
import dayjs from 'dayjs'

definePageMeta({ layout: 'kiosk' })

const state = ref('locked')
const kioskPassword = ref('')
const lockError = ref('')
const unlocking = ref(false)
const employees = ref([])
const search = ref('')
const selectedEmployee = ref(null)
const pin = ref('')
const pinError = ref('')
const punching = ref(false)
const scanError = ref('')
const hidBuffer = ref('')
const hidInputRef = ref(null)
const showCameraScanner = ref(false)
const videoRef = ref(null)
const lastPunchType = ref('')
const lastPunchTime = ref(null)
const confirmationName = ref('')
const hoursWorkedToday = ref(0)
const credentialUsed = ref('pin')
const countdown = ref(5)
let countdownTimer = null
let cameraStream = null
let cameraAnimFrame = null
const nfcSupported = ref(false)
const nfcListening = ref(false)
let nfcController = null

const nowLabel = ref('')
function updateClock() { nowLabel.value = dayjs().format('ddd, MMM D · h:mm A') }
let clockInterval = null

const filteredRegular = computed(() => {
  const list = employees.value.filter((e) => e.role === 'employee')
  if (!search.value) return list
  const q = search.value.toLowerCase()
  return list.filter((e) =>
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) || e.employeeNumber.toLowerCase().includes(q)
  )
})

const filteredAdmins = computed(() => {
  const list = employees.value.filter((e) => e.role === 'admin')
  if (!search.value) return list
  const q = search.value.toLowerCase()
  return list.filter((e) =>
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) || e.employeeNumber.toLowerCase().includes(q)
  )
})

const showAdmins = ref(false)

onMounted(() => {
  updateClock()
  clockInterval = setInterval(updateClock, 1000)
  nfcSupported.value = 'NDEFReader' in window
})

onUnmounted(() => {
  clearInterval(clockInterval)
  clearInterval(countdownTimer)
  stopCamera()
  stopNfc()
})

async function handleUnlock() {
  if (!kioskPassword.value) return
  unlocking.value = true; lockError.value = ''
  try {
    await $fetch('/api/dtr/kiosk-unlock', { method: 'POST', body: { password: kioskPassword.value } })
    kioskPassword.value = ''
    await loadEmployees()
    state.value = 'picker'
    nextTick(() => hidInputRef.value?.focus())
  } catch (err) {
    lockError.value = err?.data?.statusMessage || 'Incorrect password.'
  } finally { unlocking.value = false }
}

async function loadEmployees() {
  const res = await $fetch('/api/dtr/kiosk-employees')
  employees.value = res.employees
}

function handleLock() {
  state.value = 'locked'; search.value = ''; pin.value = ''; selectedEmployee.value = null
  showAdmins.value = false
  stopCamera(); stopNfc()
}

function backToPicker() {
  state.value = 'picker'; pin.value = ''; pinError.value = ''
  nextTick(() => hidInputRef.value?.focus())
}

function selectEmployee(emp) {
  selectedEmployee.value = emp; pin.value = ''; pinError.value = ''
  state.value = 'pin'
}

async function submitPinType(type) {
  if (!pin.value) { pinError.value = 'Enter your PIN.'; return }
  punching.value = true; pinError.value = ''
  try {
    const res = await $fetch('/api/dtr/kiosk-punch', {
      method: 'POST',
      body: { employeeId: selectedEmployee.value._id, credentialType: 'pin', credential: pin.value, type }
    })
    showConfirmation(res, 'pin')
  } catch (err) { pinError.value = err?.data?.statusMessage || 'Failed.' }
  finally { punching.value = false }
}

function submitPin() { submitPinType('in') }

// --- HID barcode scanner (USB/Bluetooth) ---
// HID scanners type keystrokes very quickly into whatever input is focused.
// We keep a hidden input focused and collect keystrokes into a buffer.
// When Enter fires (scanner sends Enter after the barcode), we treat the
// buffer as the barcode value and try to match it to an employee.
let hidTimer = null
watch(hidBuffer, () => {
  clearTimeout(hidTimer)
  hidTimer = setTimeout(() => { hidBuffer.value = '' }, 500) // clear buffer if no Enter within 500ms
})

async function handleHidScan() {
  const value = hidBuffer.value.trim()
  hidBuffer.value = ''
  if (!value) return
  await handleCredentialScan('barcode', value)
}

// --- Camera QR scanning ---
watch(showCameraScanner, async (show) => {
  if (show) {
    await startCamera()
  } else {
    stopCamera()
  }
})

async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    await nextTick()
    if (videoRef.value) {
      videoRef.value.srcObject = cameraStream
      scanCameraLoop()
    }
  } catch {
    scanError.value = 'Camera not available or permission denied.'
    showCameraScanner.value = false
  }
}

function stopCamera() {
  if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null }
  cancelAnimationFrame(cameraAnimFrame)
}

async function scanCameraLoop() {
  if (!showCameraScanner.value || !videoRef.value) return
  const video = videoRef.value
  if (video.readyState >= 2) {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    // Use jsQR if available (loaded dynamically), otherwise show message
    if (window.jsQR) {
      const ctx = canvas.getContext('2d')
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = window.jsQR(imageData.data, canvas.width, canvas.height)
      if (code?.data) {
        showCameraScanner.value = false
        stopCamera()
        await handleCredentialScan('scan', code.data)
        return
      }
    }
  }
  cameraAnimFrame = requestAnimationFrame(scanCameraLoop)
}

// --- NFC scanning ---
async function toggleNfc() {
  if (nfcListening.value) { stopNfc(); return }
  await startNfc()
}

async function startNfc() {
  if (!('NDEFReader' in window)) return
  try {
    nfcController = new AbortController()
    const reader = new NDEFReader()
    await reader.scan({ signal: nfcController.signal })
    nfcListening.value = true

    reader.addEventListener('reading', async ({ serialNumber, message }) => {
      const uid = serialNumber || message?.records?.[0]?.data || ''
      if (uid) {
        nfcListening.value = false
        nfcController?.abort()
        await handleCredentialScan('nfc', String(uid))
      }
    })

    reader.addEventListener('readingerror', () => {
      scanError.value = 'NFC read error. Try again.'
    })
  } catch (err) {
    scanError.value = err.message || 'NFC not available.'
    nfcListening.value = false
  }
}

function stopNfc() {
  nfcController?.abort()
  nfcListening.value = false
}

// --- Shared credential scan handler (barcode or NFC) ---
// No employee selection needed — the credential identifies the employee.
async function handleCredentialScan(credentialType, value) {
  scanError.value = ''
  try {
    const res = await $fetch('/api/dtr/kiosk-punch', {
      method: 'POST',
      body: { credentialType, credential: value }
      // type is omitted — server auto-determines in/out based on current state
    })
    showConfirmation(res, credentialType)
  } catch (err) {
    scanError.value = err?.data?.statusMessage || `${credentialType} not recognized.`
    nextTick(() => hidInputRef.value?.focus())
  }
}

function showConfirmation(res, credential) {
  lastPunchType.value = res.type
  lastPunchTime.value = res.punchTime
  confirmationName.value = res.employeeName
  hoursWorkedToday.value = res.hoursWorkedToday
  credentialUsed.value = credential
  state.value = 'confirmation'
  startCountdown()
}

function startCountdown() {
  countdown.value = 5
  clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    if (--countdown.value <= 0) resetToPickerNow()
  }, 1000)
}

function resetToPickerNow() {
  clearInterval(countdownTimer)
  selectedEmployee.value = null; search.value = ''; pin.value = ''; scanError.value = ''
  showAdmins.value = false
  state.value = 'picker'
  nextTick(() => hidInputRef.value?.focus())
}

function initials(emp) {
  if (!emp) return ''
  return `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase()
}

function formatTime(d) { return d ? dayjs(d).format('h:mm:ss A') : '' }
</script>
