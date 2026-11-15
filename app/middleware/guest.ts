export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const authStore = useAuthStore()
  if (!authStore.isLoggedIn && !await authStore.fetchMe().catch(() => false)) return

  return navigateTo(getStorefrontAuthRedirect(to.query.redirect), { replace: true })
})
