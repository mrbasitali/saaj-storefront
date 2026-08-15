type MaintenanceStatus = {
  checkedAt: number
  enabled: boolean
  type: 'maintenance' | 'coming_soon' | 'custom' | ''
  title: string
  message: string
}

const CACHE_MS = 60_000

export default defineNuxtRouteMiddleware(async (to) => {
  // Avoid a redirect loop, and let this route render even while the rest
  // of the customer-facing storefront is intentionally unavailable.
  if (to.path === '/coming-soon') return

  const status = useState<MaintenanceStatus>('maintenance-status', () => ({
    checkedAt: 0,
    enabled: false,
    type: '',
    title: '',
    message: '',
  }))

  const isStale = Date.now() - status.value.checkedAt > CACHE_MS

  if (isStale) {
    const { $api } = useNuxtApp()

    try {
      const response = await $api<{
        enabled: boolean
        type: MaintenanceStatus['type']
        title: string
        message: string
      }>('/maintenance-status')

      status.value = {
        checkedAt: Date.now(),
        ...response,
      }
    } catch {
      // If the Laravel API cannot be reached, the commerce storefront is
      // not usable anyway. Fail gracefully to the branded maintenance page
      // instead of exposing broken product/checkout/customer screens.
      status.value = {
        checkedAt: Date.now(),
        enabled: true,
        type: 'maintenance',
        title: "We'll be back shortly.",
        message: 'Our online store is taking a short pause while we make a few improvements. Thank you for your patience.',
      }
    }
  }

  if (status.value.enabled) {
    return navigateTo('/coming-soon')
  }
})
