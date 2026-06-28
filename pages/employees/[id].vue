<template>
  <div class="min-h-screen bg-gray-50">
    <NavBar />
    <main class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex items-center gap-3 mb-6">
        <NuxtLink to="/employees" class="text-gray-400 hover:text-gray-600 transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </NuxtLink>
        <h1 class="text-2xl font-bold text-gray-900">Edit Employee</h1>
      </div>

      <div v-if="pending" class="text-center py-12 text-gray-400">Loading...</div>

      <div v-else-if="employee" class="space-y-6">
        <!-- Avatar & header -->
        <div class="card p-6 flex items-center gap-5">
          <div
            class="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
            :style="{ backgroundColor: form.color }"
          >
            {{ employee.name.charAt(0) }}
          </div>
          <div>
            <h2 class="text-xl font-semibold text-gray-900">{{ employee.name }}</h2>
            <p class="text-gray-500">{{ employee.email }}</p>
            <span class="badge mt-1" :style="employee.role === 'manager' ? 'background:rgba(212,175,55,0.15); color:#92700a;' : 'background:#eff6ff; color:#1d4ed8;'">
              {{ employee.role }}
            </span>
          </div>
        </div>

        <form @submit.prevent="handleSave" class="space-y-6">
          <!-- Basic info -->
          <div class="card p-6">
            <h3 class="text-base font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input v-model="form.name" type="text" class="input" required />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input v-model="form.phone" type="tel" class="input" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select v-model="form.role" class="input">
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <input v-model="form.position" type="text" class="input" placeholder="e.g. Cashier" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input v-model="form.department" type="text" class="input" placeholder="e.g. Sales" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                <input v-model.number="form.hourlyRate" type="number" step="0.01" min="0" class="input" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div class="flex items-center gap-2">
                  <input v-model="form.color" type="color" class="h-9 w-16 rounded border border-gray-300 cursor-pointer" />
                  <span class="text-sm text-gray-500">Calendar display color</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Availability -->
          <div class="card p-6">
            <h3 class="text-base font-semibold text-gray-900 mb-4">Availability</h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label
                v-for="(_, day) in form.availability"
                :key="day"
                class="flex items-center gap-2 cursor-pointer"
              >
                <input type="checkbox" v-model="(form.availability as any)[day]" class="w-4 h-4 rounded text-primary-600" />
                <span class="text-sm text-gray-700 capitalize">{{ day }}</span>
              </label>
            </div>
          </div>

          <!-- Password change -->
          <div class="card p-6">
            <h3 class="text-base font-semibold text-gray-900 mb-4">Change Password</h3>
            <div class="max-w-sm">
              <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input v-model="newPassword" type="password" class="input" placeholder="Leave blank to keep current" minlength="6" />
              <p class="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
            </div>
          </div>

          <div v-if="saveError" class="text-sm text-red-600 bg-red-50 rounded-lg p-3">{{ saveError }}</div>

          <div class="flex gap-3">
            <NuxtLink to="/employees" class="btn btn-secondary flex-1 text-center">Cancel</NuxtLink>
            <button type="submit" class="btn btn-primary flex-1" :disabled="saving">
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { isManager } = useAuth()
if (!isManager.value) await navigateTo('/dashboard')

const route = useRoute()
const { success, error: toastError } = useToast()
const saving = ref(false)
const saveError = ref('')
const newPassword = ref('')

const { data, pending } = await useFetch<{ employee: any }>(`/api/employees/${route.params.id}`)
const employee = computed(() => data.value?.employee)

const form = reactive({
  name: '',
  phone: '',
  role: 'employee',
  position: '',
  department: '',
  hourlyRate: 0,
  color: '#3b82f6',
  availability: {
    monday: true, tuesday: true, wednesday: true, thursday: true,
    friday: true, saturday: false, sunday: false
  }
})

watch(employee, (emp) => {
  if (emp) {
    Object.assign(form, {
      name: emp.name,
      phone: emp.phone || '',
      role: emp.role,
      position: emp.position || '',
      department: emp.department || '',
      hourlyRate: emp.hourlyRate || 0,
      color: emp.color || '#3b82f6',
      availability: { ...emp.availability }
    })
  }
}, { immediate: true })

async function handleSave() {
  saving.value = true
  saveError.value = ''
  try {
    const body: Record<string, unknown> = { ...form }
    if (newPassword.value && newPassword.value.length >= 6) {
      body.password = newPassword.value
    }
    await $fetch(`/api/employees/${route.params.id}`, { method: 'PUT', body })
    success('Employee updated successfully!')
    newPassword.value = ''
  } catch (err: any) {
    saveError.value = err?.data?.message || 'Failed to save changes'
  } finally {
    saving.value = false
  }
}
</script>
