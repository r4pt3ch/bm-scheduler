<template>
  <div>
    <NuxtPage />
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
const { fetchMe, initialized } = useAuth()

onMounted(async () => {
  await fetchMe()
})
</script>
