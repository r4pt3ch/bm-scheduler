<template>
  <div>
    <header class="flex items-center justify-between mb-8 gap-4 flex-wrap">
      <div>
        <p class="text-xs uppercase tracking-[0.18em] text-ink-400 font-semibold">Employees</p>
        <h1 class="font-display text-3xl text-ink-50 mt-1">Employee Directory</h1>
      </div>
      <div class="flex gap-2">
        <UiButton variant="ghost" to="/employees/archive">View Archive →</UiButton>
        <UiButton @click="showCreate = true">+ Add Employee</UiButton>
      </div>
    </header>

    <UiCard class="mb-6" :padded="true">
      <div class="flex gap-3 flex-wrap">
        <input
          v-model="search"
          placeholder="Search by name, email, or employee no."
          class="focus-ring flex-1 min-w-[220px] rounded-lg border border-sand-200 bg-sand-100 text-ink-50 placeholder:text-ink-500/60 px-3.5 py-2.5 text-sm focus:border-brand-400"
        />
        <UiSelect v-model="statusFilter" :options="statusOptions" class="w-44" />
      </div>
    </UiCard>

    <UiCard :padded="false">
      <div v-if="pending" class="p-6 text-sm text-ink-400">Loading…</div>
      <div v-else-if="filtered.length === 0" class="p-6 text-sm text-ink-400">No employees match your search.</div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-sand-200">
            <th class="px-5 py-3">Name</th>
            <th class="px-5 py-3">Employee No.</th>
            <th class="px-5 py-3">Department</th>
            <th class="px-5 py-3">Basic Salary</th>
            <th class="px-5 py-3">Status</th>
            <th class="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-sand-200">
          <tr v-for="e in filtered" :key="e._id" class="hover:bg-sand-200">
            <td class="px-5 py-3">
              <p class="font-medium text-ink-50">{{ e.firstName }} {{ e.lastName }}</p>
              <p class="text-xs text-ink-400">{{ e.email }}</p>
            </td>
            <td class="px-5 py-3 text-ink-100">{{ e.employeeNumber }}</td>
            <td class="px-5 py-3 text-ink-100">{{ e.department || '—' }}</td>
            <td class="px-5 py-3 text-ink-100">{{ currency.format(e.basicSalary) }}</td>
            <td class="px-5 py-3">
              <UiBadge :tone="e.status === 'active' ? 'success' : 'neutral'">{{ e.status }}</UiBadge>
            </td>
            <td class="px-5 py-3 text-right">
              <NuxtLink :to="`/employees/${e._id}`" class="text-ink-300 hover:underline text-sm font-medium">Edit</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </UiCard>

    <!-- Create employee modal -->
    <div v-if="showCreate" class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-40" @click.self="showCreate = false">
      <div class="bg-sand-100 rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 class="font-display text-xl text-ink-50 mb-4">Add Employee</h2>
        <form class="space-y-4" @submit.prevent="handleCreate">
          <div class="grid grid-cols-2 gap-4">
            <UiInput v-model="form.firstName" label="First name" required />
            <UiInput v-model="form.lastName" label="Last name" required />
          </div>
          <UiInput v-model="form.email" type="email" label="Email" required />
          <UiInput v-model="form.dateHired" type="date" label="Date hired" required />
          <div class="grid grid-cols-2 gap-4">
            <UiInput v-model="form.department" label="Department" />
            <UiInput v-model="form.position" label="Position" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <UiInput v-model="form.basicSalary" type="number" min="0" step="0.01" label="Monthly basic salary (₱)" required />
            <UiSelect
              v-model="form.payFrequency"
              label="Pay frequency"
              :options="[{ value: 'semi-monthly', label: 'Semi-monthly' }, { value: 'monthly', label: 'Monthly' }]"
            />
          </div>
          <UiSelect
            v-model="form.role"
            label="System role"
            :options="[
              { value: 'employee', label: 'Employee — self-service access only' },
              { value: 'admin', label: 'Admin — full HR & payroll access' }
            ]"
          />

          <p v-if="createError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg">{{ createError }}</p>
          <p v-if="tempPasswordMsg" class="text-sm text-emerald-300 bg-emerald-400/10 px-3 py-2 rounded-lg">{{ tempPasswordMsg }}</p>

          <div class="flex gap-3 justify-end pt-2">
            <UiButton type="button" variant="ghost" @click="showCreate = false">Cancel</UiButton>
            <UiButton type="submit" :loading="creating">Create Employee</UiButton>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default' })

const currency = useCurrency()
const search = ref('')
const statusFilter = ref('')
const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
]

const { data, pending, refresh } = await useFetch('/api/employees', { query: { status: 'active,inactive' } })

const filtered = computed(() => {
  let list = data.value?.employees || []
  if (statusFilter.value) list = list.filter((e) => e.status === statusFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(
      (e) =>
        e.firstName.toLowerCase().includes(q) ||
        e.lastName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.employeeNumber.toLowerCase().includes(q)
    )
  }
  return list
})

const showCreate = ref(false)
const creating = ref(false)
const createError = ref('')
const tempPasswordMsg = ref('')
const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  dateHired: '',
  department: '',
  position: '',
  basicSalary: '',
  payFrequency: 'semi-monthly',
  role: 'employee'
})

async function handleCreate() {
  creating.value = true
  createError.value = ''
  tempPasswordMsg.value = ''
  try {
    const res = await $fetch('/api/employees', {
      method: 'POST',
      body: { ...form, basicSalary: Number(form.basicSalary) }
    })
    tempPasswordMsg.value = `Employee ${res.employee.employeeNumber} created. Temporary password: ${res.tempPassword} — share this securely.`
    await refresh()
    Object.assign(form, {
      firstName: '', lastName: '', email: '', dateHired: '',
      department: '', position: '', basicSalary: '', payFrequency: 'semi-monthly', role: 'employee'
    })
  } catch (err) {
    createError.value = err?.data?.statusMessage || 'Failed to create employee.'
  } finally {
    creating.value = false
  }
}
</script>
