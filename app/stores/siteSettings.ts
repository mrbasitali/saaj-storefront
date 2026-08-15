type SiteSettings = {
  logos: {
    navbar_light: string | null
    navbar_dark: string | null
    footer_light: string | null
    footer_dark: string | null
  }
  contact: {
    email: string | null
    phone: string | null
    whatsapp: string | null
    address: string | null
  }
  social_links: Record<string, string>
}

export const useSiteSettingsStore = defineStore('site-settings', () => {
  const settings = ref<SiteSettings | null>(null)
  const loaded = ref(false)

  async function fetch() {
    if (loaded.value) return

    const { $api } = useNuxtApp()

    try {
      const response = await $api<{ data: SiteSettings }>('/site-settings')

      settings.value = response.data
      loaded.value = true
    } catch {
      // Fail quietly — a missing/unreachable settings endpoint should
      // never block the page from rendering. Every consumer below
      // already falls back sensibly (text wordmark, no social icons)
      // when settings is null.
      loaded.value = true
    }
  }

  return { settings, fetch }
})
