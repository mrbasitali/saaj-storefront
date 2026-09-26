// Injects the raw <head> snippet and footer script that the SEO person
// manages from the Backoffice "SEO & Tracking Scripts" panel, straight
// into the rendered HTML of every page.
//
// This deliberately does NOT go through useHead()/useSeoMeta(). Those
// APIs expect structured tag objects (one entry per <script>, <meta>,
// etc.), but the whole point of this feature is that an SEO person can
// paste an arbitrary blob copied from Google Tag Manager, Meta Pixel,
// a verification snippet, or a mix of several tags — and have it show
// up byte-for-byte, wherever they put it. Nitro's `render:html` hook
// lets us splice raw strings directly into the response:
//   - html.head        -> rendered just before </head>
//   - html.bodyAppend   -> rendered just before </body>
//
// The snippet lives in Laravel (site_settings.seo_head_snippet /
// seo_footer_snippet) and is fetched over the same public
// `/site-settings` endpoint the storefront already uses for logos and
// social links. To avoid an extra HTTP round trip to the API on every
// single page render, the result is cached in memory for a short TTL
// and refreshed in the background — a page render only waits on the
// API the very first time (or after the cache has fully expired).
const CACHE_TTL_MS = 60_000
const FETCH_TIMEOUT_MS = 1500

type SiteSettingsSeoResponse = {
  data?: {
    seo?: {
      head_snippet?: string | null
      footer_snippet?: string | null
      google_site_verification?: string | null
    }
  }
}

type CustomCode = {
  head: string
  footer: string
}

let cached: CustomCode = { head: '', footer: '' }
let cachedAt = 0
let inFlight: Promise<CustomCode> | null = null

function buildHead(seo: NonNullable<SiteSettingsSeoResponse['data']>['seo']) {
  const parts: string[] = []

  const verification = seo?.google_site_verification?.trim()
  if (verification) {
    parts.push(`<meta name="google-site-verification" content="${verification.replace(/"/g, '&quot;')}">`)
  }

  const snippet = seo?.head_snippet?.trim()
  if (snippet) parts.push(snippet)

  return parts.join('\n')
}

async function fetchCustomCode(apiBaseUrl: string): Promise<CustomCode> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await $fetch<SiteSettingsSeoResponse>(`${apiBaseUrl}/site-settings`, {
      signal: controller.signal,
    })

    const seo = response?.data?.seo

    return {
      head: buildHead(seo),
      footer: seo?.footer_snippet?.trim() || '',
    }
  } catch (error) {
    console.error('[seo-custom-code] Failed to load head/footer snippets from the API', error)
    // Keep serving whatever we had before rather than blanking out a
    // tracking script because of one failed request.
    return cached
  } finally {
    clearTimeout(timeout)
  }
}

async function getCustomCode(apiBaseUrl: string): Promise<CustomCode> {
  const isStale = Date.now() - cachedAt > CACHE_TTL_MS

  if (!isStale) return cached

  // First-ever fetch (cachedAt === 0): block so the very first page
  // load isn't missing tracking scripts. After that, serve the stale
  // cache immediately and refresh it in the background so no page
  // render ever waits on the API.
  if (cachedAt === 0) {
    cached = await fetchCustomCode(apiBaseUrl)
    cachedAt = Date.now()
    return cached
  }

  if (!inFlight) {
    inFlight = fetchCustomCode(apiBaseUrl).then((result) => {
      cached = result
      cachedAt = Date.now()
      inFlight = null
      return result
    })
  }

  return cached
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', async (html) => {
    const config = useRuntimeConfig()
    const apiBaseUrl = String(config.public.apiBaseUrl || '').replace(/\/+$/, '')

    if (!apiBaseUrl) return

    try {
      const { head, footer } = await getCustomCode(apiBaseUrl)

      if (head) html.head.push(head)
      if (footer) html.bodyAppend.push(footer)
    } catch (error) {
      // Never let a broken tracking snippet take the storefront down.
      console.error('[seo-custom-code] render:html hook failed', error)
    }
  })
})
