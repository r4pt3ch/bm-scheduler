<template>
  <div class="min-h-screen flex items-center justify-center p-4" style="background: linear-gradient(135deg, #0a0a0a 0%, #1a1208 50%, #0a0a0a 100%);">
    <!-- Subtle gold pattern overlay -->
    <div class="fixed inset-0 pointer-events-none" style="background-image: radial-gradient(circle at 20% 80%, rgba(212,175,55,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(212,175,55,0.04) 0%, transparent 50%);"></div>

    <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      <!-- Black & Gold Header -->
      <div class="px-8 py-10 text-center" style="background: linear-gradient(160deg, #0f0f0f 0%, #1c1508 100%);">
        <!-- Company logo -->
        <div class="flex justify-center mb-4">
          <img
            src="/logo.png"
            alt="BM Global Ventures Inc."
            class="h-28 w-auto object-contain"
            style="filter: drop-shadow(0 0 20px rgba(212,175,55,0.5));"
          />
        </div>

        <!-- Gold divider -->
        <div class="flex items-center justify-center gap-3 mb-3">
          <div class="h-px w-10" style="background: linear-gradient(to right, transparent, #D4AF37);"></div>
          <span class="text-xs tracking-[0.3em] uppercase font-medium" style="color:#D4AF37;">Est. 2026</span>
          <div class="h-px w-10" style="background: linear-gradient(to left, transparent, #D4AF37);"></div>
        </div>

        <p class="mt-1 text-sm tracking-widest uppercase font-medium" style="color:#D4AF37; letter-spacing:0.15em;">Scheduling System</p>
      </div>

      <!-- Form -->
      <div class="px-8 py-8 bg-white">
        <h2 class="text-lg font-semibold text-gray-900 mb-6">Sign in to your account</h2>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input
              v-model="form.email"
              type="email"
              autocomplete="email"
              class="input"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              class="input"
              placeholder="••••••••"
              required
            />
          </div>

          <div v-if="error" class="text-sm text-red-600 bg-red-50 rounded-lg p-3 flex items-center gap-2">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ error }}
          </div>

          <button
            type="submit"
            class="btn btn-primary w-full py-2.5 text-sm tracking-wide"
            style="border-radius:0.5rem;"
            :disabled="loading"
          >
            <svg v-if="loading" class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <div class="mt-6 pt-5 border-t border-gray-100 text-center text-xs text-gray-400">
          Contact your manager to get access to this system.
        </div>

        <!-- Gold accent footer -->
        <div class="mt-4 flex items-center justify-center gap-2">
          <div class="h-px flex-1" style="background: linear-gradient(to right, transparent, #D4AF37, transparent);"></div>
          <span class="text-xs font-medium" style="color:#D4AF37;">BMGV</span>
          <div class="h-px flex-1" style="background: linear-gradient(to right, transparent, #D4AF37, transparent);"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { login } = useAuth()

const form = reactive({ email: '', password: '' })
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    await login(form.email, form.password)
  } catch (err: any) {
    error.value = err?.data?.message || 'Login failed. Check your credentials.'
  } finally {
    loading.value = false
  }
}
</script>