export const useCurrentUser = () => useState('currentUser', () => null)

export function useAuth() {
  const user = useCurrentUser()

  async function fetchMe() {
    try {
      user.value = await $fetch('/api/auth/me')
    } catch {
      user.value = null
    }
    return user.value
  }

  async function login(email, password) {
    const result = await $fetch('/api/auth/login', { method: 'POST', body: { email, password } })
    await fetchMe()
    return result
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/login')
  }

  return { user, fetchMe, login, logout }
}
