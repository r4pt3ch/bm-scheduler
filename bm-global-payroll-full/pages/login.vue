<template>
  <div class="min-h-screen flex items-center justify-center bg-sand-50 px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <img src="/images/logo.png" alt="BM Global Ventures Inc." class="w-28 h-28 mx-auto mb-4" />
        <h1 class="font-display text-3xl text-ink-50 mt-2">Payroll &amp; HR</h1>
        <p class="text-sm text-ink-400 mt-1">Sign in to continue</p>
      </div>

      <UiCard>
        <form class="space-y-4" @submit.prevent="handleLogin">
          <UiInput v-model="email" type="email" label="Email address" placeholder="you@bmglobalventures.com" required />
          <UiInput v-model="password" type="password" label="Password" placeholder="••••••••" required />

          <p v-if="error" class="text-sm text-rose-300 bg-rose-400/10 px-3 py-2 rounded-lg">{{ error }}</p>

          <UiButton type="submit" class="w-full" :loading="loading">Sign in</UiButton>
        </form>
      </UiCard>

      <p class="text-xs text-center text-ink-500 mt-6">
        Forgot your password? Contact HR to have it reset.
      </p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default' })

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const auth = useAuthStore()

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    const user = await auth.login(email.value, password.value)
    if (user.mustChangePassword) {
      await navigateTo('/profile?firstLogin=1')
    } else {
      await navigateTo('/')
    }
  } catch (err) {
    error.value = err?.data?.statusMessage || 'Unable to sign in. Please check your credentials.'
  } finally {
    loading.value = false
  }
}
</script>
