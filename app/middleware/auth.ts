export default defineNuxtRouteMiddleware(async (to) => {
  // Authenticated storefront routes are client-rendered so the host-only API
  // session cookie is never broadened to or forwarded through the Nuxt host.
  if (import.meta.server) return

  const authStore = useAuthStore()

  if (!authStore.isLoggedIn) {
    // Might just not have been fetched yet this session (e.g. a direct
    // page load) — check before assuming logged out.
    const ok = await authStore.fetchMe()

    if (!ok) {
      return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
    }
  }

  const customer = authStore.customer

  if (to.path.startsWith('/account') && customer && !customer.email_verified && !customer.phone_verified) {
    return navigateTo(`/verify-account?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
