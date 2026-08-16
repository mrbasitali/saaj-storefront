type StorefrontTheme = 'light' | 'dark'

const STORAGE_KEY = 'saaj_storefront_theme'

export function useStorefrontTheme() {
  const theme = useState<StorefrontTheme>('saaj_storefront_theme', () => 'light')

  const isDark = computed(() => theme.value === 'dark')

  function syncDocument(value: StorefrontTheme) {
    if (!import.meta.client) return

    const root = document.documentElement
    root.classList.toggle('dark', value === 'dark')
    root.dataset.theme = value
    root.style.colorScheme = value

    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    themeMeta?.setAttribute('content', value === 'dark' ? '#0f110f' : '#f7f6f2')
  }

  function applyTheme(value: StorefrontTheme, persist = true) {
    theme.value = value
    syncDocument(value)

    if (persist && import.meta.client) {
      localStorage.setItem(STORAGE_KEY, value)
    }
  }

  function initTheme() {
    if (!import.meta.client) return

    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved, false)
      return
    }

    applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', false)
  }

  function toggleTheme() {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme,
    isDark,
    applyTheme,
    initTheme,
    toggleTheme,
  }
}
