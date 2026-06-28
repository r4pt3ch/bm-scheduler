<template>
  <div class="min-h-screen bg-gray-50">
    <NavBar />
    <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Time Off</h1>
          <p class="text-gray-500 text-sm mt-0.5">
            {{ isManager ? 'Manage employee time off requests' : 'Request and track your time off' }}
          </p>
        </div>
        <button @click="showRequestModal = true" class="btn btn-primary">
          <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Request Time Off
        </button>
      </div>

      <!-- Status filter tabs -->
      <div class="flex gap-2 mb-6 border-b border-gray-200">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          @click="statusFilter = tab.value"
          class="pb-3 px-1 text-sm font-medium transition-colors border-b-2 -mb-px"
          :style="statusFilter === tab.value ? 'border-color:#D4AF37; color:#92700a;' : ''"
          :class="statusFilter === tab.value
            ? ''
            : 'border-transparent text-gray-500 hover:text-gray-700'"
        >
          {{ tab.label }}
          <span v-if="getCounts(tab.value) > 0" class="ml-1.5 bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 text-xs">
            {{ getCounts(tab.value) }}
          </span>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="pending" class="text-center py-12 text-gray-400">Loading...</div>

      <!-- Empty state -->
      <div v-else-if="!filteredRequests.length" class="card p-12 text-center">
        <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p class="text-gray-500 font-medium">No {{ statusFilter }} requests</p>
      </div>

      <!-- Requests list -->
      <div v-else class="space-y-3">
        <div
          v-for="req in filteredRequests"
          :key="req._id"
          class="card p-5"
        >
          <div class="flex flex-col sm:flex-row sm:items-start gap-4">
            <!-- Employee info (manager view) -->
            <div v-if="isManager" class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                :style="{ backgroundColor: req.employeeId?.color || '#3b82f6' }"
              >
                {{ (req.employeeId?.name || 'U').charAt(0) }}
              </div>
              <div class="sm:w-32 flex-shrink-0">
                <p class="font-medium text-gray-900 text-sm">{{ req.employeeId?.name }}</p>
                <p class="text-xs text-gray-500">{{ req.employeeId?.position || req.employeeId?.department }}</p>
              </div>
            </div>

            <!-- Request details -->
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <span
                  class="badge"
                  :class="{
                    'bg-blue-100 text-blue-700': req.type === 'vacation',
                    'bg-red-100 text-red-700': req.type === 'sick',
                    'bg-purple-100 text-purple-700': req.type === 'personal',
                    'bg-gray-100 text-gray-700': req.type === 'other'
                  }"
                >
                  {{ req.type.charAt(0).toUpperCase() + req.type.slice(1) }}
                </span>
                <span
                  class="badge"
                  :class="{
                    'bg-amber-100 text-amber-700': req.status === 'pending',
                    'bg-green-100 text-green-700': req.status === 'approved',
                    'bg-red-100 text-red-700': req.status === 'denied'
                  }"
                >
                  {{ req.status.charAt(0).toUpperCase() + req.status.slice(1) }}
                </span>
              </div>

              <p class="font-semibold text-gray-900">
                {{ formatDate(req.startDate) }}
                <span v-if="req.startDate !== req.endDate"> – {{ formatDate(req.endDate) }}</span>
                <span class="text-gray-500 font-normal text-sm ml-1">({{ getDays(req.startDate, req.endDate) }} day{{ getDays(req.startDate, req.endDate) !== 1 ? 's' : '' }})</span>
              </p>

              <p v-if="req.reason" class="text-sm text-gray-500 mt-1 italic">"{{ req.reason }}"</p>

              <div v-if="req.reviewedBy || req.reviewNote" class="mt-2 text-xs text-gray-400">
                <span v-if="req.reviewedBy">Reviewed by {{ req.reviewedBy?.name }}</span>
                <span v-if="req.reviewNote"> · "{{ req.reviewNote }}"</span>
              </div>

              <p class="text-xs text-gray-400 mt-1">Submitted {{ formatRelative(req.createdAt) }}</p>
            </div>

            <!-- Manager actions -->
            <div v-if="isManager && req.status === 'pending'" class="flex gap-2 flex-shrink-0">
              <button @click="handleReview(req, 'approved')" class="btn btn-sm" style="background:#D4AF37; color:#000; font-weight:600;">
                Approve
              </button>
              <button @click="openDenyModal(req)" class="btn btn-sm btn-danger">
                Deny
              </button>
            </div>

            <!-- Employee delete for pending -->
            <div v-else-if="!isManager && req.status === 'pending'" class="flex-shrink-0">
              <button @click="handleDelete(req)" class="btn btn-secondary btn-sm text-red-600">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Request Time Off Modal -->
    <Teleport to="body" v-if="showRequestModal">
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="showRequestModal = false" />
          <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-lg font-semibold">Request Time Off</h2>
              <button @click="showRequestModal = false" class="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form @submit.prevent="handleSubmitRequest" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select v-model="reqForm.type" class="input" required>
                  <option value="">Select type</option>
                  <option value="vacation">Vacation</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input v-model="reqForm.startDate" type="date" class="input" required />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <input v-model="reqForm.endDate" type="date" class="input" required />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <textarea v-model="reqForm.reason" class="input resize-none" rows="3" placeholder="Brief description..." />
              </div>
              <div v-if="reqError" class="text-sm text-red-600 bg-red-50 rounded-lg p-3">{{ reqError }}</div>
              <div class="flex gap-3 pt-2">
                <button type="button" @click="showRequestModal = false" class="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" class="btn btn-primary flex-1" :disabled="reqLoading">
                  {{ reqLoading ? 'Submitting...' : 'Submit Request' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Deny Modal -->
    <Teleport to="body" v-if="denyTarget">
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="denyTarget = null" />
          <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 class="text-lg font-semibold mb-4">Deny Request</h2>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
              <textarea v-model="denyNote" class="input resize-none" rows="3" placeholder="Reason for denial..." />
            </div>
            <div class="flex gap-3 mt-4">
              <button @click="denyTarget = null" class="btn btn-secondary flex-1">Cancel</button>
              <button @click="confirmDeny" class="btn btn-danger flex-1" :disabled="reviewLoading">
                {{ reviewLoading ? 'Denying...' : 'Deny Request' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { isManager } = useAuth()
const { success, error: toastError } = useToast()

const statusFilter = ref('all')
const showRequestModal = ref(false)
const reqLoading = ref(false)
const reqError = ref('')
const reviewLoading = ref(false)
const denyTarget = ref<any>(null)
const denyNote = ref('')

const reqForm = reactive({ type: '', startDate: '', endDate: '', reason: '' })

const tabs = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Denied', value: 'denied' }
]

const { data, pending, refresh } = await useFetch('/api/time-off')
const requests = computed(() => (data.value as any)?.requests || [])

const filteredRequests = computed(() => {
  if (statusFilter.value === 'all') return requests.value
  return requests.value.filter((r: any) => r.status === statusFilter.value)
})

function getCounts(status: string) {
  if (status === 'all') return 0
  return requests.value.filter((r: any) => r.status === status).length
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getDays(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1
}

function formatRelative(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

async function handleSubmitRequest() {
  reqLoading.value = true
  reqError.value = ''
  try {
    await $fetch('/api/time-off', { method: 'POST', body: reqForm })
    success('Time off request submitted!')
    showRequestModal.value = false
    Object.assign(reqForm, { type: '', startDate: '', endDate: '', reason: '' })
    refresh()
  } catch (err: any) {
    reqError.value = err?.data?.message || 'Failed to submit request'
  } finally {
    reqLoading.value = false
  }
}

async function handleReview(req: any, status: 'approved' | 'denied', note = '') {
  reviewLoading.value = true
  try {
    await $fetch(`/api/time-off/${req._id}`, { method: 'PUT', body: { status, reviewNote: note } })
    success(`Request ${status}!`)
    refresh()
  } catch {
    toastError('Failed to update request')
  } finally {
    reviewLoading.value = false
    denyTarget.value = null
    denyNote.value = ''
  }
}

function openDenyModal(req: any) {
  denyTarget.value = req
  denyNote.value = ''
}

function confirmDeny() {
  if (denyTarget.value) {
    handleReview(denyTarget.value, 'denied', denyNote.value)
  }
}

async function handleDelete(req: any) {
  if (!confirm('Cancel this time off request?')) return
  try {
    await $fetch(`/api/time-off/${req._id}`, { method: 'DELETE' })
    success('Request cancelled')
    refresh()
  } catch {
    toastError('Failed to cancel request')
  }
}
</script>
