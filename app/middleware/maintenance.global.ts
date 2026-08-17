type MaintenanceStatus = {
  checkedAt: number
  enabled: boolean
  type: 'maintenance' | 'coming_soon' | 'custom' | ''
  title: string
  message: string
}

const CACHE_MS = 60_000

export default defineNuxtRouteMiddleware(async (to) => {
  // A short-lived product preview link is validated by Laravel before any
  // draft data is returned. Allow that PDP to render even while the public
  // storefront itself is in coming-soon / maintenance mode.
  const previewToken = typeof to.query.preview === 'string' ? to.query.preview.trim() : ''
  if (previewToken && to.path.startsWith('/products/')) return

  // Avoid a redirect loop, and let this one route always render.
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
      const response = await $api<{ enabled: boolean, type: string, title: string, message: string }>('/maintenance-status')

      status.value = { checkedAt: Date.now(), ...response } as MaintenanceStatus
    } catch {
      // Fail open — if the status check itself fails (network blip,
      // API down), don't take that as a reason to lock out every
      // visitor. Keep the previously known state instead.
      status.value.checkedAt = Date.now()
    }
  }

  if (status.value.enabled) {
    return navigateTo('/coming-soon')
  }
})
