export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  if (authStore.isLoggedIn) return

  // Might just not have been fetched yet this session (e.g. a direct
  // page load) — check before assuming logged out.
  const ok = await authStore.fetchMe()

  if (!ok) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
