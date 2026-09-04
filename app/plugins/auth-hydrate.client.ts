export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()

  // Wait until public SSR markup has hydrated before adding account state.
  // Protected client-only routes still call the same de-duplicated fetch from
  // their middleware, so direct links never race this background hydration.
  onNuxtReady(() => {
    if (!authStore.hydrated) void authStore.fetchMe().catch(() => undefined)
  })
})
