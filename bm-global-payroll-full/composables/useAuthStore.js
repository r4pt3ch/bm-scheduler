import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    initialized: false
  }),

  getters: {
    isAdmin: (state) => state.user?.role === 'admin' || state.user?.role === 'super_admin',
    isSuperAdmin: (state) => state.user?.role === 'super_admin',
    isLoggedIn: (state) => !!state.user
  },

  actions: {
    async fetchMe() {
      try {
        const { user } = await $fetch('/api/auth/me')
        this.user = user
      } catch {
        this.user = null
      } finally {
        this.initialized = true
      }
    },

    async login(email, password) {
      const { user } = await $fetch('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      })
      this.user = user
      return user
    },

    async logout() {
      await $fetch('/api/auth/logout', { method: 'POST' })
      this.user = null
      await navigateTo('/login')
    }
  }
})
