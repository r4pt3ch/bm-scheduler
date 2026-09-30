<template>
  <div>
    <header class="flex items-center justify-between mb-8 gap-4 flex-wrap">
      <div>
        <NuxtLink to="/employees" class="text-sm text-ink-400 hover:underline">← Back to directory</NuxtLink>
        <h1 class="font-display text-3xl text-ink-50 mt-2">Employee Archive</h1>
        <p class="text-sm text-ink-400 mt-1">Separated employees — kept for payroll history, excluded from payroll generation and the active directory.</p>
      </div>
    </header>

    <UiCard class="mb-6" :padded="true">
      <input
        v-model="search"
        placeholder="Search by name, email, or employee no."
        class="focus-ring w-full rounded-lg border border-sand-200 bg-sand-100 text-ink-50 placeholder:text-ink-500/60 px-3.5 py-2.5 text-sm focus:border-brand-400"
      />
    </UiCard>

    <UiCard :padded="false">
      <div v-if="pending" class="p-6 text-sm text-ink-400">Loading…</div>
      <div v-else-if="filtered.length === 0" class="p-6 text-sm text-ink-400">No separated employees{{ search ? ' match your search' : ' yet' }}.</div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs uppercase tracking-wide text-ink-400 border-b border-sand-200">
            <th class="px-5 py-3">Name</th>
            <th class="px-5 py-3">Employee No.</th>
            <th class="px-5 py-3">Department</th>
            <th class="px-5 py-3">Date Separated</th>
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
            <td class="px-5 py-3 text-ink-300">{{ formatDate(e.dateSeparated) }}</td>
            <td class="px-5 py-3 text-right">
              <NuxtLink :to="`/employees/${e._id}`" class="text-ink-300 hover:underline text-sm font-medium">View</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </UiCard>
  </div>
</template>

<script setup>
import dayjs from 'dayjs'

definePageMeta({ layout: 'default' })

const search = ref('')

const { data, pending } = await useFetch('/api/employees', { query: { status: 'separated' } })

const filtered = computed(() => {
  let list = data.value?.employees || []
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

function formatDate(d) {
  if (!d) return '—'
  return dayjs(d).format('MMM D, YYYY')
}
</script>
