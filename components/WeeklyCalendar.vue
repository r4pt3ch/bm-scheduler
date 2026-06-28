<template>
  <div class="card overflow-hidden">
    <!-- Header row: day names -->
    <div class="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
      <div class="py-3 px-2 text-xs font-medium text-gray-400 text-center border-r border-gray-200">Time</div>
      <div
        v-for="day in weekDays"
        :key="day.iso"
        class="py-3 px-2 text-center border-r border-gray-200 last:border-r-0"
      >
        <div class="text-xs font-medium text-gray-500 uppercase">{{ day.weekday }}</div>
        <div
          class="text-lg font-semibold mt-0.5 w-8 h-8 mx-auto flex items-center justify-center rounded-full"
          :style="day.isToday ? 'background:#D4AF37; color:#000; font-weight:700;' : ''"
          :class="day.isToday ? '' : 'text-gray-900'"
        >
          {{ day.dayNum }}
        </div>
      </div>
    </div>

    <!-- Shifts grid -->
    <div class="overflow-auto max-h-[600px]">
      <div class="grid grid-cols-8 min-h-[400px]">
        <!-- Time labels -->
        <div class="border-r border-gray-200">
          <div
            v-for="hour in displayHours"
            :key="hour"
            class="h-16 border-b border-gray-100 px-2 flex items-start pt-1"
          >
            <span class="text-xs text-gray-400 whitespace-nowrap">{{ formatHour(hour) }}</span>
          </div>
        </div>

        <!-- Day columns -->
        <div
          v-for="day in weekDays"
          :key="day.iso"
          class="border-r border-gray-200 last:border-r-0 relative"
          @click.self="isManager && $emit('addShift', day.iso)"
        >
          <div
            v-for="hour in displayHours"
            :key="hour"
            class="h-16 border-b border-gray-100 hover:bg-blue-50/30 cursor-pointer transition-colors"
            @click="isManager && $emit('addShift', day.iso)"
          />

          <!-- Shifts for this day -->
          <div class="absolute inset-0 pointer-events-none p-0.5 pt-0">
            <div
              v-for="shift in getShiftsForDay(day.iso)"
              :key="shift._id"
              class="absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 text-xs pointer-events-auto cursor-pointer hover:opacity-90 transition-opacity shadow-sm font-medium"
            :class="(shift.employeeId?.color || '#3b82f6') === '#D4AF37' ? 'text-black' : 'text-white'"
              :style="getShiftStyle(shift)"
              @click.stop="$emit('editShift', shift)"
            >
              <div class="font-semibold truncate">{{ getEmployeeName(shift) }}</div>
              <div class="opacity-90 truncate">{{ shift.startTime }}–{{ shift.endTime }}</div>
              <div v-if="shift.position" class="opacity-75 truncate text-[10px]">{{ shift.position }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  shifts: any[]
  weekStart: Date
  isManager: boolean
}>()

defineEmits<{
  addShift: [date: string]
  editShift: [shift: any]
}>()

const displayHours = Array.from({ length: 17 }, (_, i) => i + 6) // 6am to 10pm

const weekDays = computed(() => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(props.weekStart)
    d.setDate(d.getDate() + i)
    const today = new Date()
    return {
      iso: d.toISOString().split('T')[0],
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      isToday: d.toDateString() === today.toDateString()
    }
  })
})

function getShiftsForDay(iso: string) {
  return props.shifts.filter(s => {
    const d = new Date(s.date)
    return d.toISOString().split('T')[0] === iso
  })
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function getShiftStyle(shift: any) {
  const startMin = timeToMinutes(shift.startTime)
  const endMin = timeToMinutes(shift.endTime)
  const dayStartMin = 6 * 60 // 6am

  const top = ((startMin - dayStartMin) / 60) * 64 // 64px per hour (h-16)
  const height = Math.max(((endMin - startMin) / 60) * 64, 28)

  const color = shift.employeeId?.color || '#3b82f6'

  return {
    top: `${top}px`,
    height: `${height}px`,
    backgroundColor: color
  }
}

function getEmployeeName(shift: any) {
  return shift.employeeId?.name || 'Unknown'
}

function formatHour(hour: number) {
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}
</script>
