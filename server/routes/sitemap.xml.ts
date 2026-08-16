type ProductImage = {
  image_url?: string | null
  optimized_urls?: {
    card?: string | null
    detail?: string | null
    zoom?: string | null
  } | null
}

type ProductEntry = {
  slug: string
  updated_at?: string | null
  primary_image?: ProductImage | null
}

type CategoryEntry = {
  full_slug: string
  updated_at?: string | null
  banner_image_url?: string | null
  image_url?: string | null
}

type ProductsResponse = {
  data: ProductEntry[]
  meta?: {
    current_page?: number
    last_page?: number
  }
}

type CategoriesResponse = {
  data: CategoryEntry[]
}

const SITE_ORIGIN = 'https://www.saaj.pk'

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function categoryPath(fullSlug: string) {
  const segments = fullSlug
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .filter(Boolean)

  return segments.length ? `/shop/${segments.join('/')}` : '/shop'
}

function productImage(product: ProductEntry) {
  return product.primary_image?.optimized_urls?.zoom
    || product.primary_image?.optimized_urls?.detail
    || product.primary_image?.image_url
    || null
}

function normalizeLastmod(value?: string | null) {
  if (!value) return null
  const date = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  return date || null
}

function xmlUrl(url: {
  loc: string
  lastmod?: string | null
  image?: string | null
}) {
  const normalizedLastmod = normalizeLastmod(url.lastmod)
  const lastmod = normalizedLastmod ? `\n    <lastmod>${escapeXml(normalizedLastmod)}</lastmod>` : ''
  const image = url.image
    ? `\n    <image:image><image:loc>${escapeXml(url.image)}</image:loc></image:image>`
    : ''

  return `  <url>\n    <loc>${escapeXml(url.loc)}</loc>${lastmod}${image}\n  </url>`
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiBaseUrl = String(config.public.apiBaseUrl || '').replace(/\/$/, '')

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400')

  const urls: Array<{ loc: string; lastmod?: string | null; image?: string | null }> = [
    { loc: `${SITE_ORIGIN}/` },
    { loc: `${SITE_ORIGIN}/shop` },
  ]

  if (!apiBaseUrl) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.map(xmlUrl).join('\n')}\n</urlset>`
  }

  try {
    const categories = await $fetch<CategoriesResponse>(`${apiBaseUrl}/categories`)

    for (const category of categories.data ?? []) {
      if (!category.full_slug) continue
      urls.push({
        loc: `${SITE_ORIGIN}${categoryPath(category.full_slug)}`,
        lastmod: category.updated_at,
        image: category.banner_image_url || category.image_url || null,
      })
    }

    const firstPage = await $fetch<ProductsResponse>(`${apiBaseUrl}/products`, {
      query: { per_page: 100, page: 1 },
    })

    const products = [...(firstPage.data ?? [])]
    const lastPage = Math.max(1, Number(firstPage.meta?.last_page || 1))

    for (let page = 2; page <= lastPage; page += 1) {
      const response = await $fetch<ProductsResponse>(`${apiBaseUrl}/products`, {
        query: { per_page: 100, page },
      })
      products.push(...(response.data ?? []))
    }

    for (const product of products) {
      if (!product.slug) continue
      urls.push({
        loc: `${SITE_ORIGIN}/products/${encodeURIComponent(product.slug)}`,
        lastmod: product.updated_at,
        image: productImage(product),
      })
    }
  } catch (error) {
    console.error('[sitemap] Failed to load catalogue URLs', error)
  }

  const unique = Array.from(new Map(urls.map(url => [url.loc, url])).values())

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${unique.map(xmlUrl).join('\n')}\n</urlset>`
})
