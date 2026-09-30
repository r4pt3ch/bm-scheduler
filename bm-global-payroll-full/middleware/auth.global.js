export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()

  if (!auth.initialized) {
    await auth.fetchMe()
  }

  const isLoginPage = to.path === '/login'
  const isKioskPage = to.path.startsWith('/kiosk')

  // The kiosk has its own separate password gate — it's intentionally excluded
  // from the standard employee auth flow.
  if (isKioskPage) return

  if (!auth.isLoggedIn && !isLoginPage) {
    return navigateTo('/login')
  }

  if (auth.isLoggedIn && isLoginPage) {
    return navigateTo('/')
  }

  // Admin-only sections
  const adminOnlyPrefixes = ['/employees', '/reports', '/settings']
  if (auth.isLoggedIn && !auth.isAdmin && adminOnlyPrefixes.some((p) => to.path.startsWith(p))) {
    return navigateTo('/')
  }

  // Super-admin-only sections — audit trail and login logs are sensitive enough
  // that even regular admins shouldn't see them.
  const superAdminOnlyPrefixes = ['/admin']
  if (auth.isLoggedIn && !auth.isSuperAdmin && superAdminOnlyPrefixes.some((p) => to.path.startsWith(p))) {
    return navigateTo('/')
  }
})
