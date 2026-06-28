<template>
  <div class="min-h-screen bg-gray-50">
    <NavBar />
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Page header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Schedule</h1>
          <p class="text-gray-500 mt-0.5 text-sm">{{ viewLabel }}</p>
        </div>

        <div class="flex items-center gap-3">
          <!-- View toggle -->
          <div class="flex rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
            <button
              @click="view = 'week'"
              class="px-4 py-2 text-sm font-medium transition-colors"
              :style="view === 'week' ? 'background:#D4AF37; color:#000; font-weight:600;' : ''"
              :class="view === 'week' ? '' : 'text-gray-600 hover:bg-gray-50'"
            >Week</button>
            <button
              @click="view = 'month'"
              class="px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200"
              :style="view === 'month' ? 'background:#D4AF37; color:#000; font-weight:600;' : ''"
              :class="view === 'month' ? '' : 'text-gray-600 hover:bg-gray-50'"
            >Month</button>
          </div>

          <!-- Navigation -->
          <div class="flex items-center gap-1">
            <button @click="navigate(-1)" class="btn btn-secondary btn-sm px-2.5">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button @click="goToToday" class="btn btn-secondary btn-sm">Today</button>
            <button @click="navigate(1)" class="btn btn-secondary btn-sm px-2.5">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <button v-if="isManager" @click="openAddShift()" class="btn btn-primary btn-sm">
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Shift
          </button>
        </div>
      </div>

      <!-- Filters (manager only) -->
      <div v-if="isManager" class="flex gap-3 mb-4 overflow-x-auto pb-1">
        <button
          @click="filterEmployee = ''"
          class="badge px-3 py-1.5 text-sm whitespace-nowrap transition-colors cursor-pointer"
          :style="filterEmployee === '' ? 'background:rgba(212,175,55,0.15); color:#92700a; border:1px solid rgba(212,175,55,0.4);' : ''"
          :class="filterEmployee === '' ? '' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'"
        >
          All Employees
        </button>
        <button
          v-for="emp in employees"
          :key="emp._id"
          @click="filterEmployee = emp._id"
          class="badge px-3 py-1.5 text-sm whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5"
          :style="filterEmployee === emp._id ? 'background:rgba(212,175,55,0.15); color:#92700a; border:1px solid rgba(212,175,55,0.4);' : ''"
          :class="filterEmployee === emp._id ? '' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'"
        >
          <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: emp.color }"></span>
          {{ emp.name }}
        </button>
      </div>

      <!-- Calendar -->
      <WeeklyCalendar
        v-if="view === 'week'"
        :shifts="filteredShifts"
        :week-start="weekStart"
        :is-manager="isManager"
        @add-shift="openAddShift"
        @edit-shift="openEditShift"
      />

      <MonthlyCalendar
        v-else
        :shifts="filteredShifts"
        :current-month="currentMonth"
        :is-manager="isManager"
        @add-shift="openAddShift"
        @edit-shift="openEditShift"
      />

      <!-- Shift legend (mobile helper) -->
      <div v-if="employees.length && isManager" class="mt-4 card p-4">
        <p class="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Employee Legend</p>
        <div class="flex flex-wrap gap-3">
          <div v-for="emp in employees" :key="emp._id" class="flex items-center gap-1.5 text-sm text-gray-700">
            <span class="w-3 h-3 rounded-full flex-shrink-0" :style="{ backgroundColor: emp.color }"></span>
            {{ emp.name }}
          </div>
        </div>
      </div>
    </main>

    <!-- Shift modal -->
    <ShiftModal
      v-if="showModal"
      :shift="selectedShift"
      :default-date="selectedDate"
      :employees="employees"
      @close="showModal = false"
      @saved="onShiftSaved"
      @deleted="onShiftDeleted"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { isManager } = useAuth()

const view = ref<'week' | 'month'>('week')
const today = new Date()
const currentDate = ref(new Date(today))
const filterEmployee = ref('')
const showModal = ref(false)
const selectedShift = ref<any>(null)
const selectedDate = ref('')

// Week start (Sunday)
const weekStart = computed(() => {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
})

const weekEnd = computed(() => {
  const d = new Date(weekStart.value)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
})

const currentMonth = computed(() => new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1))

const monthStart = computed(() => new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1))
const monthEnd = computed(() => new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 0))

const startDate = computed(() => (view.value === 'week' ? weekStart.value : monthStart.value).toISOString().split('T')[0])
const endDate = computed(() => (view.value === 'week' ? weekEnd.value : monthEnd.value).toISOString().split('T')[0])

const viewLabel = computed(() => {
  if (view.value === 'week') {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${weekStart.value.toLocaleDateString('en-US', opts)} – ${weekEnd.value.toLocaleDateString('en-US', opts)}, ${weekStart.value.getFullYear()}`
  }
  return currentMonth.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const { data: shiftsData, refresh: refreshShifts } = await useFetch('/api/shifts', {
  query: computed(() => ({ startDate: startDate.value, endDate: endDate.value }))
})

const { data: employeesData } = await useFetch('/api/employees')
const employees = computed(() => (employeesData.value as any)?.employees || [])

const filteredShifts = computed(() => {
  const shifts = (shiftsData.value as any)?.shifts || []
  if (!filterEmployee.value) return shifts
  return shifts.filter((s: any) => s.employeeId?._id === filterEmployee.value || s.employeeId === filterEmployee.value)
})

function navigate(dir: number) {
  const d = new Date(currentDate.value)
  if (view.value === 'week') {
    d.setDate(d.getDate() + dir * 7)
  } else {
    d.setMonth(d.getMonth() + dir)
  }
  currentDate.value = d
}

function goToToday() {
  currentDate.value = new Date()
}

function openAddShift(date?: string) {
  selectedShift.value = null
  selectedDate.value = date || new Date().toISOString().split('T')[0]
  showModal.value = true
}

function openEditShift(shift: any) {
  selectedShift.value = shift
  selectedDate.value = ''
  showModal.value = true
}

function onShiftSaved() {
  showModal.value = false
  refreshShifts()
}

function onShiftDeleted() {
  showModal.value = false
  refreshShifts()
}

// Refresh when date range changes
watch([startDate, endDate], () => refreshShifts())
</script>
