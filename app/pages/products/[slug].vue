<script setup lang="ts">
type OptimizedUrls = {
  thumb?: string | null
  card?: string | null
  detail?: string | null
  zoom?: string | null
}

type ProductImage = {
  id?: number
  image_url?: string | null
  optimized_urls?: OptimizedUrls | null
  alt_text?: string | null
  is_primary?: boolean
  sort_order?: number
}

type AttributeValue = {
  attribute_id: number
  attribute_name: string
  attribute_code: string
  value_id: number
  value: string
  slug: string
  color_code: string | null
}

type Variant = {
  id: number
  sku?: string | null
  name: string
  option_summary: string | null
  price: string | number
  sale_price: string | number | null
  compare_at_price: string | number | null
  track_inventory: boolean
  allow_backorder: boolean
  min_stock_level: number
  available_quantity?: number | null
  is_available?: boolean
  is_low_stock?: boolean
  is_default: boolean
  is_active: boolean
  sort_order?: number
  attribute_values: AttributeValue[]
  primary_image?: ProductImage | null
  images?: ProductImage[] | null
}

type Category = {
  id: number
  name: string
  full_slug: string
  depth?: number
}

type ProductDetail = {
  id: number
  name: string
  slug: string
  short_description: string | null
  description: string | null
  care_instructions: string | null
  card_description?: string | null
  meta_title?: string | null
  meta_description?: string | null
  brand?: { name: string } | null
  categories?: Category[] | null
  primary_image?: ProductImage | null
  images?: ProductImage[] | null
  active_variants: Variant[]
}

type ProductResponse = { data: ProductDetail }

type RelatedProduct = {
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

type RelatedResponse = {
  data: RelatedProduct[]
}

const route = useRoute()
const { $api } = useNuxtApp()
const cart = useCartStore()
const customerToken = useCookie<string | null>('saaj_customer_token')

const slug = computed(() => String(route.params.slug || ''))

// Product data is SEO-critical, so wait for it during SSR. This ensures
// the initial HTML source already contains the product title, description,
// canonical URL, JSON-LD, price/availability, and primary content.
const { data, pending, error, refresh } = await useAsyncData<ProductResponse>(
  () => `product-${slug.value}`,
  () => $api<ProductResponse>(`/products/${encodeURIComponent(slug.value)}`),
  { watch: [slug] },
)

const product = computed(() => data.value?.data ?? null)

// Do not render a soft-404 product page with a 200 response. Search engines
// should receive the actual upstream status when a product does not exist.
if (import.meta.server && error.value) {
  const upstreamStatus = Number((error.value as any)?.statusCode || (error.value as any)?.status || 500)
  throw createError({
    statusCode: upstreamStatus === 404 ? 404 : 502,
    statusMessage: upstreamStatus === 404 ? 'Product not found' : 'Product service unavailable',
  })
}

const siteOrigin = 'https://www.saaj.pk'

function categoryPath(fullSlug: string | null | undefined) {
  if (!fullSlug) return '/shop'
  const segments = fullSlug.split('/').map(segment => encodeURIComponent(segment)).filter(Boolean)
  return segments.length ? `/shop/${segments.join('/')}` : '/shop'
}

const primaryCategory = computed(() => {
  const categories = product.value?.categories ?? []
  return [...categories].sort((a, b) => (b.depth ?? 0) - (a.depth ?? 0))[0] ?? null
})

const productCanonicalUrl = computed(() => `${siteOrigin}/products/${encodeURIComponent(slug.value)}`)
const productSeoDescription = computed(() => product.value?.meta_description
  || product.value?.short_description
  || product.value?.card_description
  || 'Discover this SAAJ piece.')

const productJsonLd = computed(() => {
  const value = product.value
  if (!value) return null

  const images = dedupeImages([
    value.primary_image,
    ...(value.images ?? []),
    ...value.active_variants.flatMap(variant => [variant.primary_image, ...(variant.images ?? [])]),
  ])
    .map(image => imageUrl(image, 'zoom') || imageUrl(image, 'detail'))
    .filter((url): url is string => !!url)

  const offers = value.active_variants.map(variant => ({
    '@type': 'Offer',
    url: productCanonicalUrl.value,
    sku: variant.sku || undefined,
    priceCurrency: 'PKR',
    price: Number(variant.sale_price ?? variant.price).toFixed(2),
    availability: variant.is_available === false
      ? 'https://schema.org/OutOfStock'
      : 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
  }))

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: value.name,
    description: productSeoDescription.value,
    image: images,
    sku: value.active_variants.find(variant => variant.is_default)?.sku || value.active_variants[0]?.sku || undefined,
    brand: value.brand?.name ? {
      '@type': 'Brand',
      name: value.brand.name,
    } : undefined,
    offers,
  }
})

const productBreadcrumbJsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteOrigin}/` },
    { '@type': 'ListItem', position: 2, name: 'Shop', item: `${siteOrigin}/shop` },
    ...(primaryCategory.value ? [{
      '@type': 'ListItem',
      position: 3,
      name: primaryCategory.value.name,
      item: `${siteOrigin}${categoryPath(primaryCategory.value.full_slug)}`,
    }] : []),
    {
      '@type': 'ListItem',
      position: primaryCategory.value ? 4 : 3,
      name: valueOrFallback(product.value?.name, 'Product'),
      item: productCanonicalUrl.value,
    },
  ],
}))

function valueOrFallback(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback
}

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

useSeoMeta({
  title: () => product.value?.meta_title || (product.value ? `${product.value.name} | SAAJ` : 'Product | SAAJ'),
  description: () => productSeoDescription.value,
  robots: 'index,follow,max-image-preview:large',
  ogTitle: () => product.value?.meta_title || (product.value ? `${product.value.name} | SAAJ` : 'Product | SAAJ'),
  ogDescription: () => productSeoDescription.value,
  ogUrl: () => productCanonicalUrl.value,
  ogImage: () => imageUrl(product.value?.primary_image, 'zoom') || imageUrl(product.value?.primary_image, 'detail') || undefined,
  ogImageAlt: () => product.value?.primary_image?.alt_text || product.value?.name || 'SAAJ product',
  ogType: 'product',
  ogSiteName: 'SAAJ',
  twitterCard: 'summary_large_image',
  twitterTitle: () => product.value?.meta_title || (product.value ? `${product.value.name} | SAAJ` : 'Product | SAAJ'),
  twitterDescription: () => productSeoDescription.value,
  twitterImage: () => imageUrl(product.value?.primary_image, 'zoom') || imageUrl(product.value?.primary_image, 'detail') || undefined,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: productCanonicalUrl.value }],
  script: [
    ...(productJsonLd.value ? [{
      key: 'product-jsonld',
      type: 'application/ld+json',
      innerHTML: safeJson(productJsonLd.value),
    }] : []),
    {
      key: 'product-breadcrumb-jsonld',
      type: 'application/ld+json',
      innerHTML: safeJson(productBreadcrumbJsonLd.value),
    },
  ],
}))

const attributeGroups = computed(() => {
  const groups = new Map<string, { name: string, values: Map<string, AttributeValue> }>()

  for (const variant of product.value?.active_variants ?? []) {
    for (const attributeValue of variant.attribute_values ?? []) {
      if (!groups.has(attributeValue.attribute_code)) {
        groups.set(attributeValue.attribute_code, {
          name: attributeValue.attribute_name,
          values: new Map(),
        })
      }

      groups.get(attributeValue.attribute_code)!.values.set(attributeValue.slug, attributeValue)
    }
  }

  const priority = (code: string, name: string) => {
    const value = `${code} ${name}`.toLowerCase()
    if (value.includes('color') || value.includes('colour')) return 0
    if (value.includes('size')) return 1
    return 2
  }

  return Array.from(groups.entries())
    .map(([code, group]) => ({
      code,
      name: group.name,
      values: Array.from(group.values.values()),
    }))
    .sort((a, b) => priority(a.code, a.name) - priority(b.code, b.name))
})

const selected = reactive<Record<string, string>>({})

function isVariantPurchasable(variant: Variant) {
  return variant.is_available !== false
}

function initialiseSelection(value: ProductDetail | null) {
  for (const key of Object.keys(selected)) delete selected[key]
  if (!value?.active_variants?.length) return

  const initial = value.active_variants.find(variant => variant.is_default && isVariantPurchasable(variant))
    ?? value.active_variants.find(isVariantPurchasable)
    ?? value.active_variants.find(variant => variant.is_default)
    ?? value.active_variants[0]

  for (const attributeValue of initial.attribute_values ?? []) {
    selected[attributeValue.attribute_code] = attributeValue.slug
  }
}

watch(product, initialiseSelection, { immediate: true })

function variantHasValue(variant: Variant, attributeCode: string, valueSlug: string) {
  return variant.attribute_values.some(value => value.attribute_code === attributeCode && value.slug === valueSlug)
}

function matchesOtherSelections(variant: Variant, ignoredCode: string) {
  for (const [code, slugValue] of Object.entries(selected)) {
    if (!slugValue || code === ignoredCode) continue

    const variantValue = variant.attribute_values.find(value => value.attribute_code === code)
    if (variantValue && variantValue.slug !== slugValue) return false
  }

  return true
}

function choiceStatus(attributeCode: string, valueSlug: string) {
  const group = attributeGroups.value.find(item => item.code === attributeCode)
  const colorChoice = group ? isColorGroup(group.code, group.name) : false

  const candidates = (product.value?.active_variants ?? []).filter(variant =>
    variantHasValue(variant, attributeCode, valueSlug)
    && (colorChoice || matchesOtherSelections(variant, attributeCode)),
  )

  return {
    exists: candidates.length > 0,
    available: candidates.some(isVariantPurchasable),
  }
}

function selectValue(attributeCode: string, valueSlug: string) {
  const variants = product.value?.active_variants ?? []
  const candidates = variants.filter(variant => variantHasValue(variant, attributeCode, valueSlug))

  const candidate = candidates.find(variant => isVariantPurchasable(variant) && matchesOtherSelections(variant, attributeCode))
    ?? candidates.find(isVariantPurchasable)
    ?? candidates.find(variant => matchesOtherSelections(variant, attributeCode))
    ?? candidates[0]

  if (!candidate) return

  for (const attributeValue of candidate.attribute_values) {
    selected[attributeValue.attribute_code] = attributeValue.slug
  }
}

const matchedVariant = computed(() => {
  const groups = attributeGroups.value
  if (!groups.length) return product.value?.active_variants?.[0] ?? null

  return (product.value?.active_variants ?? []).find((variant) =>
    groups.every((group) => {
      const wanted = selected[group.code]
      return !!wanted && variant.attribute_values.some(value => value.attribute_code === group.code && value.slug === wanted)
    }),
  ) ?? null
})

function isColorGroup(code: string, name: string) {
  return `${code} ${name}`.toLowerCase().includes('color')
    || `${code} ${name}`.toLowerCase().includes('colour')
}

function isSizeGroup(code: string, name: string) {
  return `${code} ${name}`.toLowerCase().includes('size')
}

function selectedValueLabel(code: string) {
  const group = attributeGroups.value.find(item => item.code === code)
  return group?.values.find(value => value.slug === selected[code])?.value ?? ''
}

function imageUrl(image: ProductImage | null | undefined, size: keyof OptimizedUrls = 'detail') {
  return image?.optimized_urls?.[size] ?? image?.image_url ?? null
}

function dedupeImages(images: Array<ProductImage | null | undefined>) {
  const seen = new Set<string>()
  const output: ProductImage[] = []

  for (const image of images) {
    if (!image) continue
    const key = String(image.id ?? imageUrl(image, 'detail') ?? image.image_url ?? '')
    if (!key || seen.has(key) || !imageUrl(image, 'detail')) continue
    seen.add(key)
    output.push(image)
  }

  return output
}

const galleryImages = computed(() => {
  const variant = matchedVariant.value
  const variantImages = dedupeImages([
    variant?.primary_image,
    ...(variant?.images ?? []),
  ])

  if (variantImages.length) return variantImages

  return dedupeImages([
    product.value?.primary_image,
    ...(product.value?.images ?? []),
  ])
})

const currentImageIndex = ref(0)
const galleryScroller = ref<HTMLElement | null>(null)
const galleryMotion = ref<'next' | 'previous'>('next')
const desktopGalleryImage = computed(() => galleryImages.value[currentImageIndex.value] ?? galleryImages.value[0] ?? null)
const galleryTransitionName = computed(() => galleryMotion.value === 'previous' ? 'product-gallery-previous' : 'product-gallery-next')

function setGalleryImage(index: number) {
  if (!galleryImages.value.length) return
  const nextIndex = Math.min(Math.max(index, 0), galleryImages.value.length - 1)
  if (nextIndex === currentImageIndex.value) return
  galleryMotion.value = nextIndex > currentImageIndex.value ? 'next' : 'previous'
  currentImageIndex.value = nextIndex
}

function stepGallery(direction: 1 | -1) {
  const count = galleryImages.value.length
  if (count < 2) return
  galleryMotion.value = direction === 1 ? 'next' : 'previous'
  currentImageIndex.value = (currentImageIndex.value + direction + count) % count
}

watch(() => matchedVariant.value?.id, () => {
  currentImageIndex.value = 0
  nextTick(() => scrollToImage(0, false))
})

watch(galleryImages, (images) => {
  if (!images.length) {
    currentImageIndex.value = 0
    zoomImageIndex.value = 0
    if (zoomOpen.value) closeZoom()
    return
  }

  if (currentImageIndex.value >= images.length) currentImageIndex.value = images.length - 1
  if (zoomImageIndex.value >= images.length) zoomImageIndex.value = images.length - 1
})

function scrollToImage(index: number, smooth = true) {
  const scroller = galleryScroller.value
  const child = scroller?.children?.[index] as HTMLElement | undefined
  if (!scroller || !child) return

  scroller.scrollTo({
    left: child.offsetLeft,
    behavior: smooth ? 'smooth' : 'auto',
  })
}

function onGalleryScroll() {
  const scroller = galleryScroller.value
  if (!scroller?.children?.length) return

  const children = Array.from(scroller.children) as HTMLElement[]
  let nearest = 0
  let smallestDistance = Number.POSITIVE_INFINITY

  children.forEach((child, index) => {
    const distance = Math.abs(child.offsetLeft - scroller.scrollLeft)
    if (distance < smallestDistance) {
      smallestDistance = distance
      nearest = index
    }
  })

  currentImageIndex.value = nearest
}

const zoomOpen = ref(false)
const zoomImageIndex = ref(0)
const zoomMotion = ref<'next' | 'previous'>('next')
const zoomTouchStartX = ref<number | null>(null)
const zoomImage = computed(() => galleryImages.value[zoomImageIndex.value] ?? null)
const zoomTransitionName = computed(() => zoomMotion.value === 'previous' ? 'product-gallery-previous' : 'product-gallery-next')

function setZoomImage(index: number) {
  const count = galleryImages.value.length
  if (!count) return

  const nextIndex = Math.min(Math.max(index, 0), count - 1)
  if (nextIndex === zoomImageIndex.value) return

  zoomMotion.value = nextIndex > zoomImageIndex.value ? 'next' : 'previous'
  zoomImageIndex.value = nextIndex
  currentImageIndex.value = nextIndex
}

function stepZoom(direction: 1 | -1) {
  const count = galleryImages.value.length
  if (count < 2) return

  zoomMotion.value = direction === 1 ? 'next' : 'previous'
  zoomImageIndex.value = (zoomImageIndex.value + direction + count) % count
  currentImageIndex.value = zoomImageIndex.value
}

function openZoom(image: ProductImage) {
  const index = galleryImages.value.findIndex(candidate => {
    if (candidate.id != null && image.id != null) return candidate.id === image.id
    return imageUrl(candidate, 'detail') === imageUrl(image, 'detail')
  })

  zoomImageIndex.value = index >= 0 ? index : currentImageIndex.value
  zoomMotion.value = 'next'
  zoomOpen.value = true
}

function closeZoom() {
  zoomOpen.value = false
  zoomTouchStartX.value = null
}

function onZoomTouchStart(event: TouchEvent) {
  zoomTouchStartX.value = event.changedTouches[0]?.clientX ?? null
}

function onZoomTouchEnd(event: TouchEvent) {
  if (zoomTouchStartX.value == null) return

  const endX = event.changedTouches[0]?.clientX
  if (endX == null) return

  const distance = endX - zoomTouchStartX.value
  zoomTouchStartX.value = null

  if (Math.abs(distance) < 45) return
  stepZoom(distance < 0 ? 1 : -1)
}

function onKeydown(event: KeyboardEvent) {
  if (!zoomOpen.value) return

  if (event.key === 'Escape') {
    closeZoom()
    return
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    stepZoom(1)
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    stepZoom(-1)
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

watch(zoomOpen, (open) => {
  if (!import.meta.client) return
  document.body.style.overflow = open ? 'hidden' : ''
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKeydown)
  }

  if (addedTimer) clearTimeout(addedTimer)
  if (justAddedTimer) clearTimeout(justAddedTimer)
})

const displayPrice = computed(() => matchedVariant.value?.sale_price ?? matchedVariant.value?.price ?? null)
const originalPrice = computed(() => matchedVariant.value?.price ?? null)
const isOnSale = computed(() => {
  const variant = matchedVariant.value
  return !!(variant?.sale_price && Number(variant.sale_price) < Number(variant.price))
})

function formatPrice(value: string | number | null | undefined) {
  if (value == null) return ''
  return `Rs ${Number(value).toLocaleString()}`
}

const canAddToBag = computed(() => !!matchedVariant.value && matchedVariant.value.is_available !== false)

const maxPurchaseQuantity = computed(() => {
  const variant = matchedVariant.value
  if (!variant?.track_inventory || variant.allow_backorder || variant.available_quantity == null) return null
  return Math.max(0, variant.available_quantity)
})

const stockMessage = computed(() => {
  const variant = matchedVariant.value
  if (!variant) return 'Choose your options'
  if (variant.is_available === false) return 'Sold out in this selection'
  if (variant.is_low_stock && variant.available_quantity != null) {
    return `Only ${variant.available_quantity} left`
  }
  if (variant.track_inventory && variant.allow_backorder && (variant.available_quantity ?? 0) <= 0) {
    return 'Available to order'
  }
  return 'In stock'
})

const quantity = ref(1)

watch([() => matchedVariant.value?.id, maxPurchaseQuantity], () => {
  quantity.value = 1
})

function decreaseQuantity() {
  quantity.value = Math.max(1, quantity.value - 1)
}

function increaseQuantity() {
  const max = maxPurchaseQuantity.value
  if (max != null) quantity.value = Math.min(max, quantity.value + 1)
  else quantity.value += 1
}

const adding = ref(false)
const justAdded = ref(false)
let justAddedTimer: ReturnType<typeof setTimeout> | null = null
const addedMessage = ref('')
let addedTimer: ReturnType<typeof setTimeout> | null = null
const toastDrag = reactive({ startX: 0, startY: 0, x: 0, y: 0, active: false })

const toastStyle = computed(() => ({
  transform: `translate3d(${toastDrag.x}px, ${Math.min(0, toastDrag.y)}px, 0)`,
  opacity: String(Math.max(0.35, 1 - Math.min(160, Math.abs(toastDrag.x) + Math.max(0, -toastDrag.y)) / 210)),
  transition: toastDrag.active ? 'none' : 'transform 220ms ease, opacity 220ms ease',
}))

function resetToastDrag() {
  toastDrag.startX = 0
  toastDrag.startY = 0
  toastDrag.x = 0
  toastDrag.y = 0
  toastDrag.active = false
}

function dismissAddedToast() {
  addedMessage.value = ''
  resetToastDrag()
  if (addedTimer) {
    clearTimeout(addedTimer)
    addedTimer = null
  }
}

function onToastTouchStart(event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch) return
  toastDrag.startX = touch.clientX
  toastDrag.startY = touch.clientY
  toastDrag.active = true
}

function onToastTouchMove(event: TouchEvent) {
  const touch = event.touches[0]
  if (!touch || !toastDrag.active) return
  toastDrag.x = touch.clientX - toastDrag.startX
  toastDrag.y = touch.clientY - toastDrag.startY
}

function onToastTouchEnd() {
  const dismissHorizontal = Math.abs(toastDrag.x) > 52
  const dismissUp = toastDrag.y < -46
  if (dismissHorizontal || dismissUp) dismissAddedToast()
  else resetToastDrag()
}

async function addToBag() {
  const variant = matchedVariant.value
  if (!product.value || !variant || !canAddToBag.value || adding.value) return

  // Give immediate feedback at the exact button the customer used. The cart is
  // currently local-first, but keeping this as an async state also means a
  // future server-backed add can slot in here without changing the UI.
  adding.value = true
  justAdded.value = false
  await nextTick()

  cart.add({
    variantId: variant.id,
    productName: product.value.name,
    productSlug: product.value.slug,
    optionSummary: variant.option_summary,
    price: Number(displayPrice.value),
    imageUrl: imageUrl(galleryImages.value[0], 'card'),
    maxQuantity: maxPurchaseQuantity.value,
  }, quantity.value)

  // Keep the pending treatment visible long enough to register visually even
  // when the local cart update completes in a single frame.
  await new Promise(resolve => setTimeout(resolve, 360))

  adding.value = false
  justAdded.value = true
  resetToastDrag()
  addedMessage.value = 'Added to bag'

  if (justAddedTimer) clearTimeout(justAddedTimer)
  justAddedTimer = setTimeout(() => {
    justAdded.value = false
    justAddedTimer = null
  }, 900)

  if (addedTimer) clearTimeout(addedTimer)
  addedTimer = setTimeout(() => {
    addedMessage.value = ''
  }, 4200)
}

const wishlistBusy = ref(false)
const isWishlisted = ref(false)

async function checkWishlist() {
  if (!product.value || !customerToken.value) {
    isWishlisted.value = false
    return
  }

  try {
    const response = await $api<{ data: Array<{ product: { id: number } }> }>('/customer/wishlist')
    isWishlisted.value = response.data.some(item => item.product.id === product.value!.id)
  } catch {
    isWishlisted.value = false
  }
}

watch([product, customerToken], () => {
  void checkWishlist()
}, { immediate: true })

async function toggleWishlist() {
  if (!product.value) return

  if (!customerToken.value) {
    await navigateTo(`/login?redirect=${encodeURIComponent(`/products/${product.value.slug}`)}`)
    return
  }

  wishlistBusy.value = true

  try {
    if (isWishlisted.value) {
      await $api(`/customer/wishlist/${product.value.id}`, { method: 'DELETE' })
      isWishlisted.value = false
    } else {
      await $api('/customer/wishlist', {
        method: 'POST',
        body: { product_id: product.value.id },
      })
      isWishlisted.value = true
    }
  } finally {
    wishlistBusy.value = false
  }
}

const relatedProducts = ref<RelatedProduct[]>([])
const relatedPending = ref(false)

async function loadRelatedProducts() {
  const value = product.value
  const category = primaryCategory.value

  if (!value) {
    relatedProducts.value = []
    return
  }

  relatedPending.value = true

  try {
    const collected = new Map<number, RelatedProduct>()

    const collect = (items: RelatedProduct[]) => {
      for (const item of items) {
        if (item.id !== value.id && !collected.has(item.id)) {
          collected.set(item.id, item)
        }
      }
    }

    // First preference: pieces from the same catalogue category.
    if (category?.full_slug) {
      const categoryResponse = await $api<RelatedResponse>('/products', {
        query: {
          category: category.full_slug,
          per_page: 10,
          include_images: true,
        },
      })

      collect(categoryResponse.data)
    }

    // A small category may contain only the current product. Keep the
    // section useful by filling remaining slots from featured/newer pieces
    // rather than hiding the entire block.
    if (collected.size < 4) {
      const featuredResponse = await $api<RelatedResponse>('/products', {
        query: {
          featured: true,
          sort_by: 'latest',
          per_page: 10,
          include_images: true,
        },
      })
      collect(featuredResponse.data)
    }

    if (collected.size < 4) {
      const latestResponse = await $api<RelatedResponse>('/products', {
        query: {
          sort_by: 'latest',
          per_page: 12,
          include_images: true,
        },
      })
      collect(latestResponse.data)
    }

    relatedProducts.value = Array.from(collected.values()).slice(0, 4)
  } catch {
    relatedProducts.value = []
  } finally {
    relatedPending.value = false
  }
}

watch(product, () => {
  void loadRelatedProducts()
}, { immediate: true })
</script>

<template>
  <ProductDetailSkeleton v-if="pending && !product" />

  <main
    v-else-if="product"
    class="product-detail-page min-h-screen bg-paper-50 pb-24 lg:pb-0"
  >
    <div class="border-b border-charcoal-950/[0.07] px-4 py-3 sm:px-7 lg:px-10 xl:px-12">
      <nav class="shop-breadcrumb" aria-label="Breadcrumb">
        <NuxtLink to="/" class="shop-breadcrumb-link">
          <svg class="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25">
            <path d="M2.5 7.2 8 2.8l5.5 4.4v6H9.8V9.7H6.2v3.5H2.5v-6Z" />
          </svg>
          <span>Home</span>
        </NuxtLink>

        <svg class="shop-breadcrumb-separator" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.1">
          <path d="m4.3 2.6 3.4 3.4-3.4 3.4" />
        </svg>

        <NuxtLink to="/shop" class="shop-breadcrumb-link">Shop</NuxtLink>

        <template v-if="primaryCategory">
          <svg class="shop-breadcrumb-separator" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.1">
            <path d="m4.3 2.6 3.4 3.4-3.4 3.4" />
          </svg>
          <NuxtLink
            :to="categoryPath(primaryCategory.full_slug)"
            class="shop-breadcrumb-link"
          >
            {{ primaryCategory.name }}
          </NuxtLink>
        </template>

        <svg class="shop-breadcrumb-separator" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.1">
          <path d="m4.3 2.6 3.4 3.4-3.4 3.4" />
        </svg>
        <span class="shop-breadcrumb-current">{{ product.name }}</span>
      </nav>
    </div>

    <section class="lg:grid lg:grid-cols-[minmax(0,1.22fr)_minmax(410px,0.78fr)] xl:grid-cols-[minmax(0,1.28fr)_minmax(430px,0.72fr)]">
      <!-- Mobile swipe gallery -->
      <div class="relative lg:hidden">
        <div
          ref="galleryScroller"
          class="product-mobile-gallery flex snap-x snap-mandatory overflow-x-auto bg-mist-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          @scroll.passive="onGalleryScroll"
        >
          <button
            v-for="(image, index) in galleryImages"
            :key="image.id ?? imageUrl(image, 'detail') ?? index"
            type="button"
            class="relative aspect-[4/5] min-w-full snap-start overflow-hidden bg-mist-100"
            :aria-label="`Open image ${index + 1}`"
            @click="openZoom(image)"
          >
            <NuxtImg
              :src="imageUrl(image, 'detail')!"
              :alt="image.alt_text || product.name"
              class="absolute inset-0 h-full w-full object-cover"
              :loading="index === 0 ? 'eager' : 'lazy'"
            />
          </button>

          <div
            v-if="!galleryImages.length"
            class="aspect-[4/5] min-w-full bg-mist-100"
          />
        </div>

        <div
          v-if="galleryImages.length > 1"
          class="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center"
        >
          <div class="flex items-center gap-1.5 bg-paper-50/88 px-3 py-2 backdrop-blur-md">
            <button
              v-for="(_, index) in galleryImages"
              :key="index"
              type="button"
              class="pointer-events-auto h-1 transition-all duration-300"
              :class="currentImageIndex === index ? 'w-6 bg-charcoal-950' : 'w-2.5 bg-charcoal-950/25'"
              :aria-label="`View image ${index + 1}`"
              @click="scrollToImage(index)"
            />
          </div>
        </div>

        <span
          v-if="galleryImages.length > 1"
          class="absolute right-4 top-4 bg-paper-50/88 px-2.5 py-1.5 text-[9px] font-semibold tracking-[0.12em] text-charcoal-700 backdrop-blur-md"
        >
          {{ currentImageIndex + 1 }} / {{ galleryImages.length }}
        </span>
      </div>

      <!-- Desktop gallery: portrait-first editorial stage -->
      <div class="relative hidden overflow-hidden bg-mist-100 lg:block">
        <div class="product-desktop-gallery relative h-[min(70vh,700px)] min-h-[520px] overflow-hidden bg-mist-100 xl:h-[min(72vh,720px)] xl:min-h-[560px]">
          <div
            v-if="galleryImages.length > 1"
            class="absolute left-5 top-1/2 z-20 flex max-h-[calc(100%-88px)] -translate-y-1/2 flex-col gap-2 overflow-y-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:left-6"
            aria-label="Product gallery thumbnails"
          >
            <button
              v-for="(image, index) in galleryImages"
              :key="`desktop-thumb-${image.id ?? index}`"
              type="button"
              class="product-gallery-thumb group relative h-[72px] w-[54px] shrink-0 overflow-hidden bg-paper-50/70"
              :class="currentImageIndex === index ? 'is-active' : ''"
              :aria-label="`View image ${index + 1}`"
              :aria-current="currentImageIndex === index ? 'true' : undefined"
              @click="setGalleryImage(index)"
            >
              <NuxtImg
                :src="imageUrl(image, 'thumb') || imageUrl(image, 'detail')!"
                :alt="image.alt_text || `${product.name} image ${index + 1}`"
                class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                loading="lazy"
              />
              <span class="product-gallery-thumb-indicator" />
            </button>
          </div>

          <button
            v-if="desktopGalleryImage"
            type="button"
            class="group absolute inset-0 z-10 flex items-center justify-center overflow-hidden px-8 pb-16 pt-7 text-left focus:outline-none lg:pl-[92px] lg:pr-[92px] xl:pl-[104px] xl:pr-[104px]"
            :aria-label="`Open image ${currentImageIndex + 1}`"
            @click="openZoom(desktopGalleryImage)"
          >
            <div class="relative h-full w-full overflow-hidden">
              <Transition :name="galleryTransitionName">
                <NuxtImg
                  :key="desktopGalleryImage.id ?? imageUrl(desktopGalleryImage, 'detail') ?? currentImageIndex"
                  :src="imageUrl(desktopGalleryImage, 'detail')!"
                  :alt="desktopGalleryImage.alt_text || product.name"
                  class="absolute inset-0 h-full w-full object-contain"
                  :loading="currentImageIndex < 2 ? 'eager' : 'lazy'"
                  sizes="lg:46vw xl:48vw"
                />
              </Transition>
            </div>

            <span class="product-gallery-zoom absolute right-5 top-5 z-20 flex h-10 items-center gap-2 bg-paper-50/88 px-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-950 opacity-0 backdrop-blur-md transition duration-300 group-hover:opacity-100 xl:right-6 xl:top-6">
              <svg class="h-3.5 w-3.5" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2">
                <circle cx="8" cy="8" r="4.5" />
                <path d="m11.5 11.5 3.2 3.2M8 5.8v4.4M5.8 8h4.4" />
              </svg>
              View
            </span>
          </button>

          <div v-else class="absolute inset-0 bg-mist-100" />

          <template v-if="galleryImages.length > 1">
            <button
              type="button"
              class="product-gallery-arrow product-gallery-arrow-left absolute left-[82px] top-1/2 z-30 -translate-y-1/2 xl:left-[94px]"
              aria-label="Previous image"
              @click="stepGallery(-1)"
            >
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.25">
                <path d="m12.5 4.5-5.5 5.5 5.5 5.5" />
              </svg>
            </button>

            <button
              type="button"
              class="product-gallery-arrow product-gallery-arrow-right absolute right-5 top-1/2 z-30 -translate-y-1/2 xl:right-6"
              aria-label="Next image"
              @click="stepGallery(1)"
            >
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.25">
                <path d="m7.5 4.5 5.5 5.5-5.5 5.5" />
              </svg>
            </button>

            <div class="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex items-center justify-center xl:bottom-6">
              <div class="product-gallery-progress flex items-center gap-3 bg-paper-50/84 px-4 py-3 backdrop-blur-md">
                <span class="min-w-[40px] text-[9px] font-semibold tracking-[0.14em] text-charcoal-500">
                  {{ String(currentImageIndex + 1).padStart(2, '0') }} / {{ String(galleryImages.length).padStart(2, '0') }}
                </span>
                <div class="flex w-[118px] items-center gap-1">
                  <button
                    v-for="(_, index) in galleryImages"
                    :key="`gallery-progress-${index}`"
                    type="button"
                    class="pointer-events-auto h-px flex-1 bg-charcoal-950/18 transition-all duration-500"
                    :class="currentImageIndex === index ? '!h-[2px] !bg-charcoal-950' : 'hover:!bg-charcoal-950/45'"
                    :aria-label="`View image ${index + 1}`"
                    @click="setGalleryImage(index)"
                  />
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Purchase column -->
      <aside class="relative border-l border-charcoal-950/[0.06]">
        <div class="px-5 py-7 sm:px-8 sm:py-9 lg:sticky lg:top-[118px] lg:px-8 lg:py-9 xl:px-10">
          <div class="flex items-start justify-between gap-5">
            <div class="min-w-0">
              <p
                v-if="product.brand?.name"
                class="text-[9px] font-semibold uppercase tracking-[0.17em] text-charcoal-400"
              >
                {{ product.brand.name }}
              </p>

              <h1 class="mt-2 font-display text-[38px] font-medium leading-[0.94] tracking-[-0.035em] text-charcoal-950 sm:text-[44px] lg:text-[40px] xl:text-[46px]">
                {{ product.name }}
              </h1>
            </div>

            <button
              type="button"
              class="flex h-11 w-11 shrink-0 items-center justify-center border border-charcoal-950/[0.12] text-charcoal-700 transition hover:border-charcoal-950 hover:text-charcoal-950 disabled:opacity-45"
              :aria-label="isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'"
              :disabled="wishlistBusy"
              @click="toggleWishlist"
            >
              <svg
                class="h-[19px] w-[19px]"
                viewBox="0 0 24 24"
                :fill="isWishlisted ? 'currentColor' : 'none'"
                stroke="currentColor"
                stroke-width="1.35"
              >
                <path d="M12 20.5s-7.5-4.6-9.8-9.2C.6 7.8 2.3 4.5 5.6 4.1c2-.3 3.7.7 4.9 2.4C11.7 4.8 13.4 3.8 15.4 4.1c3.3.4 5 3.7 3.4 7.2C16.5 15.9 12 20.5 12 20.5Z" />
              </svg>
            </button>
          </div>

          <div v-if="displayPrice !== null" class="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span class="text-[15px] font-medium text-charcoal-950">{{ formatPrice(displayPrice) }}</span>
            <span v-if="isOnSale" class="text-[13px] text-charcoal-400 line-through">{{ formatPrice(originalPrice) }}</span>
            <span v-if="isOnSale" class="text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-500">Sale</span>
          </div>

          <p
            v-if="product.short_description"
            class="mt-5 max-w-xl text-[13px] leading-[1.7] text-charcoal-600 sm:text-[14px]"
          >
            {{ product.short_description }}
          </p>

          <div
            v-for="group in attributeGroups"
            :key="group.code"
            class="mt-8"
          >
            <div class="mb-3 flex items-center justify-between gap-4">
              <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-950">
                {{ group.name }}
              </p>
              <p class="text-[11px] text-charcoal-400">{{ selectedValueLabel(group.code) }}</p>
            </div>

            <div v-if="isColorGroup(group.code, group.name)" class="flex flex-wrap gap-2.5">
              <button
                v-for="value in group.values"
                :key="value.value_id"
                type="button"
                class="product-color-choice"
                :class="{
                  'is-selected': selected[group.code] === value.slug,
                  'is-unavailable': !choiceStatus(group.code, value.slug).available,
                }"
                :aria-pressed="selected[group.code] === value.slug"
                :disabled="!choiceStatus(group.code, value.slug).available"
                @click="selectValue(group.code, value.slug)"
              >
                <span
                  class="h-5 w-5 rounded-full border border-black/10"
                  :style="{ backgroundColor: value.color_code || '#d9d7cf' }"
                />
                <span>{{ value.value }}</span>
              </button>
            </div>

            <div v-else-if="isSizeGroup(group.code, group.name)" class="grid grid-cols-5 gap-2 sm:flex sm:flex-wrap">
              <button
                v-for="value in group.values"
                :key="value.value_id"
                type="button"
                class="product-size-choice"
                :class="{
                  'is-selected': selected[group.code] === value.slug,
                  'is-unavailable': !choiceStatus(group.code, value.slug).available,
                }"
                :aria-pressed="selected[group.code] === value.slug"
                :disabled="!choiceStatus(group.code, value.slug).available"
                @click="selectValue(group.code, value.slug)"
              >
                {{ value.value }}
              </button>
            </div>

            <div v-else class="flex flex-wrap gap-2">
              <button
                v-for="value in group.values"
                :key="value.value_id"
                type="button"
                class="product-option-choice"
                :class="{
                  'is-selected': selected[group.code] === value.slug,
                  'is-unavailable': !choiceStatus(group.code, value.slug).available,
                }"
                :aria-pressed="selected[group.code] === value.slug"
                :disabled="!choiceStatus(group.code, value.slug).available"
                @click="selectValue(group.code, value.slug)"
              >
                {{ value.value }}
              </button>
            </div>
          </div>

          <div class="mt-6 flex items-center justify-between gap-4 border-y border-charcoal-950/[0.07] py-4">
            <div class="flex items-center gap-2.5">
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="canAddToBag ? 'bg-[#657d6c]' : 'bg-charcoal-350'"
              />
              <span class="text-[11px] text-charcoal-600">{{ stockMessage }}</span>
            </div>
            <span v-if="matchedVariant?.sku" class="text-[9px] uppercase tracking-[0.12em] text-charcoal-350">{{ matchedVariant.sku }}</span>
          </div>

          <div class="mt-5 grid grid-cols-[auto_1fr] gap-2">
            <div class="flex min-h-[52px] items-center border border-charcoal-950/[0.14]">
              <button
                type="button"
                class="flex h-12 w-11 items-center justify-center text-charcoal-600 transition hover:text-charcoal-950 disabled:opacity-30"
                :disabled="quantity <= 1"
                aria-label="Decrease quantity"
                @click="decreaseQuantity"
              >
                −
              </button>
              <span class="w-7 text-center text-[12px] text-charcoal-950">{{ quantity }}</span>
              <button
                type="button"
                class="flex h-12 w-11 items-center justify-center text-charcoal-600 transition hover:text-charcoal-950 disabled:opacity-30"
                :disabled="maxPurchaseQuantity !== null && quantity >= maxPurchaseQuantity"
                aria-label="Increase quantity"
                @click="increaseQuantity"
              >
                +
              </button>
            </div>

            <button
              type="button"
              class="product-add-button min-h-[52px] bg-charcoal-950 px-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-50 hover:bg-charcoal-800 disabled:cursor-not-allowed disabled:opacity-45"
              :class="{ 'is-adding': adding, 'is-added': justAdded }"
              :disabled="!canAddToBag || adding"
              :aria-busy="adding"
              @click="addToBag"
            >
              <span class="product-add-button-content">
                <svg v-if="adding" class="product-add-spinner" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-opacity=".28" stroke-width="1.5" />
                  <path d="M9 2.5a6.5 6.5 0 0 1 6.5 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
                <svg v-else-if="justAdded" class="product-add-check" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="m4.5 9.2 2.8 2.8 6.2-6.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span>{{ !matchedVariant ? 'Select options' : canAddToBag ? (adding ? 'Adding…' : justAdded ? 'Added' : 'Add to bag') : 'Sold out' }}</span>
              </span>
              <span v-if="adding" class="product-add-progress" aria-hidden="true" />
            </button>
          </div>

          <div class="mt-8 border-t border-charcoal-950/[0.07]">
            <details v-if="product.description" class="product-detail-accordion group" open>
              <summary>
                <span>Details</span>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.15">
                  <path d="M8 3v10M3 8h10" />
                </svg>
              </summary>
              <div class="product-richtext pb-6 text-[13px] leading-[1.75] text-charcoal-600" v-html="product.description" />
            </details>

            <details v-if="product.care_instructions" class="product-detail-accordion group">
              <summary>
                <span>Care</span>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.15">
                  <path d="M8 3v10M3 8h10" />
                </svg>
              </summary>
              <div class="product-richtext pb-6 text-[13px] leading-[1.75] text-charcoal-600" v-html="product.care_instructions" />
            </details>

            <details class="product-detail-accordion group">
              <summary>
                <span>Delivery</span>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.15">
                  <path d="M8 3v10M3 8h10" />
                </svg>
              </summary>
              <div class="pb-6 text-[13px] leading-[1.75] text-charcoal-600">
                Delivery options and charges are calculated at checkout based on your address.
              </div>
            </details>
          </div>
        </div>
      </aside>
    </section>

    <!-- Related pieces -->
    <section
      v-if="relatedPending || relatedProducts.length"
      class="border-t border-charcoal-950/[0.07] px-4 py-14 sm:px-6 sm:py-16 lg:px-10 xl:px-12"
    >
      <div class="mb-7 flex items-end justify-between gap-5 sm:mb-9">
        <div>
          <p class="section-kicker">Continue exploring</p>
          <h2 class="mt-2 font-display text-[34px] font-medium leading-none tracking-[-0.03em] text-charcoal-950 sm:text-[42px]">
            You may also like
          </h2>
        </div>

        <NuxtLink
          v-if="primaryCategory"
          :to="categoryPath(primaryCategory.full_slug)"
          class="hidden border-b border-charcoal-950 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-950 sm:inline-flex"
        >
          View collection
        </NuxtLink>
      </div>

      <div class="grid grid-cols-2 gap-x-2.5 gap-y-9 sm:gap-x-4 md:grid-cols-4">
        <template v-if="relatedPending">
          <ProductCardSkeleton v-for="n in 4" :key="n" />
        </template>
        <template v-else>
          <ProductCard
            v-for="related in relatedProducts"
            :key="related.id"
            :product="related"
          />
        </template>
      </div>
    </section>

    <!-- Mobile sticky purchase bar -->
    <div class="fixed inset-x-0 bottom-0 z-30 border-t border-charcoal-950/[0.08] bg-paper-50/94 px-4 py-3 shadow-[0_-12px_35px_rgba(0,0,0,0.05)] backdrop-blur-xl lg:hidden">
      <div class="flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <p class="truncate text-[11px] font-medium text-charcoal-950">{{ product.name }}</p>
          <p class="mt-0.5 text-[11px] text-charcoal-500">{{ formatPrice(displayPrice) }}</p>
        </div>
        <button
          type="button"
          class="product-add-button min-h-12 min-w-[150px] bg-charcoal-950 px-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-paper-50 disabled:opacity-45"
          :class="{ 'is-adding': adding, 'is-added': justAdded }"
          :disabled="!canAddToBag || adding"
          :aria-busy="adding"
          @click="addToBag"
        >
          <span class="product-add-button-content">
            <svg v-if="adding" class="product-add-spinner" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-opacity=".28" stroke-width="1.5" />
              <path d="M9 2.5a6.5 6.5 0 0 1 6.5 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <svg v-else-if="justAdded" class="product-add-check" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="m4.5 9.2 2.8 2.8 6.2-6.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>{{ !matchedVariant ? 'Select options' : canAddToBag ? (adding ? 'Adding…' : justAdded ? 'Added' : 'Add to bag') : 'Sold out' }}</span>
          </span>
          <span v-if="adding" class="product-add-progress" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- Global add-to-bag confirmation: visible regardless of which purchase button was used -->
    <Teleport to="body">
      <Transition name="product-toast">
        <div
          v-if="addedMessage"
          class="product-added-toast-shell"
          role="status"
          aria-live="polite"
        >
          <div
            class="product-added-toast"
            :style="toastStyle"
            @touchstart.passive="onToastTouchStart"
            @touchmove.passive="onToastTouchMove"
            @touchend="onToastTouchEnd"
            @touchcancel="resetToastDrag"
          >
            <div class="flex min-w-0 items-center gap-3">
              <div class="relative h-[62px] w-[48px] shrink-0 overflow-hidden bg-mist-100">
                <NuxtImg
                  v-if="galleryImages[0]"
                  :src="imageUrl(galleryImages[0], 'thumb') || imageUrl(galleryImages[0], 'card') || imageUrl(galleryImages[0], 'detail')!"
                  :alt="product.name"
                  class="h-full w-full object-cover"
                />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="product-toast-check flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#657d6c] text-white">
                    <svg class="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.7">
                      <path d="m2.3 6.1 2.2 2.2 5.2-5" />
                    </svg>
                  </span>
                  <p class="text-[9px] font-semibold uppercase tracking-[0.15em] text-charcoal-500">Added to bag</p>
                </div>
                <p class="mt-1 truncate text-[12px] font-medium text-charcoal-950">{{ product.name }}</p>
                <p v-if="matchedVariant?.option_summary" class="mt-0.5 truncate text-[10px] text-charcoal-450">{{ matchedVariant.option_summary }}</p>
              </div>
            </div>

            <div class="mt-3 flex items-center justify-between border-t border-charcoal-950/[0.07] pt-3">
              <p class="text-[9px] text-charcoal-350 sm:hidden">Swipe up or sideways to dismiss</p>
              <NuxtLink
                to="/cart"
                class="ml-auto inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-950"
              >
                View bag
                <svg class="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25">
                  <path d="M3 8h10M10 5l3 3-3 3" />
                </svg>
              </NuxtLink>
            </div>

            <button
              type="button"
              class="absolute right-2 top-2 flex h-8 w-8 items-center justify-center text-charcoal-350 transition hover:text-charcoal-950"
              aria-label="Dismiss notification"
              @click="dismissAddedToast"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
                <path d="m4 4 8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Full-screen image slider / zoom -->
    <Teleport to="body">
      <Transition name="product-zoom">
        <div
          v-if="zoomOpen && zoomImage"
          class="fixed inset-0 z-[90] flex flex-col bg-charcoal-950/[0.985] text-paper-50"
          role="dialog"
          aria-modal="true"
          aria-label="Product image gallery"
          @click.self="closeZoom"
          @touchstart.passive="onZoomTouchStart"
          @touchend.passive="onZoomTouchEnd"
        >
          <div class="relative z-30 flex h-[68px] shrink-0 items-center justify-between border-b border-white/10 px-4 sm:h-[76px] sm:px-7">
            <div class="flex items-center gap-4">
              <span class="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/55">
                Gallery
              </span>
              <span
                v-if="galleryImages.length > 1"
                class="text-[10px] font-medium tracking-[0.12em] text-white/85"
              >
                {{ String(zoomImageIndex + 1).padStart(2, '0') }}
                <span class="mx-1 text-white/30">/</span>
                {{ String(galleryImages.length).padStart(2, '0') }}
              </span>
            </div>

            <button
              type="button"
              class="flex h-11 w-11 items-center justify-center rounded-full border border-white/18 bg-white/[0.04] text-white transition duration-300 hover:border-white/45 hover:bg-white/[0.08]"
              aria-label="Close image gallery"
              @click="closeZoom"
            >
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2">
                <path d="m5 5 10 10M15 5 5 15" />
              </svg>
            </button>
          </div>

          <div class="relative min-h-0 flex-1 overflow-hidden">
            <div class="absolute inset-0 flex items-center justify-center px-5 pb-24 pt-4 sm:px-20 sm:pb-28 sm:pt-6 lg:px-28 xl:px-36">
              <Transition :name="zoomTransitionName">
                <NuxtImg
                  :key="zoomImage.id ?? imageUrl(zoomImage, 'zoom') ?? zoomImageIndex"
                  :src="imageUrl(zoomImage, 'zoom') || imageUrl(zoomImage, 'detail')!"
                  :alt="zoomImage.alt_text || `${product.name} image ${zoomImageIndex + 1}`"
                  class="absolute max-h-[calc(100%-7rem)] max-w-[calc(100%-2rem)] select-none object-contain sm:max-h-[calc(100%-7.5rem)] sm:max-w-[calc(100%-9rem)] lg:max-w-[calc(100%-14rem)]"
                  draggable="false"
                />
              </Transition>
            </div>

            <template v-if="galleryImages.length > 1">
              <button
                type="button"
                class="absolute left-3 top-1/2 z-30 hidden h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-white/18 bg-black/10 text-white backdrop-blur-md transition duration-300 hover:border-white/45 hover:bg-white/[0.08] sm:flex lg:left-7"
                aria-label="Previous image"
                @click.stop="stepZoom(-1)"
              >
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.1">
                  <path d="m12.5 4.5-5.5 5.5 5.5 5.5" />
                </svg>
              </button>

              <button
                type="button"
                class="absolute right-3 top-1/2 z-30 hidden h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-white/18 bg-black/10 text-white backdrop-blur-md transition duration-300 hover:border-white/45 hover:bg-white/[0.08] sm:flex lg:right-7"
                aria-label="Next image"
                @click.stop="stepZoom(1)"
              >
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.1">
                  <path d="m7.5 4.5 5.5 5.5-5.5 5.5" />
                </svg>
              </button>

              <div class="absolute inset-x-0 bottom-0 z-30 border-t border-white/10 bg-charcoal-950/88 px-4 py-4 backdrop-blur-xl sm:px-7 sm:py-5">
                <div class="mx-auto flex max-w-3xl items-center gap-4">
                  <span class="hidden text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45 sm:block">
                    {{ zoomImageIndex + 1 }} of {{ galleryImages.length }}
                  </span>

                  <div class="flex min-w-0 flex-1 items-center gap-1.5">
                    <button
                      v-for="(image, index) in galleryImages"
                      :key="`zoom-progress-${image.id ?? index}`"
                      type="button"
                      class="group flex h-8 flex-1 items-center"
                      :aria-label="`View image ${index + 1}`"
                      :aria-current="zoomImageIndex === index ? 'true' : undefined"
                      @click.stop="setZoomImage(index)"
                    >
                      <span
                        class="block h-px w-full bg-white/20 transition-all duration-500 group-hover:bg-white/55"
                        :class="zoomImageIndex === index ? '!h-[2px] !bg-white' : ''"
                      />
                    </button>
                  </div>

                  <span class="shrink-0 text-[9px] font-medium uppercase tracking-[0.12em] text-white/40 sm:hidden">
                    Swipe
                  </span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
  </main>

  <main
    v-else
    class="flex min-h-[70vh] flex-col items-center justify-center bg-paper-50 px-5 text-center"
  >
    <p class="section-kicker">Product unavailable</p>
    <h1 class="mt-3 font-display text-[38px] font-medium tracking-[-0.035em] text-charcoal-950 sm:text-[48px]">
      This piece couldn't be found.
    </h1>
    <p class="mt-4 max-w-md text-[13px] leading-6 text-charcoal-500">
      It may have moved or no longer be available. You can return to the shop and continue exploring.
    </p>
    <div class="mt-7 flex items-center gap-5">
      <NuxtLink to="/shop" class="border-b border-charcoal-950 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-950">
        Back to shop
      </NuxtLink>
      <button
        v-if="error"
        type="button"
        class="border-b border-charcoal-400 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-500"
        @click="refresh()"
      >
        Try again
      </button>
    </div>
  </main>
</template>
