<template>
  <div>
    <header class="mb-8">
      <p class="text-xs uppercase tracking-[0.18em] text-ink-400 font-semibold">Time Clock</p>
      <h1 class="font-display text-3xl text-ink-50 mt-1">Daily Time Record</h1>
      <p class="text-sm text-ink-400 mt-1">{{ auth.isAdmin ? "Employees' clock-in/out punches — a separate record from cutoff attendance." : "Review your punch history. Clock in and out at the DTR Kiosk." }}</p>
    </header>

    <!-- Employees no longer clock in/out from here — the Kiosk is the only -->
    <!-- punch method now. This still shows their own punch history below. -->
    <UiCard v-if="!auth.isAdmin" class="mb-6">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p class="text-xs text-ink-400 uppercase tracking-wide">Right now</p>
          <p class="font-display text-2xl mt-1" :class="currentlyIn ? 'text-emerald-300' : 'text-ink-50'">
            {{ currentlyIn ? 'Clocked In' : 'Clocked Out' }}
          </p>
          <p class="text-xs text-ink-500 mt-1">{{ nowLabel }}</p>
        </div>
        <p class="text-sm text-ink-300 bg-sand-100 px-3 py-2 rounded-lg max-w-sm text-right">
          Clock in and out at the <span class="font-semibold text-ink-50">DTR Kiosk</span> — self-service punching from your account is no longer available here.
        </p>
      </div>
    </UiCard>

    <!-- Admin: pick an employee or view everyone -->
    <UiCard v-if="auth.isAdmin" class="mb-6">
      <div class="grid sm:grid-cols-3 gap-4">
        <UiSelect v-model="selectedEmployee" label="Employee" :options="employeeOptions" placeholder="All employees" />
        <UiInput v-model="from" type="date" label="From" />
        <UiInput v-model="to" type="date" label="To" />
      </div>
      <div class="flex justify-end mt-4">
        <UiButton size="sm" :loading="loading" @click="loadEntries">Filter</UiButton>
      </div>

      <!-- Manual punch — only makes sense once a single employee is chosen -->
      <div v-if="selectedEmployee" class="flex items-center justify-between flex-wrap gap-4 mt-6 pt-6 border-t border-sand-200">
        <div>
          <p class="text-xs text-ink-400 uppercase tracking-wide">{{ selectedEmployeeLabel }} — right now</p>
          <p class="font-display text-2xl mt-1" :class="currentlyIn ? 'text-emerald-300' : 'text-ink-50'">
            {{ currentlyIn ? 'Clocked In' : 'Clocked Out' }}
          </p>
        </div>
        <UiButton
          size="md"
          :variant="currentlyIn ? 'danger' : 'primary'"
          :loading="adminPunching"
          @click="handleAdminPunch(currentlyIn ? 'out' : 'in')"
        >
          {{ currentlyIn ? 'Clock Out' : 'Clock In' }} {{ selectedEmployeeLabel }}
        </UiButton>
      </div>
      <p v-if="adminPunchError" class="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg mt-4">{{ adminPunchError }}</p>
      <p v-if="adminPunchMsg" class="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg mt-4">{{ adminPunchMsg }}</p>
    </UiCard>

    <UiCard v-else class="mb-6">
      <div class="grid sm:grid-cols-2 gap-4">
        <UiInput v-model="from" type="date" label="From" />
        <UiInput v-model="to" type="date" label="To" />
      </div>
      <div class="flex justify-end mt-4">
        <UiButton size="sm" variant="secondary" :loading="loading" @click="loadEntries">Filter</UiButton>
      </div>
    </UiCard>

    <UiCard :padded="false">
      <div v-if="pending" class="p-6 text-sm text-ink-400">Loading…</div>
      <div v-else-if="!entries.length" class="p-6 text-sm text-ink-400">No DTR entries in this range.</div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-sand-200">
            <th v-if="auth.isAdmin" class="px-4 py-3">Employee</th>
            <th class="px-4 py-3">Date</th>
            <th class="px-4 py-3">Punches</th>
            <th class="px-4 py-3">Hours Worked</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-sand-200">
          <tr v-for="entry in entries" :key="entry._id">
            <td v-if="auth.isAdmin" class="px-4 py-3 text-ink-100 font-medium">
              {{ entry.employee?.firstName }} {{ entry.employee?.lastName }}
            </td>
            <td class="px-4 py-3 text-ink-300 whitespace-nowrap">{{ formatDate(entry.date) }}</td>
            <td class="px-4 py-3 text-ink-300">
              <span v-for="(p, idx) in entry.punches" :key="idx" class="inline-block mr-3">
                <UiBadge :tone="p.type === 'in' ? 'success' : 'neutral'" class="mr-1">{{ p.type }}</UiBadge>
                {{ formatTime(p.at) }}
              </span>
            </td>
            <td class="px-4 py-3 font-semibold text-ink-50">{{ entry.hoursWorked }} hrs</td>
          </tr>
        </tbody>
      </table>
    </UiCard>
  </div>
</template>

<script setup>
import dayjs from 'dayjs'

definePageMeta({ layout: 'default' })
const auth = useAuthStore()

const from = ref(dayjs().startOf('month').format('YYYY-MM-DD'))
const to = ref(dayjs().format('YYYY-MM-DD'))
const selectedEmployee = ref('')
const entries = ref([])
const currentlyIn = ref(false)
const loading = ref(false)
const pending = ref(true)

const employeeOptions = ref([])
if (auth.isAdmin) {
  const { data: empData } = await useFetch('/api/employees', { query: { status: 'active' } })
  employeeOptions.value = [
    { value: '', label: 'All employees' },
    ...(empData.value?.employees || []).map((e) => ({
      value: e._id,
      label: `${e.firstName} ${e.lastName} (${e.employeeNumber})`
    }))
  ]
}

async function loadEntries() {
  loading.value = true
  try {
    const query = { from: from.value, to: to.value }
    if (auth.isAdmin) {
      if (selectedEmployee.value) {
        query.employee = selectedEmployee.value
      } else {
        query.all = 'true'
      }
    }
    const res = await $fetch('/api/dtr', { query })
    entries.value = res.entries
    currentlyIn.value = res.currentlyIn
  } finally {
    loading.value = false
    pending.value = false
  }
}

// --- Admin: manual clock in/out on behalf of an employee ---
const selectedEmployeeLabel = computed(() => {
  const opt = employeeOptions.value.find((o) => o.value === selectedEmployee.value)
  // Strip the trailing " (EMP-0001)" bit for a cleaner button label
  return opt ? opt.label.replace(/\s*\([^)]*\)\s*$/, '') : ''
})

const adminPunching = ref(false)
const adminPunchError = ref('')
const adminPunchMsg = ref('')

async function handleAdminPunch(type) {
  if (!selectedEmployee.value) return
  adminPunching.value = true
  adminPunchError.value = ''
  adminPunchMsg.value = ''
  try {
    const res = await $fetch('/api/dtr/admin-punch', {
      method: 'POST',
      body: { employeeId: selectedEmployee.value, type }
    })
    currentlyIn.value = res.currentlyIn
    adminPunchMsg.value = `${res.employeeName} clocked ${type} successfully.`
    setTimeout(() => (adminPunchMsg.value = ''), 3000)
    await loadEntries()
  } catch (err) {
    adminPunchError.value = err?.data?.statusMessage || 'Failed to record punch.'
  } finally {
    adminPunching.value = false
  }
}

// Re-fetch (including today's clock state) whenever the admin switches
// which employee they're looking at, so the manual punch button always
// reflects the currently-selected employee, not the previous one.
watch(selectedEmployee, () => {
  if (auth.isAdmin) loadEntries()
})

const nowLabel = ref('')
function updateClock() {
  nowLabel.value = dayjs().format('dddd, MMMM D, YYYY · h:mm:ss A')
}
let clockInterval = null
onMounted(() => {
  updateClock()
  clockInterval = setInterval(updateClock, 1000)
})
onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
})

function formatDate(d) {
  return dayjs(d).format('ddd, MMM D, YYYY')
}

function formatTime(d) {
  return dayjs(d).format('h:mm A')
}

await loadEntries()
</script>
