<template>
  <div>
    <header class="flex items-center justify-between mb-8 flex-wrap gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.18em] text-ink-400 font-semibold">Leaves</p>
        <h1 class="font-display text-3xl text-ink-50 mt-1">{{ auth.isAdmin ? 'Leave Requests' : 'My Leaves' }}</h1>
      </div>
      <UiButton v-if="!auth.isAdmin" @click="showRequest = true">+ Request Leave</UiButton>
    </header>

    <UiCard :padded="false">
      <div v-if="!leaves.length" class="p-6 text-sm text-ink-400">No leave requests found.</div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-sand-200">
            <th v-if="auth.isAdmin" class="px-4 py-3">Employee</th>
            <th class="px-4 py-3">Type</th>
            <th class="px-4 py-3">Dates</th>
            <th class="px-4 py-3">Days</th>
            <th class="px-4 py-3">Status</th>
            <th v-if="auth.isAdmin" class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-sand-200">
          <tr v-for="l in leaves" :key="l._id">
            <td v-if="auth.isAdmin" class="px-4 py-3 text-ink-100 font-medium">
              {{ l.employee?.firstName }} {{ l.employee?.lastName }}
            </td>
            <td class="px-4 py-3 capitalize text-ink-100">{{ l.type }}</td>
            <td class="px-4 py-3 text-ink-300">{{ formatDate(l.startDate) }} – {{ formatDate(l.endDate) }}</td>
            <td class="px-4 py-3 text-ink-300">{{ l.days }}</td>
            <td class="px-4 py-3"><UiBadge :tone="badgeTone(l.status)">{{ l.status }}</UiBadge></td>
            <td v-if="auth.isAdmin" class="px-4 py-3 text-right">
              <div v-if="l.status === 'pending'" class="flex gap-2 justify-end">
                <UiButton size="sm" variant="secondary" @click="review(l._id, 'approve')">Approve</UiButton>
                <UiButton size="sm" variant="ghost" @click="review(l._id, 'reject')">Reject</UiButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </UiCard>

    <div v-if="showRequest" class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-40" @click.self="showRequest = false">
      <div class="bg-sand-100 rounded-xl max-w-md w-full p-6">
        <h2 class="font-display text-xl text-ink-50 mb-4">Request Leave</h2>
        <form class="space-y-4" @submit.prevent="submitRequest">
          <UiSelect
            v-model="form.type"
            label="Leave type"
            :options="[
              { value: 'vacation', label: 'Vacation Leave' },
              { value: 'sick', label: 'Sick Leave' },
              { value: 'unpaid', label: 'Unpaid Leave' },
              { value: 'other', label: 'Other' }
            ]"
          />
          <div class="grid grid-cols-2 gap-4">
            <UiInput v-model="form.startDate" type="date" label="Start date" required />
            <UiInput v-model="form.endDate" type="date" label="End date" required />
          </div>
          <UiInput v-model="form.reason" label="Reason (optional)" />

          <p v-if="requestError" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg">{{ requestError }}</p>

          <div class="flex gap-3 justify-end pt-2">
            <UiButton type="button" variant="ghost" @click="showRequest = false">Cancel</UiButton>
            <UiButton type="submit" :loading="submitting">Submit Request</UiButton>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default' })
const auth = useAuthStore()

const { data, refresh } = await useFetch('/api/leaves')
const leaves = computed(() => data.value?.leaves || [])

const showRequest = ref(false)
const submitting = ref(false)
const requestError = ref('')
const form = reactive({ type: 'vacation', startDate: '', endDate: '', reason: '' })

async function submitRequest() {
  submitting.value = true
  requestError.value = ''
  try {
    await $fetch('/api/leaves', { method: 'POST', body: form })
    showRequest.value = false
    Object.assign(form, { type: 'vacation', startDate: '', endDate: '', reason: '' })
    await refresh()
  } catch (err) {
    requestError.value = err?.data?.statusMessage || 'Failed to submit request.'
  } finally {
    submitting.value = false
  }
}

async function review(id, action) {
  await $fetch(`/api/leaves/${id}`, { method: 'PATCH', body: { action } })
  await refresh()
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function badgeTone(status) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'pending') return 'warning'
  return 'neutral'
}
</script>
