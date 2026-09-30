<template>
  <div class="max-w-2xl">
    <header class="mb-8">
      <p class="text-xs uppercase tracking-[0.18em] text-ink-400 font-semibold">Account</p>
      <h1 class="font-display text-3xl text-ink-50 mt-1">My Profile</h1>
    </header>

    <div v-if="firstLogin" class="mb-6 bg-amber-400/10 border border-amber-400/30 text-amber-300 text-sm rounded-lg px-4 py-3">
      Welcome! For security, please set a new password before continuing.
    </div>

    <UiCard class="mb-6" v-if="employee">
      <h2 class="font-display text-lg text-ink-50 mb-4">Details</h2>
      <div class="grid sm:grid-cols-2 gap-4 text-sm">
        <div><p class="text-ink-500 text-xs uppercase">Name</p><p class="text-ink-50 mt-0.5">{{ employee.firstName }} {{ employee.lastName }}</p></div>
        <div><p class="text-ink-500 text-xs uppercase">Employee No.</p><p class="text-ink-50 mt-0.5">{{ employee.employeeNumber }}</p></div>
        <div><p class="text-ink-500 text-xs uppercase">Department</p><p class="text-ink-50 mt-0.5">{{ employee.department || '—' }}</p></div>
        <div><p class="text-ink-500 text-xs uppercase">Position</p><p class="text-ink-50 mt-0.5">{{ employee.position || '—' }}</p></div>
        <div><p class="text-ink-500 text-xs uppercase">Email</p><p class="text-ink-50 mt-0.5">{{ employee.email }}</p></div>
      </div>

      <h3 class="font-display text-base text-ink-50 mt-6 mb-3">Contact</h3>
      <form class="space-y-4" @submit.prevent="saveContact">
        <UiInput v-model="contactForm.phone" label="Phone number" />
        <UiInput v-model="contactForm.address" label="Address" />
        <div class="grid grid-cols-2 gap-4">
          <UiInput v-model="contactForm.bankAccount.bankName" label="Bank name" />
          <UiInput v-model="contactForm.bankAccount.accountNumber" label="Account number" />
        </div>
        <div class="flex justify-end">
          <UiButton type="submit" size="sm" :loading="savingContact">Save</UiButton>
        </div>
      </form>
    </UiCard>

    <UiCard>
      <h2 class="font-display text-lg text-ink-50 mb-4">Change Password</h2>
      <form class="space-y-4" @submit.prevent="handleChangePassword">
        <UiInput v-if="!firstLogin" v-model="currentPassword" type="password" label="Current password" required />
        <UiInput v-model="newPassword" type="password" label="New password" hint="At least 8 characters" required />
        <UiInput v-model="confirmPassword" type="password" label="Confirm new password" required />

        <p v-if="pwError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg">{{ pwError }}</p>
        <p v-if="pwSuccess" class="text-sm text-emerald-300 bg-emerald-400/10 px-3 py-2 rounded-lg">Password updated.</p>

        <UiButton type="submit" :loading="changingPassword">Update Password</UiButton>
      </form>
    </UiCard>
    <UiCard class="mt-6" v-if="auth.user?.role !== 'super_admin'">
      <h2 class="font-display text-lg text-ink-50 mb-1">DTR Kiosk PIN</h2>
      <p class="text-xs text-ink-400 mb-4">Set a short numeric PIN you'll use to identify yourself at the Time Clock kiosk. Choose something you can remember quickly (4–8 digits).</p>
      <form class="space-y-4" @submit.prevent="handleSetPin">
        <UiInput v-model="newPin" type="text" inputmode="numeric" autocomplete="off" maxlength="8" label="New PIN (4–8 digits)" placeholder="e.g. 1234" hint="Digits only, 4 to 8 characters" />
        <UiInput v-model="confirmPin" type="text" inputmode="numeric" autocomplete="off" maxlength="8" label="Confirm PIN" />

        <p v-if="pinError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg">{{ pinError }}</p>
        <p v-if="pinSuccess" class="text-sm text-emerald-300 bg-emerald-400/10 px-3 py-2 rounded-lg">PIN set — you can now use the kiosk.</p>

        <UiButton type="submit" size="sm" :loading="settingPin">Set PIN</UiButton>
      </form>
    </UiCard>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default' })

const route = useRoute()
const auth = useAuthStore()
const firstLogin = computed(() => route.query.firstLogin === '1')

const { data } = await useFetch(`/api/employees/${auth.user.id}`)
const employee = computed(() => data.value?.employee)

const contactForm = reactive({ phone: '', address: '', bankAccount: { bankName: '', accountNumber: '' } })
watch(employee, (e) => {
  if (!e) return
  contactForm.phone = e.phone || ''
  contactForm.address = e.address || ''
  contactForm.bankAccount.bankName = e.bankAccount?.bankName || ''
  contactForm.bankAccount.accountNumber = e.bankAccount?.accountNumber || ''
}, { immediate: true })

const savingContact = ref(false)
async function saveContact() {
  savingContact.value = true
  try {
    await $fetch(`/api/employees/${auth.user.id}`, { method: 'PUT', body: contactForm })
  } finally {
    savingContact.value = false
  }
}

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const pwError = ref('')
const pwSuccess = ref(false)
const changingPassword = ref(false)

async function handleChangePassword() {
  pwError.value = ''
  pwSuccess.value = false
  if (newPassword.value !== confirmPassword.value) {
    pwError.value = 'Passwords do not match.'
    return
  }
  changingPassword.value = true
  try {
    await $fetch('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword: currentPassword.value, newPassword: newPassword.value }
    })
    pwSuccess.value = true
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    if (firstLogin.value) {
      setTimeout(() => navigateTo('/'), 1200)
    }
  } catch (err) {
    pwError.value = err?.data?.statusMessage || 'Failed to update password.'
  } finally {
    changingPassword.value = false
  }
}

const newPin = ref('')
const confirmPin = ref('')
const pinError = ref('')
const pinSuccess = ref(false)
const settingPin = ref(false)

async function handleSetPin() {
  pinError.value = ''
  pinSuccess.value = false
  if (!/^\d{4,8}$/.test(newPin.value)) {
    pinError.value = 'PIN must be 4 to 8 digits.'
    return
  }
  if (newPin.value !== confirmPin.value) {
    pinError.value = 'PINs do not match.'
    return
  }
  settingPin.value = true
  try {
    await $fetch('/api/dtr/set-pin', { method: 'POST', body: { pin: newPin.value } })
    pinSuccess.value = true
    newPin.value = ''
    confirmPin.value = ''
    setTimeout(() => (pinSuccess.value = false), 3000)
  } catch (err) {
    pinError.value = err?.data?.statusMessage || 'Failed to set PIN.'
  } finally {
    settingPin.value = false
  }
}
</script>
