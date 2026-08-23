<script setup lang="ts">
type ProductImage = {
  id?: number
  image_url?: string | null
  optimized_urls?: { card?: string | null } | null
  alt_text?: string | null
  is_primary?: boolean
}

type Product = {
  id: number
  name: string
  slug: string
  brand?: { name: string } | null
  primary_image?: ProductImage | null
  images?: ProductImage[] | null
  default_variant?: {
    price: string | number
    sale_price: string | number | null
    compare_at_price: string | number | null
  } | null
}

type ProductsResponse = {
  data: Product[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from?: number | null
    to?: number | null
  }
}

type FilterValue = {
  slug: string
  value: string
  color_code?: string | null
}

type FilterAttribute = {
  code: string
  name: string
  type?: string
  values: FilterValue[]
}

type Category = {
  id: number
  name: string
  full_slug: string
  description?: string | null
  banner_image_url?: string | null
  image_url?: string | null
  meta_title?: string | null
  meta_description?: string | null
  children?: Category[] | null
}

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()

const filterOpen = ref(false)
const sortOpen = ref(false)
const draftAttributes = reactive<Record<string, string[]>>({})

function categoryPath(slug: string | null | undefined) {
  if (!slug) return '/shop'
  const segments = slug.split('/').map(segment => encodeURIComponent(segment)).filter(Boolean)
  return segments.length ? `/shop/${segments.join('/')}` : '/shop'
}

const categorySlug = computed(() => {
  const routeCategory = route.params.category
  if (Array.isArray(routeCategory)) return routeCategory.map(value => decodeURIComponent(String(value))).join('/')
  if (typeof routeCategory === 'string' && routeCategory) return decodeURIComponent(routeCategory)
  return typeof route.query.category === 'string' ? route.query.category : ''
})

// Keep old query-based category URLs working, but permanently move them to
// the crawlable category path used by the storefront going forward.
if (!route.params.category && typeof route.query.category === 'string' && route.query.category) {
  const legacyCategory = route.query.category
  const query = { ...route.query }
  delete query.category
  await navigateTo({ path: categoryPath(legacyCategory), query }, { redirectCode: 301, replace: true })
}
const searchTerm = computed(() => typeof route.query.search === 'string' ? route.query.search.trim() : '')
const currentSort = computed(() => typeof route.query.sort === 'string' ? route.query.sort : 'recommended')
const initialPage = computed(() => {
  const raw = Number(route.query.page || 1)
  return Number.isFinite(raw) && raw > 1 ? Math.floor(raw) : 1
})

const sortOptions = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'latest', label: 'Newest first' },
  { value: 'price_low', label: 'Price: low to high' },
  { value: 'price_high', label: 'Price: high to low' },
  { value: 'name', label: 'Name: A–Z' },
]

const activeSortLabel = computed(() =>
  sortOptions.find(option => option.value === currentSort.value)?.label ?? 'Recommended',
)

function encodedCategoryPath(slug: string) {
  return slug.split('/').map(segment => encodeURIComponent(segment)).join('/')
}

const categoryDataKey = computed(() => `shop-category-detail:${categorySlug.value || 'all'}`)

const { data: categoryResponse, error: categoryError } = await useAsyncData(
  categoryDataKey,
  async () => {
    if (!categorySlug.value) return { data: null as Category | null }
    return $api<{ data: Category }>(`/categories/show/${encodedCategoryPath(categorySlug.value)}`)
  },
)

const category = computed(() => categoryResponse.value?.data ?? null)

function breadcrumbLabelFromSlug(segment: string) {
  return decodeURIComponent(segment)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())
}

const categoryBreadcrumbTrail = computed(() => {
  const fullSlug = category.value?.full_slug || categorySlug.value
  if (!fullSlug) return []

  const segments = fullSlug.split('/').filter(Boolean)
  let path = ''

  return segments.map((segment, index) => {
    path = path ? `${path}/${segment}` : segment
    const isCurrent = index === segments.length - 1

    return {
      name: isCurrent && category.value?.name
        ? category.value.name
        : breadcrumbLabelFromSlug(segment),
      full_slug: path,
      is_current: isCurrent,
    }
  })
})

if (import.meta.server && categorySlug.value && categoryError.value) {
  const upstreamStatus = Number((categoryError.value as any)?.statusCode || (categoryError.value as any)?.status || 500)
  throw createError({
    statusCode: upstreamStatus === 404 ? 404 : 502,
    statusMessage: upstreamStatus === 404 ? 'Collection not found' : 'Collection service unavailable',
  })
}

const filterDataKey = computed(() => `shop-filter-options:${categorySlug.value || 'all'}`)

const { data: filterResponse } = await useAsyncData(
  filterDataKey,
  async () => {
    if (categorySlug.value) {
      return $api<any>(`/categories/filters/${encodedCategoryPath(categorySlug.value)}`)
    }

    return $api<{ data: FilterAttribute[] }>('/products/filters')
  },
)

const filterOptions = computed<FilterAttribute[]>(() => {
  const response = filterResponse.value
  if (!response) return []

  if (Array.isArray(response.data)) {
    return response.data.map((attribute: any) => ({
      code: attribute.code,
      name: attribute.name,
      type: attribute.type,
      values: attribute.values ?? attribute.active_values ?? [],
    }))
  }

  if (Array.isArray(response.filters)) {
    return response.filters.map((attribute: any) => ({
      code: attribute.code,
      name: attribute.name,
      type: attribute.type,
      values: attribute.active_values ?? attribute.values ?? [],
    }))
  }

  return []
})

function attributesFromRoute() {
  const attributes: Record<string, string[]> = {}

  for (const [key, rawValue] of Object.entries(route.query)) {
    if (!key.startsWith('attr_') || rawValue == null) continue

    const code = key.slice(5)
    const rawValues = Array.isArray(rawValue) ? rawValue : [rawValue]
    const values = rawValues
      .filter((value): value is string => typeof value === 'string')
      .flatMap(value => value.split(','))
      .map(value => value.trim())
      .filter(Boolean)

    if (values.length) attributes[code] = [...new Set(values)]
  }

  return attributes
}

function syncDraftFilters() {
  const routeAttributes = attributesFromRoute()
  const knownCodes = new Set([
    ...Object.keys(draftAttributes),
    ...filterOptions.value.map(attribute => attribute.code),
    ...Object.keys(routeAttributes),
  ])

  for (const code of knownCodes) {
    draftAttributes[code] = [...(routeAttributes[code] ?? [])]
  }
}

watch([filterOptions, () => route.fullPath], syncDraftFilters, { immediate: true })

function catalogueQuery(page = 1) {
  const attributes = attributesFromRoute()
  const query: Record<string, string | number | boolean | undefined> = {
    category: categorySlug.value || undefined,
    search: searchTerm.value || undefined,
    page,
    per_page: 24,
    include_images: true,
    sort_by: currentSort.value === 'recommended' ? undefined : currentSort.value,
  }

  for (const [code, values] of Object.entries(attributes)) {
    if (values.length) query[`attr_${code}`] = values.join(',')
  }

  return query
}

const catalogueSignature = computed(() => JSON.stringify({
  category: categorySlug.value,
  search: searchTerm.value,
  sort: currentSort.value,
  attributes: attributesFromRoute(),
  page: initialPage.value,
}))

const catalogueDataKey = computed(() => `shop-products:${route.fullPath}`)

const { data, pending, error, refresh } = await useAsyncData<ProductsResponse>(
  catalogueDataKey,
  () => $api<ProductsResponse>('/products', { query: catalogueQuery(initialPage.value) }),
)

const loadedProducts = ref<Product[]>([])
const loadedMeta = ref<ProductsResponse['meta'] | null>(null)
const loadingMore = ref(false)
const loadMoreError = ref('')

watch(
  data,
  (response) => {
    loadedProducts.value = response?.data ?? []
    loadedMeta.value = response?.meta ?? null
    loadMoreError.value = ''
  },
  { immediate: true },
)

watch(catalogueSignature, () => {
  loadedProducts.value = []
  loadedMeta.value = null
  loadingMore.value = false
  loadMoreError.value = ''
})

const products = computed(() => loadedProducts.value)
const meta = computed(() => loadedMeta.value)
const hasMore = computed(() => !!meta.value && meta.value.current_page < meta.value.last_page)
const loadedProgress = computed(() => {
  if (!meta.value?.total) return 0
  return Math.min(100, Math.round((products.value.length / meta.value.total) * 100))
})

const childCategories = computed(() => category.value?.children?.filter(child => child.full_slug) ?? [])

const pageHeading = computed(() => {
  if (searchTerm.value) return `Results for “${searchTerm.value}”`
  if (category.value?.name) return category.value.name
  return 'The Shop'
})

const pageKicker = computed(() => {
  if (searchTerm.value) return 'Search'
  if (category.value) return 'Collection'
  return 'SAAJ / Shop'
})

const pageDescription = computed(() => {
  if (searchTerm.value) return 'A considered selection matching your search.'
  if (category.value?.description) return category.value.description
  return 'Explore the complete SAAJ edit — considered pieces designed to live well beyond a season.'
})

const categoryBanner = computed(() => category.value?.banner_image_url || null)
// Category landing pages intentionally show media only when a dedicated
// banner exists. The square category image belongs to homepage/navigation
// discovery and is never substituted into the collection masthead.
const categoryMedia = computed(() => categoryBanner.value)
const showCategoryBanner = computed(() => !!categoryBanner.value && !searchTerm.value)

const activeFilterChips = computed(() => {
  const routeAttributes = attributesFromRoute()
  const chips: Array<{ code: string, slug: string, label: string }> = []

  for (const attribute of filterOptions.value) {
    for (const slug of routeAttributes[attribute.code] ?? []) {
      const value = attribute.values.find(item => item.slug === slug)
      chips.push({
        code: attribute.code,
        slug,
        label: value?.value ?? slug,
      })
    }
  }

  return chips
})

const activeFilterCount = computed(() => activeFilterChips.value.length)

const siteOrigin = 'https://www.saaj.pk'
const canonicalPath = computed(() => categoryPath(categorySlug.value))
const hasFacetState = computed(() => (
  !!searchTerm.value
  || currentSort.value !== 'recommended'
  || Object.keys(attributesFromRoute()).length > 0
))
const canonicalUrl = computed(() => {
  const base = `${siteOrigin}${canonicalPath.value}`
  if (!hasFacetState.value && initialPage.value > 1) return `${base}?page=${initialPage.value}`
  return base
})

const breadcrumbSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: `${siteOrigin}/`,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Shop',
      item: `${siteOrigin}/shop`,
    },
    ...categoryBreadcrumbTrail.value.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 3,
      name: item.name,
      item: `${siteOrigin}${categoryPath(item.full_slug)}`,
    })),
  ],
}))

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

useSeoMeta({
  title: () => category.value?.meta_title || `${pageHeading.value} | SAAJ`,
  description: () => category.value?.meta_description || pageDescription.value.replace(/<[^>]*>/g, '').slice(0, 160),
  robots: () => hasFacetState.value ? 'noindex,follow' : 'index,follow,max-image-preview:large',
  ogTitle: () => category.value?.meta_title || `${pageHeading.value} | SAAJ`,
  ogDescription: () => category.value?.meta_description || pageDescription.value.replace(/<[^>]*>/g, '').slice(0, 160),
  ogUrl: () => canonicalUrl.value,
  ogImage: () => categoryMedia.value || undefined,
  ogImageAlt: () => category.value?.name ? `${category.value.name} at SAAJ` : 'Shop SAAJ',
  ogSiteName: 'SAAJ',
  twitterCard: 'summary_large_image',
  twitterTitle: () => category.value?.meta_title || `${pageHeading.value} | SAAJ`,
  twitterDescription: () => category.value?.meta_description || pageDescription.value.replace(/<[^>]*>/g, '').slice(0, 160),
  twitterImage: () => categoryMedia.value || undefined,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  script: [{
    key: 'shop-breadcrumb-jsonld',
    type: 'application/ld+json',
    innerHTML: safeJson(breadcrumbSchema.value),
  }],
}))

watch([filterOpen, sortOpen], () => {
  if (!import.meta.client) return
  const isMobile = window.matchMedia('(max-width: 1023px)').matches
  document.body.style.overflow = isMobile && (filterOpen.value || sortOpen.value) ? 'hidden' : ''
})

onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
})

function toggleAttributeValue(code: string, slug: string) {
  const current = draftAttributes[code] ?? []
  draftAttributes[code] = current.includes(slug)
    ? current.filter(value => value !== slug)
    : [...current, slug]
}

async function applyFilters() {
  const query: Record<string, any> = { ...route.query }
  delete query.page

  for (const key of Object.keys(query)) {
    if (key.startsWith('attr_')) delete query[key]
  }

  for (const [code, values] of Object.entries(draftAttributes)) {
    if (values.length) query[`attr_${code}`] = values.join(',')
  }

  filterOpen.value = false
  await router.push({ path: canonicalPath.value, query })
}

async function clearFilters() {
  for (const code of Object.keys(draftAttributes)) draftAttributes[code] = []
  await applyFilters()
}

async function removeFilter(code: string, slug: string) {
  const query: Record<string, any> = { ...route.query }
  const key = `attr_${code}`
  const raw = query[key]
  const rawValues = Array.isArray(raw) ? raw : [raw]
  const values = rawValues
    .filter((value): value is string => typeof value === 'string')
    .flatMap(value => value.split(','))
    .map(value => value.trim())
    .filter(value => value && value !== slug)

  if (values.length) query[key] = values.join(',')
  else delete query[key]

  delete query.page
  await router.push({ path: canonicalPath.value, query })
}

async function chooseSort(value: string) {
  const query: Record<string, any> = { ...route.query }

  if (value === 'recommended') delete query.sort
  else query.sort = value

  delete query.page
  sortOpen.value = false
  await router.push({ path: canonicalPath.value, query })
}

async function loadMore() {
  if (!meta.value || !hasMore.value || loadingMore.value) return

  const requestSignature = catalogueSignature.value
  const nextPage = meta.value.current_page + 1

  loadingMore.value = true
  loadMoreError.value = ''

  try {
    const response = await $api<ProductsResponse>('/products', {
      query: catalogueQuery(nextPage),
    })

    // A visitor can change a filter while a slow "load more" request is
    // still in flight. Never append products from the previous catalogue
    // state into the newly filtered grid.
    if (requestSignature !== catalogueSignature.value) return

    const existingIds = new Set(loadedProducts.value.map(product => product.id))
    const nextProducts = response.data.filter(product => !existingIds.has(product.id))

    loadedProducts.value = [...loadedProducts.value, ...nextProducts]
    loadedMeta.value = response.meta
  } catch {
    if (requestSignature === catalogueSignature.value) {
      loadMoreError.value = 'We could not load the next pieces. Please try again.'
    }
  } finally {
    if (requestSignature === catalogueSignature.value) {
      loadingMore.value = false
    }
  }
}

function closePanels() {
  filterOpen.value = false
  sortOpen.value = false
}
</script>

<template>
  <main class="shop-page min-h-screen bg-paper-50">
    <!-- Compact collection masthead. Dedicated banner only; category images never substitute here. -->
    <section class="shop-collection-header border-b border-charcoal-950/[0.07]">
      <div v-if="showCategoryBanner" class="shop-collection-banner relative isolate overflow-hidden bg-mist-100">
        <NuxtImg
          :src="categoryBanner!"
          :alt="`${category?.name || 'SAAJ'} collection banner`"
          class="shop-collection-banner-image absolute inset-0 h-full w-full object-cover"
          sizes="100vw"
          fetchpriority="high"
        />
        <div class="shop-collection-banner-shade absolute inset-0" />

        <div class="relative z-10 mx-auto flex h-full max-w-[1760px] flex-col justify-between px-5 py-5 text-white sm:px-8 sm:py-6 lg:px-12 lg:py-7 xl:px-16">
          <nav class="shop-breadcrumb shop-breadcrumb-on-media" aria-label="Breadcrumb">
            <NuxtLink to="/" class="shop-breadcrumb-link">
              <svg class="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25"><path d="M2.5 7.2 8 2.8l5.5 4.4v6H9.8V9.7H6.2v3.5H2.5v-6Z" /></svg>
              <span>Home</span>
            </NuxtLink>
            <svg class="shop-breadcrumb-separator" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.1"><path d="m4.3 2.6 3.4 3.4-3.4 3.4" /></svg>
            <NuxtLink to="/shop" class="shop-breadcrumb-link">Shop</NuxtLink>
            <template v-for="item in categoryBreadcrumbTrail" :key="`banner-${item.full_slug}`">
              <svg class="shop-breadcrumb-separator" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.1"><path d="m4.3 2.6 3.4 3.4-3.4 3.4" /></svg>
              <span v-if="item.is_current" class="shop-breadcrumb-current" aria-current="page">{{ item.name }}</span>
              <NuxtLink v-else :to="categoryPath(item.full_slug)" class="shop-breadcrumb-link">{{ item.name }}</NuxtLink>
            </template>
          </nav>

          <div class="max-w-[780px]">
            <p class="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/64">{{ pageKicker }}</p>
            <h1 class="mt-2 font-display text-[clamp(2.5rem,4.6vw,5.4rem)] font-medium leading-[0.9] tracking-[-0.055em] text-white">{{ pageHeading }}</h1>
            <div v-if="pageDescription" class="shop-description shop-description-on-media mt-3 line-clamp-2 max-w-2xl text-[12px] leading-5 text-white/72 sm:text-[13px] sm:leading-6" v-html="pageDescription" />

            <div v-if="childCategories.length" class="mt-4 flex max-w-full gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <NuxtLink v-for="child in childCategories" :key="child.id" :to="categoryPath(child.full_slug)" class="shop-child-chip shop-child-chip-on-media">
                {{ child.name }}
                <svg class="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 8h9M9 5l3 3-3 3" /></svg>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="mx-auto max-w-[1760px] px-5 py-6 sm:px-8 sm:py-7 lg:px-12 lg:py-8 xl:px-16">
        <nav class="shop-breadcrumb mb-4" aria-label="Breadcrumb">
          <NuxtLink to="/" class="shop-breadcrumb-link">
            <svg class="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25"><path d="M2.5 7.2 8 2.8l5.5 4.4v6H9.8V9.7H6.2v3.5H2.5v-6Z" /></svg>
            <span>Home</span>
          </NuxtLink>
          <svg class="shop-breadcrumb-separator" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.1"><path d="m4.3 2.6 3.4 3.4-3.4 3.4" /></svg>
          <NuxtLink v-if="category || searchTerm" to="/shop" class="shop-breadcrumb-link">Shop</NuxtLink>
          <span v-else class="shop-breadcrumb-current" aria-current="page">Shop</span>

          <template v-if="category">
            <template v-for="item in categoryBreadcrumbTrail" :key="`plain-${item.full_slug}`">
              <svg class="shop-breadcrumb-separator" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.1"><path d="m4.3 2.6 3.4 3.4-3.4 3.4" /></svg>
              <span v-if="item.is_current" class="shop-breadcrumb-current" aria-current="page">{{ item.name }}</span>
              <NuxtLink v-else :to="categoryPath(item.full_slug)" class="shop-breadcrumb-link">{{ item.name }}</NuxtLink>
            </template>
          </template>

          <template v-else-if="searchTerm">
            <svg class="shop-breadcrumb-separator" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.1"><path d="m4.3 2.6 3.4 3.4-3.4 3.4" /></svg>
            <span class="shop-breadcrumb-current" aria-current="page">Search</span>
          </template>
        </nav>

        <div class="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-end lg:gap-12">
          <div>
            <p class="section-kicker">{{ pageKicker }}</p>
            <h1 class="mt-1.5 font-display text-[clamp(2.35rem,3.8vw,4.6rem)] font-medium leading-[0.92] tracking-[-0.052em] text-charcoal-950">{{ pageHeading }}</h1>
          </div>
          <div class="shop-description max-w-2xl text-[12px] leading-5 text-charcoal-500 sm:text-[13px] sm:leading-6 lg:justify-self-end" v-html="pageDescription" />
        </div>

        <NuxtLink
          v-if="searchTerm"
          to="/shop"
          class="mt-4 inline-flex w-fit items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-500 transition hover:text-charcoal-950"
        >
          <span>Clear search</span>
          <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><path d="m4 4 8 8M12 4l-8 8" /></svg>
        </NuxtLink>

        <div v-if="childCategories.length" class="mt-4 flex max-w-full gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NuxtLink v-for="child in childCategories" :key="child.id" :to="categoryPath(child.full_slug)" class="shop-child-chip">
            {{ child.name }}
            <svg class="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 8h9M9 5l3 3-3 3" /></svg>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Product controls -->
    <section class="mx-auto max-w-[1760px] px-4 pb-20 sm:px-6 lg:px-10 xl:px-12">
      <div class="shop-toolbar storefront-glass-surface sticky top-[68px] z-30 -mx-4 border-b border-charcoal-950/[0.07] px-4 sm:-mx-6 sm:px-6 lg:top-[114px] lg:-mx-10 lg:px-10 xl:-mx-12 xl:px-12">
        <div class="flex min-h-[62px] items-center justify-between gap-4">
          <div class="min-w-0">
            <p v-if="meta" class="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-500">
              {{ meta.total }} {{ meta.total === 1 ? 'piece' : 'pieces' }}
            </p>
            <StorefrontSkeleton v-else class="h-3 w-20" />
          </div>

          <div class="flex shrink-0 items-center gap-1 sm:gap-3">
            <button
              v-if="filterOptions.length"
              type="button"
              class="shop-control-button"
              :class="{ 'is-open': filterOpen }"
              :aria-expanded="filterOpen"
              @click="filterOpen = !filterOpen; sortOpen = false"
            >
              <span>Filter</span>
              <span v-if="activeFilterCount" class="text-charcoal-400">({{ activeFilterCount }})</span>
              <svg class="h-3.5 w-3.5 transition-transform duration-300" :class="filterOpen ? 'rotate-45' : ''" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25">
                <path d="M8 3v10M3 8h10" />
              </svg>
            </button>

            <div class="relative">
              <button
                type="button"
                class="shop-control-button"
                :class="{ 'is-open': sortOpen }"
                :aria-expanded="sortOpen"
                @click="sortOpen = !sortOpen; filterOpen = false"
              >
                <span class="hidden sm:inline">Sort: {{ activeSortLabel }}</span>
                <span class="sm:hidden">Sort</span>
                <svg class="h-3.5 w-3.5 transition-transform duration-300" :class="sortOpen ? 'rotate-180' : ''" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25">
                  <path d="m4 6 4 4 4-4" />
                </svg>
              </button>

              <Transition name="shop-popover">
                <div
                  v-if="sortOpen"
                  class="absolute right-0 top-[calc(100%+10px)] z-40 hidden w-[250px] border border-charcoal-950/[0.08] bg-paper-50 p-2 shadow-[0_20px_55px_rgba(0,0,0,0.09)] lg:block"
                >
                  <button
                    v-for="option in sortOptions"
                    :key="option.value"
                    type="button"
                    class="flex w-full items-center justify-between px-3 py-3 text-left text-[12px] transition hover:bg-mist-50"
                    :class="currentSort === option.value ? 'text-charcoal-950' : 'text-charcoal-600'"
                    @click="chooseSort(option.value)"
                  >
                    {{ option.label }}
                    <span
                      class="h-1.5 w-1.5 rounded-full bg-charcoal-950 transition"
                      :class="currentSort === option.value ? 'opacity-100' : 'opacity-0'"
                    />
                  </button>
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <div
          v-if="activeFilterChips.length"
          class="flex gap-2 overflow-x-auto border-t border-charcoal-950/[0.055] py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <button
            v-for="chip in activeFilterChips"
            :key="`${chip.code}-${chip.slug}`"
            type="button"
            class="flex shrink-0 items-center gap-2 bg-mist-100 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.1em] text-charcoal-700 transition hover:bg-mist-200 hover:text-charcoal-950"
            @click="removeFilter(chip.code, chip.slug)"
          >
            {{ chip.label }}
            <svg class="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
              <path d="m4 4 8 8M12 4l-8 8" />
            </svg>
          </button>

          <button
            type="button"
            class="shrink-0 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-charcoal-400 underline decoration-charcoal-300 underline-offset-4 transition hover:text-charcoal-950"
            @click="clearFilters"
          >
            Clear all
          </button>
        </div>
      </div>

      <!-- Desktop filters -->
      <Transition name="shop-filter-panel">
        <div
          v-if="filterOpen && filterOptions.length"
          class="relative z-30 -mx-4 hidden border-b border-charcoal-950/[0.07] bg-paper-50 px-6 py-7 sm:-mx-6 sm:px-8 lg:-mx-10 lg:block lg:px-12 xl:-mx-12 xl:px-16"
        >
          <div class="mx-auto grid max-w-[1760px] grid-cols-2 gap-x-12 gap-y-8 xl:grid-cols-4">
            <fieldset
              v-for="attribute in filterOptions"
              :key="attribute.code"
              class="min-w-0"
            >
              <legend class="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal-950">
                {{ attribute.name }}
              </legend>

              <div class="flex flex-wrap gap-x-2 gap-y-2.5">
                <button
                  v-for="value in attribute.values"
                  :key="value.slug"
                  type="button"
                  class="shop-filter-value"
                  :class="{ 'is-selected': (draftAttributes[attribute.code] ?? []).includes(value.slug) }"
                  @click="toggleAttributeValue(attribute.code, value.slug)"
                >
                  <span
                    v-if="value.color_code"
                    class="h-3.5 w-3.5 rounded-full border border-black/10"
                    :style="{ backgroundColor: value.color_code }"
                  />
                  {{ value.value }}
                </button>
              </div>
            </fieldset>
          </div>

          <div class="mx-auto mt-7 flex max-w-[1760px] items-center justify-between border-t border-charcoal-950/[0.06] pt-5">
            <button
              type="button"
              class="text-[10px] font-semibold uppercase tracking-[0.13em] text-charcoal-400 transition hover:text-charcoal-950"
              @click="clearFilters"
            >
              Clear all
            </button>
            <button
              type="button"
              class="min-w-[160px] bg-charcoal-950 px-7 py-3.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-paper-50 transition hover:bg-charcoal-800"
              @click="applyFilters"
            >
              View results
            </button>
          </div>
        </div>
      </Transition>

      <!-- Results -->
      <div class="pt-7 sm:pt-9">
        <div
          v-if="pending"
          class="grid grid-cols-2 gap-x-2.5 gap-y-9 sm:gap-x-4 sm:gap-y-11 md:grid-cols-3 xl:grid-cols-4"
        >
          <ProductCardSkeleton v-for="n in 12" :key="n" />
        </div>

        <div
          v-else-if="error"
          class="flex min-h-[420px] flex-col items-center justify-center text-center"
        >
          <p class="section-kicker">Something went wrong</p>
          <h2 class="mt-3 font-display text-3xl font-medium text-charcoal-950">We couldn't load the collection.</h2>
          <p class="mt-2 max-w-md text-[13px] leading-6 text-charcoal-500">Please try again. Your filters and current page will stay exactly as they are.</p>
          <button
            type="button"
            class="mt-6 border-b border-charcoal-950 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-950"
            @click="refresh()"
          >
            Try again
          </button>
        </div>

        <div
          v-else-if="products.length === 0"
          class="flex min-h-[460px] flex-col items-center justify-center px-5 text-center"
        >
          <p class="section-kicker">No pieces found</p>
          <h2 class="mt-3 max-w-lg font-display text-[34px] font-medium leading-none tracking-[-0.025em] text-charcoal-950 sm:text-[42px]">
            A quieter result than expected.
          </h2>
          <p class="mt-4 max-w-md text-[13px] leading-6 text-charcoal-500">
            Try removing a filter or exploring the complete SAAJ edit.
          </p>
          <button
            v-if="activeFilterCount"
            type="button"
            class="mt-7 border-b border-charcoal-950 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-950"
            @click="clearFilters"
          >
            Clear filters
          </button>
          <NuxtLink
            v-else
            to="/shop"
            class="mt-7 border-b border-charcoal-950 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-950"
          >
            Shop all
          </NuxtLink>
        </div>

        <div
          v-else
          class="grid grid-cols-2 gap-x-2.5 gap-y-9 sm:gap-x-4 sm:gap-y-11 md:grid-cols-3 xl:grid-cols-4"
        >
          <ProductCard
            v-for="product in products"
            :key="product.id"
            :product="product"
          />

          <ProductCardSkeleton
            v-for="n in (loadingMore ? 4 : 0)"
            :key="`load-more-${n}`"
          />
        </div>

        <div
          v-if="meta && products.length && !pending"
          class="mx-auto mt-14 flex max-w-md flex-col items-center border-t border-charcoal-950/[0.07] pt-8 text-center sm:mt-16"
        >
          <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">
            {{ products.length }} of {{ meta.total }} pieces
          </p>

          <div class="mt-4 h-px w-full overflow-hidden bg-charcoal-950/[0.10]">
            <div
              class="h-full bg-charcoal-950 transition-[width] duration-500 ease-out"
              :style="{ width: `${loadedProgress}%` }"
            />
          </div>

          <NuxtLink
            v-if="hasMore"
            :to="{ path: canonicalPath, query: { ...route.query, page: (meta?.current_page || 1) + 1 } }"
            class="mt-6 inline-flex min-h-12 min-w-[180px] items-center justify-center border border-charcoal-950 px-7 text-[10px] font-semibold uppercase tracking-[0.15em] text-charcoal-950 transition hover:bg-charcoal-950 hover:text-paper-50"
            :class="loadingMore ? 'pointer-events-none cursor-wait opacity-55' : ''"
            @click.prevent="loadMore"
          >
            <span v-if="!loadingMore">Load more</span>
            <span v-else class="flex items-center gap-2">
              <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              Loading pieces
            </span>
          </NuxtLink>

          <p
            v-else
            class="mt-5 text-[10px] font-semibold uppercase tracking-[0.13em] text-charcoal-400"
          >
            The complete edit is here
          </p>

          <div v-if="loadMoreError" class="mt-4">
            <p class="text-[12px] leading-5 text-charcoal-500">{{ loadMoreError }}</p>
            <button
              type="button"
              class="mt-2 border-b border-charcoal-950 pb-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-charcoal-950"
              @click="loadMore"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Mobile filter layer -->
    <Teleport to="body">
      <Transition name="shop-mobile-panel">
        <section
          v-if="filterOpen"
          class="fixed inset-x-0 bottom-0 top-[68px] z-40 flex flex-col bg-paper-50 lg:hidden"
          aria-label="Product filters"
        >
          <div class="flex h-16 shrink-0 items-center justify-between border-b border-charcoal-950/[0.07] px-5">
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-[0.15em] text-charcoal-950">Filters</p>
              <p v-if="activeFilterCount" class="mt-0.5 text-[10px] text-charcoal-400">{{ activeFilterCount }} currently applied</p>
            </div>
            <button type="button" class="flex h-10 w-10 items-center justify-center" aria-label="Close filters" @click="filterOpen = false">
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.25">
                <path d="m5 5 10 10M15 5 5 15" />
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-5 py-2">
            <details
              v-for="(attribute, index) in filterOptions"
              :key="attribute.code"
              class="group border-b border-charcoal-950/[0.07]"
              :open="index === 0"
            >
              <summary class="flex cursor-pointer list-none items-center justify-between py-5 text-[12px] font-medium text-charcoal-950 [&::-webkit-details-marker]:hidden">
                <span class="flex items-center gap-2.5">
                  {{ attribute.name }}
                  <span
                    v-if="(draftAttributes[attribute.code] ?? []).length"
                    class="text-[10px] text-charcoal-400"
                  >
                    {{ (draftAttributes[attribute.code] ?? []).length }}
                  </span>
                </span>
                <svg class="h-4 w-4 transition-transform duration-300 group-open:rotate-45" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
                  <path d="M8 3v10M3 8h10" />
                </svg>
              </summary>

              <div class="flex flex-wrap gap-2 pb-6">
                <button
                  v-for="value in attribute.values"
                  :key="value.slug"
                  type="button"
                  class="shop-filter-value min-h-11"
                  :class="{ 'is-selected': (draftAttributes[attribute.code] ?? []).includes(value.slug) }"
                  @click="toggleAttributeValue(attribute.code, value.slug)"
                >
                  <span
                    v-if="value.color_code"
                    class="h-3.5 w-3.5 rounded-full border border-black/10"
                    :style="{ backgroundColor: value.color_code }"
                  />
                  {{ value.value }}
                </button>
              </div>
            </details>
          </div>

          <div class="grid shrink-0 grid-cols-[0.8fr_1.2fr] gap-2 border-t border-charcoal-950/[0.07] bg-paper-50 p-4">
            <button
              type="button"
              class="min-h-12 border border-charcoal-950/[0.16] px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-950"
              @click="clearFilters"
            >
              Clear all
            </button>
            <button
              type="button"
              class="min-h-12 bg-charcoal-950 px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-paper-50"
              @click="applyFilters"
            >
              Apply filters
            </button>
          </div>
        </section>
      </Transition>

      <Transition name="shop-mobile-panel">
        <section
          v-if="sortOpen"
          class="fixed inset-x-0 bottom-0 top-[68px] z-40 flex flex-col bg-paper-50 lg:hidden"
          aria-label="Sort products"
        >
          <div class="flex h-16 shrink-0 items-center justify-between border-b border-charcoal-950/[0.07] px-5">
            <p class="text-[10px] font-semibold uppercase tracking-[0.15em] text-charcoal-950">Sort products</p>
            <button type="button" class="flex h-10 w-10 items-center justify-center" aria-label="Close sorting" @click="sortOpen = false">
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.25">
                <path d="m5 5 10 10M15 5 5 15" />
              </svg>
            </button>
          </div>

          <div class="px-5 py-3">
            <button
              v-for="option in sortOptions"
              :key="option.value"
              type="button"
              class="flex w-full items-center justify-between border-b border-charcoal-950/[0.07] py-5 text-left text-[14px] text-charcoal-700"
              :class="{ 'font-medium text-charcoal-950': currentSort === option.value }"
              @click="chooseSort(option.value)"
            >
              {{ option.label }}
              <span class="flex h-5 w-5 items-center justify-center rounded-full border border-charcoal-300">
                <span v-if="currentSort === option.value" class="h-2.5 w-2.5 rounded-full bg-charcoal-950" />
              </span>
            </button>
          </div>
        </section>
      </Transition>
    </Teleport>

    <button
      v-if="filterOpen || sortOpen"
      type="button"
      class="fixed inset-0 z-20 hidden bg-black/10 lg:block"
      aria-label="Close product controls"
      @click="closePanels"
    />
  </main>
</template>
