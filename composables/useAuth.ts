interface AuthUser {
  id: string
  name: string
  email: string
  role: 'manager' | 'employee'
  position: string
  department: string
  color: string
}

const user = ref<AuthUser | null>(null)
const initialized = ref(false)

export function useAuth() {
  const router = useRouter()

  async function fetchMe() {
    try {
      const data = await $fetch<{ user: AuthUser }>('/api/auth/me')
      user.value = {
        id: (data.user as any)._id || (data.user as any).id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        position: data.user.position,
        department: data.user.department,
        color: data.user.color
      }
    } catch {
      user.value = null
    } finally {
      initialized.value = true
    }
  }

  async function login(email: string, password: string) {
    const data = await $fetch<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    })
    user.value = {
      id: (data.user as any)._id || (data.user as any).id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role,
      position: data.user.position,
      department: data.user.department,
      color: data.user.color
    }
    await router.push('/dashboard')
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    await router.push('/login')
  }

  const isManager = computed(() => user.value?.role === 'manager')

  return { user, initialized, fetchMe, login, logout, isManager }
}
