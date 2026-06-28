<template>
  <div class="min-h-screen bg-gray-50">
    <NavBar />
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Employees</h1>
          <p class="text-gray-500 text-sm mt-0.5">{{ employees.length }} active staff members</p>
        </div>
        <button @click="showModal = true" class="btn btn-primary">
          <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Employee
        </button>
      </div>

      <!-- Search -->
      <div class="mb-4">
        <input
          v-model="search"
          type="text"
          placeholder="Search by name, email, or position..."
          class="input max-w-sm"
        />
      </div>

      <!-- Grid -->
      <div v-if="pending" class="text-center py-12 text-gray-400">Loading...</div>

      <div v-else-if="!filteredEmployees.length" class="card p-12 text-center">
        <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p class="text-gray-500 font-medium">No employees found</p>
        <p v-if="search" class="text-gray-400 text-sm mt-1">Try a different search term</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="emp in filteredEmployees"
          :key="emp._id"
          class="card p-5 hover:shadow-md transition-shadow"
        >
          <div class="flex items-start gap-4">
            <div
              class="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              :style="{ backgroundColor: emp.color }"
            >
              {{ emp.name.charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h3 class="font-semibold text-gray-900 truncate">{{ emp.name }}</h3>
                  <p class="text-sm text-gray-500 truncate">{{ emp.email }}</p>
                </div>
                <span
                  class="badge text-xs flex-shrink-0"
                  :style="emp.role === 'manager' ? 'background:rgba(212,175,55,0.15); color:#92700a; border:1px solid rgba(212,175,55,0.3);' : 'background:#eff6ff; color:#1d4ed8;'"
                >
                  {{ emp.role }}
                </span>
              </div>

              <div class="mt-2 space-y-1">
                <div v-if="emp.position" class="flex items-center gap-1.5 text-sm text-gray-600">
                  <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {{ emp.position }}
                </div>
                <div v-if="emp.department" class="flex items-center gap-1.5 text-sm text-gray-600">
                  <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {{ emp.department }}
                </div>
                <div v-if="emp.phone" class="flex items-center gap-1.5 text-sm text-gray-600">
                  <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {{ emp.phone }}
                </div>
              </div>

              <!-- Availability -->
              <div class="mt-3 flex gap-1">
                <span
                  v-for="(avail, day) in emp.availability"
                  :key="day"
                  class="text-[10px] font-medium px-1 py-0.5 rounded"
                  :class="avail ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'"
                  :title="day"
                >
                  {{ String(day).charAt(0).toUpperCase() }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            <NuxtLink :to="`/employees/${emp._id}`" class="btn btn-secondary btn-sm flex-1 text-center">
              Edit
            </NuxtLink>
            <button @click="handleDeactivate(emp)" class="btn btn-sm text-red-600 hover:bg-red-50 border border-red-200">
              Remove
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Add Employee Modal -->
    <Teleport to="body" v-if="showModal">
      <div class="fixed inset-0 z-50 overflow-y-auto" @click.self="showModal = false">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="showModal = false" />
          <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-lg font-semibold">Add Employee</h2>
              <button @click="showModal = false" class="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form @submit.prevent="handleAddEmployee" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input v-model="newEmp.name" type="text" class="input" required placeholder="Jane Smith" />
                </div>
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input v-model="newEmp.email" type="email" class="input" required placeholder="jane@company.com" />
                </div>
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input v-model="newEmp.password" type="password" class="input" required placeholder="Min. 6 characters" minlength="6" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select v-model="newEmp.role" class="input">
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                  <input v-model.number="newEmp.hourlyRate" type="number" step="0.01" min="0" class="input" placeholder="0.00" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input v-model="newEmp.position" type="text" class="input" placeholder="e.g. Cashier" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input v-model="newEmp.department" type="text" class="input" placeholder="e.g. Sales" />
                </div>
                <div class="col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input v-model="newEmp.phone" type="tel" class="input" placeholder="+1 (555) 000-0000" />
                </div>
              </div>

              <div v-if="addError" class="text-sm text-red-600 bg-red-50 rounded-lg p-3">{{ addError }}</div>

              <div class="flex gap-3 pt-2">
                <button type="button" @click="showModal = false" class="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" class="btn btn-primary flex-1" :disabled="addLoading">
                  {{ addLoading ? 'Adding...' : 'Add Employee' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { isManager } = useAuth()
if (!isManager.value) await navigateTo('/dashboard')

const { success, error: toastError } = useToast()
const search = ref('')
const showModal = ref(false)
const addLoading = ref(false)
const addError = ref('')

const newEmp = reactive({
  name: '', email: '', password: '', role: 'employee',
  position: '', department: '', phone: '', hourlyRate: 0
})

const { data, pending, refresh } = await useFetch('/api/employees')
const employees = computed(() => (data.value as any)?.employees || [])

const filteredEmployees = computed(() => {
  if (!search.value) return employees.value
  const q = search.value.toLowerCase()
  return employees.value.filter((e: any) =>
    e.name.toLowerCase().includes(q) ||
    e.email.toLowerCase().includes(q) ||
    (e.position || '').toLowerCase().includes(q) ||
    (e.department || '').toLowerCase().includes(q)
  )
})

async function handleAddEmployee() {
  addLoading.value = true
  addError.value = ''
  try {
    await $fetch('/api/employees', { method: 'POST', body: newEmp })
    success(`${newEmp.name} added successfully!`)
    showModal.value = false
    Object.assign(newEmp, { name: '', email: '', password: '', role: 'employee', position: '', department: '', phone: '', hourlyRate: 0 })
    refresh()
  } catch (err: any) {
    addError.value = err?.data?.message || 'Failed to add employee'
  } finally {
    addLoading.value = false
  }
}

async function handleDeactivate(emp: any) {
  if (!confirm(`Remove ${emp.name} from the system?`)) return
  try {
    await $fetch(`/api/employees/${emp._id}`, { method: 'DELETE' })
    success(`${emp.name} removed`)
    refresh()
  } catch {
    toastError('Failed to remove employee')
  }
}
</script>
