export default defineNuxtPlugin(async () => {
  const token = useCookie<string | null>('saaj_customer_token')
  const authStore = useAuthStore()

  if (!token.value || authStore.customer) {
    authStore.hydrated = true
    return
  }

  await authStore.fetchMe()
})
