<template>
  <div class="card overflow-hidden">
    <!-- Day name headers -->
    <div class="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
      <div
        v-for="day in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']"
        :key="day"
        class="py-2 text-center text-xs font-medium text-gray-500 uppercase border-r border-gray-200 last:border-r-0"
      >
        {{ day }}
      </div>
    </div>

    <!-- Calendar grid -->
    <div class="grid grid-cols-7">
      <div
        v-for="(cell, idx) in calendarCells"
        :key="idx"
        class="min-h-[110px] border-b border-r border-gray-200 last-of-type:border-r-0 p-1.5 relative"
        :class="{
          'bg-gray-50/60': !cell.currentMonth,
          'bg-blue-50/30': cell.isToday
        }"
      >
        <!-- Day number -->
        <div class="flex items-center justify-between mb-1">
          <span
            class="text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full"
            :style="cell.isToday ? 'background:#D4AF37; color:#000; font-weight:700;' : ''"
          :class="{
              'text-gray-400': !cell.currentMonth,
              'text-gray-900': cell.currentMonth && !cell.isToday
            }"
          >
            {{ cell.day }}
          </span>
          <button
            v-if="isManager && cell.currentMonth"
            @click="$emit('addShift', cell.iso)"
            class="w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:bg-primary-100 hover:text-primary-600 transition-colors opacity-0 group-hover:opacity-100"
            title="Add shift"
          >+</button>
        </div>

        <!-- Shifts -->
        <div class="space-y-0.5">
          <div
            v-for="shift in getShiftsForDay(cell.iso).slice(0, 3)"
            :key="shift._id"
            class="text-white text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-90 transition-opacity"
            :style="{ backgroundColor: shift.employeeId?.color || '#3b82f6' }"
            @click="$emit('editShift', shift)"
            :title="`${shift.employeeId?.name}: ${shift.startTime}–${shift.endTime}`"
          >
            {{ shift.employeeId?.name?.split(' ')[0] }} {{ shift.startTime }}
          </div>
          <div
            v-if="getShiftsForDay(cell.iso).length > 3"
            class="text-xs text-gray-500 px-1"
          >
            +{{ getShiftsForDay(cell.iso).length - 3 }} more
          </div>
        </div>

        <!-- Add shift overlay for manager -->
        <button
          v-if="isManager && cell.currentMonth"
          @click="$emit('addShift', cell.iso)"
          class="absolute inset-0 w-full h-full opacity-0 hover:opacity-100 flex items-end justify-end p-1 transition-opacity"
          title="Add shift"
        >
          <span class="text-primary-600 text-lg leading-none">+</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  shifts: any[]
  currentMonth: Date
  isManager: boolean
}>()

defineEmits<{
  addShift: [date: string]
  editShift: [shift: any]
}>()

interface CalendarCell {
  day: number
  iso: string
  currentMonth: boolean
  isToday: boolean
}

const calendarCells = computed((): CalendarCell[] => {
  const year = props.currentMonth.getFullYear()
  const month = props.currentMonth.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const today = new Date()

  const cells: CalendarCell[] = []

  // Pad start with previous month days
  for (let i = 0; i < firstDay.getDay(); i++) {
    const d = new Date(year, month, -firstDay.getDay() + i + 1)
    cells.push({ day: d.getDate(), iso: d.toISOString().split('T')[0], currentMonth: false, isToday: false })
  }

  // Current month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d)
    cells.push({
      day: d,
      iso: date.toISOString().split('T')[0],
      currentMonth: true,
      isToday: date.toDateString() === today.toDateString()
    })
  }

  // Pad end
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i)
    cells.push({ day: d.getDate(), iso: d.toISOString().split('T')[0], currentMonth: false, isToday: false })
  }

  return cells
})

function getShiftsForDay(iso: string) {
  return props.shifts.filter(s => {
    const d = new Date(s.date)
    return d.toISOString().split('T')[0] === iso
  })
}
</script>
