<template>
  <div>
    <header class="mb-8">
      <NuxtLink to="/employees" class="text-sm text-ink-400 hover:underline">← Back to directory</NuxtLink>
      <h1 class="font-display text-3xl text-ink-50 mt-2" v-if="employee">{{ employee.firstName }} {{ employee.lastName }}</h1>
    </header>

    <div v-if="pending" class="text-sm text-ink-400">Loading…</div>

    <UiCard v-else-if="error" class="max-w-md">
      <p class="text-sm text-rose-300">{{ error?.data?.statusMessage || 'This profile is not available to you.' }}</p>
      <NuxtLink to="/employees" class="text-sm text-ink-300 hover:underline mt-3 inline-block">← Back to directory</NuxtLink>
    </UiCard>

    <div v-else-if="employee" class="grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <UiCard>
          <h2 class="font-display text-lg text-ink-50 mb-4">Personal &amp; Employment Details</h2>
          <form class="space-y-4" @submit.prevent="handleSave">
            <div class="grid grid-cols-2 gap-4">
              <UiInput v-model="form.firstName" label="First name" required />
              <UiInput v-model="form.lastName" label="Last name" required />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <UiInput v-model="form.department" label="Department" />
              <UiInput v-model="form.position" label="Position" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <UiSelect
                v-model="form.employmentType"
                label="Employment type"
                :options="[
                  { value: 'regular', label: 'Regular' },
                  { value: 'probationary', label: 'Probationary' },
                  { value: 'contractual', label: 'Contractual' },
                  { value: 'project-based', label: 'Project-based' }
                ]"
              />
              <UiSelect
                v-model="form.status"
                label="Status"
                :options="[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'separated', label: 'Separated' }
                ]"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UiInput v-model="form.basicSalary" type="number" min="0" step="0.01" label="Monthly basic salary (₱)" required />
              <UiSelect
                v-model="form.payFrequency"
                label="Pay frequency"
                :options="[{ value: 'semi-monthly', label: 'Semi-monthly' }, { value: 'monthly', label: 'Monthly' }]"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <UiInput v-model="form.allowances.taxableAllowance" type="number" min="0" step="0.01" label="Taxable allowance (₱/month)" />
              <UiInput v-model="form.allowances.deMinimis" type="number" min="0" step="0.01" label="De minimis allowance (₱/month)" />
            </div>

            <p v-if="saveError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg">{{ saveError }}</p>
            <p v-if="saved" class="text-sm text-emerald-300 bg-emerald-400/10 px-3 py-2 rounded-lg">Changes saved.</p>

            <div class="flex justify-end">
              <UiButton type="submit" :loading="saving">Save Changes</UiButton>
            </div>
          </form>
        </UiCard>

        <UiCard>
          <h2 class="font-display text-lg text-ink-50 mb-4">Government IDs</h2>
          <div class="grid grid-cols-2 gap-4">
            <UiInput v-model="form.governmentIds.sssNumber" label="SSS Number" />
            <UiInput v-model="form.governmentIds.philhealthNumber" label="PhilHealth Number" />
            <UiInput v-model="form.governmentIds.pagibigNumber" label="Pag-IBIG Number" />
            <UiInput v-model="form.governmentIds.tin" label="TIN" />
          </div>
          <div class="flex justify-end mt-4">
            <UiButton :loading="saving" @click="handleSave">Save IDs</UiButton>
          </div>
        </UiCard>

        <UiCard>
          <h2 class="font-display text-lg text-ink-50 mb-1">Custom Deductions</h2>
          <p class="text-xs text-ink-400 mb-4">
            Extra deductions on top of statutory SSS/PhilHealth/Pag-IBIG/tax — e.g. loan repayments, cash advances, uniform fees.
            Percentage applies to monthly basic salary; fixed amount is a flat ₱ amount per month. Both apply together if both are set, and amounts are split across cutoffs the same way statutory contributions are.
          </p>

          <div v-if="form.customDeductions.length === 0" class="text-sm text-ink-400 mb-4">No custom deductions configured.</div>

          <div v-for="(item, idx) in form.customDeductions" :key="idx" class="border border-sand-200 rounded-lg p-4 mb-3">
            <div class="grid grid-cols-2 gap-3 mb-3">
              <UiInput v-model="item.label" label="Label" placeholder="e.g. Company Loan" />
              <div class="grid grid-cols-2 gap-3">
                <UiInput v-model="item.percentage" type="number" min="0" max="100" step="0.01" label="Percentage (%)" />
                <UiInput v-model="item.fixedAmount" type="number" min="0" step="0.01" label="Fixed amount (₱)" />
              </div>
            </div>
            <UiInput v-model="item.notes" label="Notes (optional)" placeholder="e.g. Loan ref #1234, 12 months remaining" />
            <div class="flex items-center justify-between mt-3">
              <label class="flex items-center gap-2 text-sm text-ink-100">
                <input v-model="item.active" type="checkbox" class="rounded border-sand-200 accent-brand-500" />
                Active (included in next payroll run)
              </label>
              <UiButton type="button" variant="ghost" size="sm" @click="removeDeduction(idx)">Remove</UiButton>
            </div>
            <p v-if="item.percentage > 0 || item.fixedAmount > 0" class="text-xs text-ink-500 mt-2">
              ≈ {{ currency.format(estimateMonthly(item)) }}/month
              ({{ currency.format(estimateMonthly(item) / (form.payFrequency === 'semi-monthly' ? 2 : 1)) }} per {{ form.payFrequency === 'semi-monthly' ? 'cutoff' : 'month' }})
            </p>
          </div>

          <UiButton type="button" variant="secondary" size="sm" @click="addDeduction">+ Add Deduction</UiButton>

          <p v-if="deductionsError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg mt-3">{{ deductionsError }}</p>
          <p v-if="deductionsSaved" class="text-sm text-emerald-300 bg-emerald-400/10 px-3 py-2 rounded-lg mt-3">Deductions saved.</p>

          <div class="flex justify-end mt-4">
            <UiButton :loading="savingDeductions" @click="handleSaveDeductions">Save Deductions</UiButton>
          </div>
        </UiCard>
      </div>

      <div class="space-y-6">
        <UiCard>
          <h3 class="font-display text-base text-ink-50 mb-3">Leave Balances</h3>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <UiInput v-model="leaveForm.vacation" type="number" min="0" step="0.5" label="Vacation (days)" />
            <UiInput v-model="leaveForm.sick" type="number" min="0" step="0.5" label="Sick (days)" />
          </div>
          <UiInput v-model="leaveForm.reason" label="Reason (optional, recorded in the audit trail)" placeholder="e.g. Annual leave reset, correction, prorated grant" />
          <p class="text-xs text-ink-500 mt-2">Approved leave requests automatically deduct from these balances — use this to correct, grant extra days, or reset for a new year.</p>

          <p v-if="leaveBalanceError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg mt-3">{{ leaveBalanceError }}</p>
          <p v-if="leaveBalanceSaved" class="text-sm text-emerald-300 bg-emerald-400/10 px-3 py-2 rounded-lg mt-3">Leave balance updated.</p>

          <div class="flex justify-end mt-4">
            <UiButton size="sm" :loading="savingLeaveBalance" @click="handleSaveLeaveBalance">Save Leave Balance</UiButton>
          </div>
        </UiCard>

        <UiCard>
          <h3 class="font-display text-base text-ink-50 mb-3">Account</h3>
          <p class="text-sm text-ink-300 mb-3">{{ employee.email }}</p>
          <UiSelect
            v-model="form.role"
            label="System role"
            :options="roleOptions"
          />
          <p v-if="isSelf && form.role !== 'admin' && form.role !== 'super_admin'" class="text-xs text-amber-300 mt-2">
            This is your own account — removing admin access will sign you out of admin features immediately.
          </p>
          <p v-if="isSelf && employee?.role === 'super_admin' && form.role !== 'super_admin'" class="text-xs text-rose-300 bg-rose-400/10 rounded-lg px-3 py-2 mt-2">
            ⚠ You are removing your own Super Admin access. You will immediately lose access to Audit Trail and Login Logs, and won't be able to grant Super Admin to anyone else afterward.
          </p>
          <p v-if="roleError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg mt-2">{{ roleError }}</p>
          <div class="flex justify-end mt-4">
            <UiButton size="sm" :loading="savingRole" @click="handleSaveRole">Save Role</UiButton>
          </div>
        </UiCard>

        <UiCard v-if="auth.isSuperAdmin">
          <h3 class="font-display text-base text-ink-50 mb-2">Reset Password</h3>
          <p class="text-xs text-ink-400 mb-3">
            Generates a new temporary password for this account and forces a password change on next login.
            Works for any role, including admin and super admin accounts. The old password stops working immediately.
          </p>

          <div v-if="tempPasswordResult" class="mb-3">
            <p class="text-xs text-ink-400 mb-1">Temporary password (shown once — copy it now):</p>
            <div class="flex items-center gap-2">
              <code class="flex-1 px-3 py-2 rounded-lg bg-ink-900/40 border border-sand-200 text-sm text-ink-50 tracking-wide">{{ tempPasswordResult }}</code>
              <UiButton type="button" variant="secondary" size="sm" @click="copyTempPassword">{{ copiedTempPassword ? 'Copied!' : 'Copy' }}</UiButton>
            </div>
            <p class="text-xs text-amber-300 mt-2">Share this with {{ employee.firstName }} through a secure channel. It won't be shown again.</p>
          </div>

          <p v-if="resetPasswordError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg mb-3">{{ resetPasswordError }}</p>

          <UiButton variant="danger" size="sm" :loading="resettingPassword" @click="handleResetPassword">Reset Password</UiButton>
        </UiCard>

        <UiCard>
          <h3 class="font-display text-base text-ink-50 mb-2">Separate Employee</h3>
          <p class="text-xs text-ink-400 mb-3">This marks the employee as separated, revokes their access, and moves them to the Archive. They're excluded from future payroll generation, but their existing payroll history is preserved.</p>
          <UiButton variant="danger" size="sm" @click="handleSeparate">Mark as Separated</UiButton>
        </UiCard>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default' })

const route = useRoute()
const id = route.params.id
const currency = useCurrency()

const { data, pending, error, refresh } = await useFetch(`/api/employees/${id}`)
const employee = computed(() => data.value?.employee)

const form = reactive({
  firstName: '', lastName: '', department: '', position: '',
  employmentType: 'regular', status: 'active',
  basicSalary: 0, payFrequency: 'semi-monthly',
  allowances: { taxableAllowance: 0, deMinimis: 0 },
  governmentIds: { sssNumber: '', philhealthNumber: '', pagibigNumber: '', tin: '' },
  role: 'employee',
  customDeductions: []
})

const leaveForm = reactive({ vacation: 0, sick: 0, reason: '' })

watch(employee, (e) => {
  if (!e) return
  form.firstName = e.firstName
  form.lastName = e.lastName
  form.department = e.department || ''
  form.position = e.position || ''
  form.employmentType = e.employmentType
  form.status = e.status
  form.basicSalary = e.basicSalary
  form.payFrequency = e.payFrequency
  form.allowances.taxableAllowance = e.allowances?.taxableAllowance || 0
  form.allowances.deMinimis = e.allowances?.deMinimis || 0
  form.governmentIds.sssNumber = e.governmentIds?.sssNumber || ''
  form.governmentIds.philhealthNumber = e.governmentIds?.philhealthNumber || ''
  form.governmentIds.pagibigNumber = e.governmentIds?.pagibigNumber || ''
  form.governmentIds.tin = e.governmentIds?.tin || ''
  form.role = e.role || 'employee'
  form.customDeductions = (e.customDeductions || []).map((d) => ({
    label: d.label || '',
    percentage: d.percentage || 0,
    fixedAmount: d.fixedAmount || 0,
    active: d.active !== false,
    notes: d.notes || ''
  }))
  leaveForm.vacation = e.leaveCredits?.vacation ?? 0
  leaveForm.sick = e.leaveCredits?.sick ?? 0
}, { immediate: true })

const saving = ref(false)
const saveError = ref('')
const saved = ref(false)

async function handleSave() {
  saving.value = true
  saveError.value = ''
  saved.value = false
  try {
    await $fetch(`/api/employees/${id}`, {
      method: 'PUT',
      body: { ...form, basicSalary: Number(form.basicSalary) }
    })
    saved.value = true
    await refresh()
    setTimeout(() => (saved.value = false), 2500)
  } catch (err) {
    saveError.value = err?.data?.statusMessage || 'Failed to save changes.'
  } finally {
    saving.value = false
  }
}

async function handleSeparate() {
  if (!confirm('Mark this employee as separated? They will lose system access and move to the Archive.')) return
  await $fetch(`/api/employees/${id}`, { method: 'DELETE' })
  await navigateTo('/employees/archive')
}

const resettingPassword = ref(false)
const resetPasswordError = ref('')
const tempPasswordResult = ref('')
const copiedTempPassword = ref(false)

async function handleResetPassword() {
  const confirmed = confirm(
    `Reset ${employee.value?.firstName}'s password? Their current password will stop working immediately, and they'll be required to set a new one on next login.`
  )
  if (!confirmed) return

  resettingPassword.value = true
  resetPasswordError.value = ''
  tempPasswordResult.value = ''
  copiedTempPassword.value = false
  try {
    const result = await $fetch(`/api/employees/${id}/reset-password`, { method: 'POST' })
    tempPasswordResult.value = result.tempPassword
  } catch (err) {
    resetPasswordError.value = err?.data?.statusMessage || 'Failed to reset password.'
  } finally {
    resettingPassword.value = false
  }
}

function copyTempPassword() {
  navigator.clipboard.writeText(tempPasswordResult.value)
  copiedTempPassword.value = true
  setTimeout(() => (copiedTempPassword.value = false), 2000)
}

const auth = useAuthStore()
const isSelf = computed(() => auth.user?.id === id)

// Only a super_admin can grant or revoke the super_admin role itself, so the
// option is only offered in this dropdown when the viewer is one — matching
// the same restriction enforced server-side.
const roleOptions = computed(() => {
  const options = [
    { value: 'employee', label: 'Employee — self-service access only' },
    { value: 'admin', label: 'Admin — full HR & payroll access' }
  ]
  if (auth.isSuperAdmin || employee.value?.role === 'super_admin') {
    options.push({ value: 'super_admin', label: 'Super Admin — full access + Audit Trail & Login Logs' })
  }
  return options
})
const savingRole = ref(false)
const roleError = ref('')

async function handleSaveRole() {
  const losingAdminAccess = isSelf.value && form.role === 'employee'
  const losingSuperAdminAccess = isSelf.value && employee.value?.role === 'super_admin' && form.role !== 'super_admin'

  if (losingSuperAdminAccess) {
    const confirmed = confirm(
      'You are removing your own Super Admin access. You will immediately lose access to Audit Trail and Login Logs, and will not be able to grant Super Admin to anyone else afterward. Continue?'
    )
    if (!confirmed) return
  } else if (losingAdminAccess) {
    const confirmed = confirm(
      'You are about to remove your own admin access. You will immediately lose access to admin-only pages like Employees and Reports. Continue?'
    )
    if (!confirmed) return
  }

  savingRole.value = true
  roleError.value = ''
  try {
    await $fetch(`/api/employees/${id}`, {
      method: 'PUT',
      body: { role: form.role }
    })
    await refresh()
    if (isSelf.value) {
      await auth.fetchMe()
      // Only redirect away if the new role drops below admin level entirely.
      // Moving between admin <-> super_admin keeps access to the current page.
      if (form.role === 'employee') {
        await navigateTo('/')
      }
    }
  } catch (err) {
    roleError.value = err?.data?.statusMessage || 'Failed to update role.'
    form.role = employee.value?.role || 'employee' // revert the dropdown since the change didn't take effect
  } finally {
    savingRole.value = false
  }
}

function addDeduction() {
  form.customDeductions.push({ label: '', percentage: 0, fixedAmount: 0, active: true, notes: '' })
}

function removeDeduction(idx) {
  form.customDeductions.splice(idx, 1)
}

function estimateMonthly(item) {
  const percentage = Number(item.percentage) || 0
  const fixedAmount = Number(item.fixedAmount) || 0
  return (Number(form.basicSalary) || 0) * (percentage / 100) + fixedAmount
}

const savingDeductions = ref(false)
const deductionsError = ref('')
const deductionsSaved = ref(false)

async function handleSaveDeductions() {
  const incomplete = form.customDeductions.some((d) => !d.label.trim())
  if (incomplete) {
    deductionsError.value = 'Every deduction needs a label.'
    return
  }

  savingDeductions.value = true
  deductionsError.value = ''
  deductionsSaved.value = false
  try {
    await $fetch(`/api/employees/${id}`, {
      method: 'PUT',
      body: {
        customDeductions: form.customDeductions.map((d) => ({
          label: d.label.trim(),
          percentage: Number(d.percentage) || 0,
          fixedAmount: Number(d.fixedAmount) || 0,
          active: !!d.active,
          notes: d.notes?.trim() || ''
        }))
      }
    })
    deductionsSaved.value = true
    await refresh()
    setTimeout(() => (deductionsSaved.value = false), 2500)
  } catch (err) {
    deductionsError.value = err?.data?.statusMessage || 'Failed to save deductions.'
  } finally {
    savingDeductions.value = false
  }
}

const savingLeaveBalance = ref(false)
const leaveBalanceError = ref('')
const leaveBalanceSaved = ref(false)

async function handleSaveLeaveBalance() {
  savingLeaveBalance.value = true
  leaveBalanceError.value = ''
  leaveBalanceSaved.value = false
  try {
    await $fetch(`/api/employees/${id}/leave-balance`, {
      method: 'PUT',
      body: {
        vacation: Number(leaveForm.vacation) || 0,
        sick: Number(leaveForm.sick) || 0,
        reason: leaveForm.reason.trim()
      }
    })
    leaveBalanceSaved.value = true
    leaveForm.reason = ''
    await refresh()
    setTimeout(() => (leaveBalanceSaved.value = false), 2500)
  } catch (err) {
    leaveBalanceError.value = err?.data?.statusMessage || 'Failed to update leave balance.'
  } finally {
    savingLeaveBalance.value = false
  }
}
</script>
