<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 overflow-y-auto" @click.self="$emit('close')">
      <div class="flex min-h-full items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('close')" />
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-semibold text-gray-900">
              {{ shift ? 'Edit Shift' : 'Add Shift' }}
            </h2>
            <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
              <select v-model="form.employeeId" class="input" required>
                <option value="">Select employee</option>
                <option v-for="emp in employees" :key="emp._id" :value="emp._id">
                  {{ emp.name }} {{ emp.position ? `(${emp.position})` : '' }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input v-model="form.date" type="date" class="input" required />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                <input v-model="form.startTime" type="time" class="input" required />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                <input v-model="form.endTime" type="time" class="input" required />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <input v-model="form.position" type="text" class="input" placeholder="e.g. Cashier, Server..." />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input v-model="form.department" type="text" class="input" placeholder="e.g. Front of House..." />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea v-model="form.notes" class="input resize-none" rows="2" placeholder="Optional notes..." />
            </div>

            <div v-if="shift">
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select v-model="form.status" class="input">
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div v-if="error" class="text-sm text-red-600 bg-red-50 rounded-lg p-3">{{ error }}</div>

            <div class="flex gap-3 pt-2">
              <button type="button" @click="$emit('close')" class="btn btn-secondary flex-1">Cancel</button>
              <button type="submit" class="btn btn-primary flex-1" :disabled="loading">
                {{ loading ? 'Saving...' : shift ? 'Update' : 'Add Shift' }}
              </button>
            </div>

            <div v-if="shift" class="pt-2 border-t border-gray-100">
              <button
                type="button"
                @click="handleDelete"
                class="btn btn-danger btn-sm w-full"
                :disabled="loading"
              >
                Delete Shift
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  shift?: any
  defaultDate?: string
  employees: any[]
}>()

const emit = defineEmits<{
  close: []
  saved: [shift: any]
  deleted: [id: string]
}>()

const { error: toastError, success } = useToast()
const loading = ref(false)
const error = ref('')

const form = reactive({
  employeeId: props.shift?.employeeId?._id || props.shift?.employeeId || '',
  date: props.shift?.date ? new Date(props.shift.date).toISOString().split('T')[0] : (props.defaultDate || ''),
  startTime: props.shift?.startTime || '09:00',
  endTime: props.shift?.endTime || '17:00',
  position: props.shift?.position || '',
  department: props.shift?.department || '',
  notes: props.shift?.notes || '',
  status: props.shift?.status || 'scheduled'
})

async function handleSubmit() {
  loading.value = true
  error.value = ''
  try {
    let result
    if (props.shift) {
      result = await $fetch<{ shift: any }>(`/api/shifts/${props.shift._id}`, {
        method: 'PUT',
        body: form
      })
    } else {
      result = await $fetch<{ shift: any }>('/api/shifts', {
        method: 'POST',
        body: form
      })
    }
    success(props.shift ? 'Shift updated!' : 'Shift added!')
    emit('saved', result.shift)
  } catch (err: any) {
    error.value = err?.data?.message || 'Failed to save shift'
  } finally {
    loading.value = false
  }
}

async function handleDelete() {
  if (!confirm('Delete this shift?')) return
  loading.value = true
  try {
    await $fetch(`/api/shifts/${props.shift._id}`, { method: 'DELETE' })
    success('Shift deleted')
    emit('deleted', props.shift._id)
  } catch (err: any) {
    toastError(err?.data?.message || 'Failed to delete shift')
  } finally {
    loading.value = false
  }
}
</script>
