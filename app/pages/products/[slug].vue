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

type ProductResponse = {
  data: ProductDetail
  preview?: { expires_at?: string | null }
}

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
const siteSettings = useSiteSettingsStore()
const customerToken = useCookie<string | null>('saaj_customer_token')

const slug = computed(() => String(route.params.slug || ''))
const previewToken = computed(() => {
  const value = route.query.preview
  return typeof value === 'string' ? value.trim() : ''
})
const isPreviewMode = computed(() => previewToken.value !== '')

const stackedGalleryEnabled = computed(() => siteSettings.settings?.storefront?.stacked_product_gallery_enabled ?? false)
const editorialGalleryPaddingEnabled = computed(() => siteSettings.settings?.storefront?.editorial_gallery_padding_enabled ?? true)
const directBuyNowEnabled = computed(() => siteSettings.settings?.storefront?.direct_buy_now_enabled ?? false)

// Product data is SEO-critical, so wait for it during SSR. Draft preview uses
// a separate token-protected API endpoint and a separate async-data key so a
// preview response can never be confused with the public product response.
const { data, pending, error, refresh } = await useAsyncData<ProductResponse>(
  () => `product-${slug.value}-${isPreviewMode.value ? 'preview' : 'public'}`,
  () => isPreviewMode.value
    ? $api<ProductResponse>(`/products/${encodeURIComponent(slug.value)}`, {
        query: { preview: previewToken.value },
      })
    : $api<ProductResponse>(`/products/${encodeURIComponent(slug.value)}`),
  { watch: [slug, previewToken] },
)

const product = computed(() => data.value?.data ?? null)

// Do not render a soft-404 product page with a 200 response. Search engines
// should receive the actual upstream status when a product does not exist.
if (import.meta.server && error.value) {
  const upstreamStatus = Number((error.value as any)?.statusCode || (error.value as any)?.status || 500)
  const previewDenied = isPreviewMode.value && [401, 403, 410].includes(upstreamStatus)
  throw createError({
    statusCode: upstreamStatus === 404 ? 404 : previewDenied ? 403 : 502,
    statusMessage: upstreamStatus === 404
      ? 'Product not found'
      : previewDenied
        ? 'Product preview unavailable'
        : 'Product service unavailable',
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
  if (!value || isPreviewMode.value) return null

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
  title: () => isPreviewMode.value
    ? `Preview · ${product.value?.name || 'Product'} | SAAJ`
    : product.value?.meta_title || (product.value ? `${product.value.name} | SAAJ` : 'Product | SAAJ'),
  description: () => productSeoDescription.value,
  robots: () => isPreviewMode.value
    ? 'noindex,nofollow,noarchive,nosnippet'
    : 'index,follow,max-image-preview:large',
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
  script: isPreviewMode.value
    ? []
    : [
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

// Gallery position tracking. Mobile uses the horizontal scroller's active
// image, while desktop editorial mode tracks whichever stacked image is
// closest to the visual center of the viewport.
const editorialStackItems = ref<Array<HTMLElement | null>>([])
let editorialStackFrame: number | null = null

function setEditorialStackItem(element: unknown, index: number) {
  if (!import.meta.client) return

  editorialStackItems.value[index] = element instanceof HTMLElement ? element : null
  scheduleEditorialStackIndexUpdate()
}

function updateEditorialStackIndex() {
  editorialStackFrame = null
  if (!import.meta.client || !stackedGalleryEnabled.value || window.innerWidth < 1024) return

  if (!editorialStackItems.value.some(Boolean)) return

  // Slightly above the mathematical center feels more natural because the
  // storefront header occupies the top edge of the viewport.
  const focusY = Math.max(150, Math.min(window.innerHeight * 0.46, window.innerHeight - 150))
  let nearestIndex = 0
  let nearestDistance = Number.POSITIVE_INFINITY

  editorialStackItems.value.forEach((item, index) => {
    if (!item) return

    const rect = item.getBoundingClientRect()
    const center = rect.top + (rect.height / 2)
    const distance = Math.abs(center - focusY)

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = index
    }
  })

  if (currentImageIndex.value !== nearestIndex) {
    currentImageIndex.value = nearestIndex
  }
}

function scheduleEditorialStackIndexUpdate() {
  if (!import.meta.client || !stackedGalleryEnabled.value || window.innerWidth < 1024 || editorialStackFrame !== null) return
  editorialStackFrame = window.requestAnimationFrame(updateEditorialStackIndex)
}

function scrollToEditorialImage(index: number) {
  if (!import.meta.client) return
  const target = editorialStackItems.value[index]
  if (!target) return

  const headerOffset = 104
  const top = window.scrollY + target.getBoundingClientRect().top - headerOffset
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}

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
const zoomScale = ref(1)
const zoomPanX = ref(0)
const zoomPanY = ref(0)
const zoomDragging = ref(false)
const zoomPointerId = ref<number | null>(null)
const zoomDragStartX = ref(0)
const zoomDragStartY = ref(0)
const zoomDragPanX = ref(0)
const zoomDragPanY = ref(0)
const zoomPointers = new Map<number, { x: number, y: number }>()
let zoomPinchStartDistance = 0
let zoomPinchStartScale = 1
const ZOOM_MIN = 1
const ZOOM_MAX = 3
const ZOOM_STEP = 0.25
const zoomImage = computed(() => galleryImages.value[zoomImageIndex.value] ?? null)
const zoomTransitionName = computed(() => zoomMotion.value === 'previous' ? 'product-gallery-previous' : 'product-gallery-next')
const zoomPercent = computed(() => Math.round(zoomScale.value * 100))
const canZoomIn = computed(() => zoomScale.value < ZOOM_MAX)
const canZoomOut = computed(() => zoomScale.value > ZOOM_MIN)
const zoomImageStyle = computed(() => ({
  transform: `translate3d(${zoomPanX.value}px, ${zoomPanY.value}px, 0) scale(${zoomScale.value})`,
  transition: zoomDragging.value ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
  cursor: zoomScale.value > 1 ? (zoomDragging.value ? 'grabbing' : 'grab') : 'zoom-in',
}))

function constrainZoomPan() {
  if (zoomScale.value <= 1 || !import.meta.client) {
    zoomPanX.value = 0
    zoomPanY.value = 0
    return
  }

  const scaleExtra = zoomScale.value - 1
  const maxX = Math.max(80, window.innerWidth * scaleExtra * 0.42)
  const maxY = Math.max(80, window.innerHeight * scaleExtra * 0.42)
  zoomPanX.value = Math.max(-maxX, Math.min(maxX, zoomPanX.value))
  zoomPanY.value = Math.max(-maxY, Math.min(maxY, zoomPanY.value))
}

function resetZoomView() {
  zoomScale.value = 1
  zoomPanX.value = 0
  zoomPanY.value = 0
  zoomDragging.value = false
  zoomPointerId.value = null
  zoomPointers.clear()
  zoomPinchStartDistance = 0
  zoomPinchStartScale = 1
}

function setZoomScale(value: number) {
  zoomScale.value = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(value * 100) / 100))
  if (zoomScale.value <= 1) {
    zoomPanX.value = 0
    zoomPanY.value = 0
  } else {
    constrainZoomPan()
  }
}

function zoomIn() {
  setZoomScale(zoomScale.value + ZOOM_STEP)
}

function zoomOut() {
  setZoomScale(zoomScale.value - ZOOM_STEP)
}

function onZoomWheel(event: WheelEvent) {
  if (event.deltaY < 0) zoomIn()
  else if (event.deltaY > 0) zoomOut()
}

function pointerDistance(points: Array<{ x: number, y: number }>) {
  if (points.length < 2) return 0
  return Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)
}

function onZoomPointerDown(event: PointerEvent) {
  zoomPointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

  if (event.pointerType === 'touch' && zoomPointers.size >= 2) {
    ;(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId)
    zoomDragging.value = false
    zoomPointerId.value = null
    zoomPinchStartDistance = pointerDistance(Array.from(zoomPointers.values()).slice(0, 2))
    zoomPinchStartScale = zoomScale.value
    return
  }

  // Do not capture a normal 1x pointer. Pointer capture retargets the
  // generated click to the gallery viewport, which prevents the image's
  // click-to-zoom handler from firing. Capture is only needed while panning.
  if (zoomScale.value <= 1) return

  ;(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId)
  zoomDragging.value = true
  zoomPointerId.value = event.pointerId
  zoomDragStartX.value = event.clientX
  zoomDragStartY.value = event.clientY
  zoomDragPanX.value = zoomPanX.value
  zoomDragPanY.value = zoomPanY.value
}

function onZoomPointerMove(event: PointerEvent) {
  if (zoomPointers.has(event.pointerId)) {
    zoomPointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  }

  if (event.pointerType === 'touch' && zoomPointers.size >= 2) {
    const distance = pointerDistance(Array.from(zoomPointers.values()).slice(0, 2))
    if (zoomPinchStartDistance > 0 && distance > 0) {
      setZoomScale(zoomPinchStartScale * (distance / zoomPinchStartDistance))
    }
    return
  }

  if (!zoomDragging.value || zoomPointerId.value !== event.pointerId) return
  zoomPanX.value = zoomDragPanX.value + (event.clientX - zoomDragStartX.value)
  zoomPanY.value = zoomDragPanY.value + (event.clientY - zoomDragStartY.value)
  constrainZoomPan()
}

function onZoomPointerEnd(event: PointerEvent) {
  zoomPointers.delete(event.pointerId)

  if (zoomPointerId.value === event.pointerId) {
    zoomDragging.value = false
    zoomPointerId.value = null
  }

  if (zoomPointers.size < 2) {
    zoomPinchStartDistance = 0
    zoomPinchStartScale = zoomScale.value
  }

  const target = event.currentTarget as HTMLElement | null
  if (target?.hasPointerCapture?.(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
  }
}

function zoomAtPoint(clientX: number, clientY: number) {
  if (!import.meta.client) return

  if (zoomScale.value > 1) {
    resetZoomView()
    return
  }

  setZoomScale(2)
  const offsetX = (window.innerWidth / 2 - clientX) * 0.38
  const offsetY = (window.innerHeight / 2 - clientY) * 0.38
  zoomPanX.value = offsetX
  zoomPanY.value = offsetY
  constrainZoomPan()
}

function onZoomImageClick(event: MouseEvent) {
  zoomAtPoint(event.clientX, event.clientY)
}

function setZoomImage(index: number) {
  const count = galleryImages.value.length
  if (!count) return

  const nextIndex = Math.min(Math.max(index, 0), count - 1)
  if (nextIndex === zoomImageIndex.value) return

  resetZoomView()
  zoomMotion.value = nextIndex > zoomImageIndex.value ? 'next' : 'previous'
  zoomImageIndex.value = nextIndex
  currentImageIndex.value = nextIndex
}

function stepZoom(direction: 1 | -1) {
  const count = galleryImages.value.length
  if (count < 2) return

  resetZoomView()
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
  resetZoomView()
  zoomOpen.value = true
}

function closeZoom() {
  zoomOpen.value = false
  zoomTouchStartX.value = null
  resetZoomView()
}

function onZoomTouchStart(event: TouchEvent) {
  if (zoomScale.value > 1) {
    zoomTouchStartX.value = null
    return
  }
  zoomTouchStartX.value = event.changedTouches[0]?.clientX ?? null
}

function onZoomTouchEnd(event: TouchEvent) {
  if (zoomScale.value > 1 || zoomTouchStartX.value == null) return

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

  if (event.key === '+' || event.key === '=') {
    event.preventDefault()
    zoomIn()
    return
  }

  if (event.key === '-' || event.key === '_') {
    event.preventDefault()
    zoomOut()
    return
  }

  if (event.key === '0') {
    event.preventDefault()
    resetZoomView()
    return
  }

  if (zoomScale.value === 1 && event.key === 'ArrowRight') {
    event.preventDefault()
    stepZoom(1)
  }

  if (zoomScale.value === 1 && event.key === 'ArrowLeft') {
    event.preventDefault()
    stepZoom(-1)
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', scheduleEditorialStackIndexUpdate, { passive: true })
  window.addEventListener('resize', scheduleEditorialStackIndexUpdate, { passive: true })
  nextTick(() => scheduleEditorialStackIndexUpdate())
})

watch([stackedGalleryEnabled, () => galleryImages.value.length], () => {
  if (!import.meta.client) return
  editorialStackItems.value = editorialStackItems.value.slice(0, galleryImages.value.length)
  nextTick(() => scheduleEditorialStackIndexUpdate())
})

watch(zoomOpen, (open) => {
  if (!import.meta.client) return
  document.body.style.overflow = open ? 'hidden' : ''
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('scroll', scheduleEditorialStackIndexUpdate)
    window.removeEventListener('resize', scheduleEditorialStackIndexUpdate)

    if (editorialStackFrame !== null) {
      window.cancelAnimationFrame(editorialStackFrame)
      editorialStackFrame = null
    }
  }

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

const canAddToBag = computed(() => !isPreviewMode.value && !!matchedVariant.value && matchedVariant.value.is_available !== false)

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
const buyingNow = ref(false)
const justAdded = ref(false)
const addedDrawerOpen = ref(false)

const purchaseBusy = computed(() => adding.value || buyingNow.value)

const addToBagLabel = computed(() => {
  if (isPreviewMode.value) return 'Preview only'
  if (!matchedVariant.value) return 'Select options'
  if (!canAddToBag.value) return 'Sold out'
  if (adding.value) return 'Adding…'
  if (justAdded.value) return 'Added'
  return 'Add to bag'
})

const buyNowLabel = computed(() => {
  if (isPreviewMode.value) return 'Preview only'
  if (!matchedVariant.value) return 'Select options'
  if (!canAddToBag.value) return 'Sold out'
  if (buyingNow.value) return 'Preparing…'
  return 'Buy now'
})

let justAddedTimer: ReturnType<typeof setTimeout> | null = null

function closeAddedDrawer() {
  addedDrawerOpen.value = false
}

async function continueToCart() {
  addedDrawerOpen.value = false
  await navigateTo('/cart')
}

function addSelectedVariantToCart() {
  const variant = matchedVariant.value
  const currentProduct = product.value

  if (!currentProduct || !variant) return false

  cart.add({
    variantId: variant.id,
    productName: currentProduct.name,
    productSlug: currentProduct.slug,
    optionSummary: variant.option_summary,
    price: Number(displayPrice.value),
    imageUrl: imageUrl(galleryImages.value[0], 'card'),
    maxQuantity: maxPurchaseQuantity.value,
  }, quantity.value)

  return true
}

async function addToBag() {
  if (!canAddToBag.value || purchaseBusy.value) return

  adding.value = true
  justAdded.value = false
  await nextTick()

  if (!addSelectedVariantToCart()) {
    adding.value = false
    return
  }

  // The cart store is local and effectively immediate. A short progress
  // state makes the action feel intentional and avoids accidental double taps.
  await new Promise(resolve => setTimeout(resolve, 260))

  adding.value = false
  justAdded.value = true
  addedDrawerOpen.value = true

  if (justAddedTimer) clearTimeout(justAddedTimer)
  justAddedTimer = setTimeout(() => {
    justAdded.value = false
    justAddedTimer = null
  }, 900)
}

async function buyNow() {
  if (!directBuyNowEnabled.value || !canAddToBag.value || purchaseBusy.value) return

  buyingNow.value = true
  justAdded.value = false
  addedDrawerOpen.value = false
  await nextTick()

  if (!addSelectedVariantToCart()) {
    buyingNow.value = false
    return
  }

  // Buy now uses the exact same cart contract as normal shopping, but skips
  // the confirmation drawer and moves directly into the existing checkout.
  await new Promise(resolve => setTimeout(resolve, 220))
  buyingNow.value = false
  await navigateTo('/checkout')
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
  if (isPreviewMode.value) return
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
    <div
      v-if="isPreviewMode"
      class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[#181b18] px-4 py-2.5 text-center text-[#f7f6f2]"
    >
      <span class="text-[9px] font-semibold uppercase tracking-[0.16em]">Preview mode</span>
      <span class="hidden h-3 w-px bg-white/20 sm:block" />
      <span class="text-[10px] text-white/65">This product is not public. Shopping actions are disabled.</span>
    </div>
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

    <section
      class="lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(450px,0.92fr)] xl:grid-cols-[minmax(0,1.04fr)_minmax(520px,0.96fr)]"
      :class="{ 'product-editorial-layout': stackedGalleryEnabled }"
    >
      <!-- Mobile swipe gallery. Editorial mode keeps the familiar initial
           product image size; the sticky/overlap effect begins only as the
           customer scrolls into the product information. -->
      <div
        class="relative overflow-clip lg:hidden"
        :class="{ 'product-editorial-mobile-media': stackedGalleryEnabled }"
      >
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

        <!-- Minimal gallery position markers. The active image stretches into
             a short pill so the shopper immediately understands there is more
             content without covering the photography. -->
        <nav
          v-if="galleryImages.length > 1"
          class="product-mobile-gallery-indicators absolute bottom-4 left-1/2 z-30"
          aria-label="Product images"
        >
          <button
            v-for="(_, index) in galleryImages"
            :key="`mobile-gallery-indicator-${index}`"
            type="button"
            class="product-gallery-indicator"
            :class="{ 'is-active': currentImageIndex === index }"
            :aria-label="`Show image ${index + 1} of ${galleryImages.length}`"
            :aria-current="currentImageIndex === index ? 'true' : undefined"
            @click="scrollToImage(index)"
          >
            <span />
          </button>
        </nav>
      </div>

      <!-- Desktop editorial gallery: full-bleed stacked images + sticky purchase panel -->
      <div v-if="stackedGalleryEnabled" class="product-editorial-stack relative hidden bg-mist-100 lg:block">
        <div
          v-if="galleryImages.length > 1"
          class="product-editorial-stack-indicator-layer"
        >
          <nav
            class="product-editorial-stack-indicators"
            aria-label="Product images"
          >
            <button
              v-for="(_, index) in galleryImages"
              :key="`editorial-gallery-indicator-${index}`"
              type="button"
              class="product-gallery-indicator product-gallery-indicator-vertical"
              :class="{ 'is-active': currentImageIndex === index }"
              :aria-label="`Scroll to image ${index + 1} of ${galleryImages.length}`"
              :aria-current="currentImageIndex === index ? 'true' : undefined"
              @click="scrollToEditorialImage(index)"
            >
              <span />
            </button>
          </nav>
        </div>

        <button
          v-for="(image, index) in galleryImages"
          :key="`editorial-${image.id ?? imageUrl(image, 'detail') ?? index}`"
          :ref="(element) => setEditorialStackItem(element, index)"
          type="button"
          class="product-editorial-stack-image group relative block w-full overflow-hidden bg-mist-100"
          :class="editorialGalleryPaddingEnabled
            ? 'is-padded h-[min(78vh,760px)] min-h-[560px] xl:h-[min(80vh,820px)] xl:min-h-[600px]'
            : 'is-full-bleed'"
          :aria-label="`Open image ${index + 1} of ${galleryImages.length}`"
          @click="openZoom(image)"
        >
          <NuxtImg
            :src="imageUrl(image, 'detail')!"
            :alt="image.alt_text || `${product.name} image ${index + 1}`"
            class="product-editorial-stack-photo transition-transform duration-700 ease-out"
            :class="editorialGalleryPaddingEnabled ? 'group-hover:scale-[1.006]' : ''"
            :loading="index < 2 ? 'eager' : 'lazy'"
            sizes="lg:54vw xl:52vw"
          />
          <span class="product-editorial-stack-counter">
            {{ String(index + 1).padStart(2, '0') }} / {{ String(galleryImages.length).padStart(2, '0') }}
          </span>
          <span class="product-editorial-stack-zoom" aria-hidden="true">
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.2">
              <circle cx="8" cy="8" r="4.5" />
              <path d="m11.5 11.5 3.2 3.2M8 5.8v4.4M5.8 8h4.4" />
            </svg>
          </span>
        </button>

        <div v-if="!galleryImages.length" class="h-[min(78vh,760px)] min-h-[560px] bg-mist-100 xl:h-[min(80vh,820px)] xl:min-h-[600px]" />
      </div>

      <!-- Classic desktop gallery: current Saaj gallery, preserved when editorial mode is off -->
      <div v-else class="relative hidden overflow-hidden bg-mist-100 lg:block">
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

            <div
              class="product-desktop-gallery-line pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[2px] bg-charcoal-950/10"
              aria-hidden="true"
            >
              <span
                class="block h-full bg-charcoal-950 transition-transform duration-500 ease-out"
                :style="{
                  width: `${100 / galleryImages.length}%`,
                  transform: `translateX(${currentImageIndex * 100}%)`,
                }"
              />
            </div>
          </template>
        </div>
      </div>

      <!-- Purchase column -->
      <aside
        class="relative border-l border-charcoal-950/[0.06] bg-paper-50"
        :class="{ 'product-editorial-purchase': stackedGalleryEnabled }"
      >
        <div
          class="px-5 py-7 sm:px-8 sm:py-9 lg:px-8 lg:py-9 xl:px-10"
          :class="stackedGalleryEnabled ? '' : 'lg:sticky lg:top-[118px]'"
        >
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
              class="product-wishlist-button shrink-0 text-charcoal-700 disabled:opacity-45"
              :class="{ 'is-active': isWishlisted }"
              :aria-label="isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'"
              :aria-pressed="isWishlisted"
              :disabled="wishlistBusy || isPreviewMode"
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

          <div class="mt-5 flex items-center justify-between gap-4 lg:hidden">
            <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-500">Quantity</span>
            <div class="flex min-h-[46px] items-center border border-charcoal-950/[0.14]">
              <button
                type="button"
                class="flex h-11 w-10 items-center justify-center text-charcoal-600 transition hover:text-charcoal-950 disabled:opacity-30"
                :disabled="quantity <= 1"
                aria-label="Decrease quantity"
                @click="decreaseQuantity"
              >
                −
              </button>
              <span class="w-7 text-center text-[12px] text-charcoal-950">{{ quantity }}</span>
              <button
                type="button"
                class="flex h-11 w-10 items-center justify-center text-charcoal-600 transition hover:text-charcoal-950 disabled:opacity-30"
                :disabled="maxPurchaseQuantity !== null && quantity >= maxPurchaseQuantity"
                aria-label="Increase quantity"
                @click="increaseQuantity"
              >
                +
              </button>
            </div>
          </div>

          <div
            class="mt-5 hidden gap-2 lg:grid"
            :class="directBuyNowEnabled
              ? 'grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]'
              : 'grid-cols-[auto_minmax(0,1fr)]'"
          >
            <div class="flex min-h-[52px] items-center border border-charcoal-950/[0.14]">
              <button
                type="button"
                class="flex h-12 w-11 items-center justify-center text-charcoal-600 transition hover:text-charcoal-950 disabled:opacity-30"
                :disabled="quantity <= 1 || purchaseBusy"
                aria-label="Decrease quantity"
                @click="decreaseQuantity"
              >
                −
              </button>
              <span class="w-7 text-center text-[12px] text-charcoal-950">{{ quantity }}</span>
              <button
                type="button"
                class="flex h-12 w-11 items-center justify-center text-charcoal-600 transition hover:text-charcoal-950 disabled:opacity-30"
                :disabled="purchaseBusy || (maxPurchaseQuantity !== null && quantity >= maxPurchaseQuantity)"
                aria-label="Increase quantity"
                @click="increaseQuantity"
              >
                +
              </button>
            </div>

            <button
              type="button"
              class="product-add-button min-h-[52px] px-5 text-[10px] font-semibold uppercase tracking-[0.15em] disabled:cursor-not-allowed disabled:opacity-45"
              :class="[
                { 'is-adding': adding, 'is-added': justAdded, 'is-secondary': directBuyNowEnabled },
                directBuyNowEnabled
                  ? 'border border-charcoal-950/[0.16] bg-transparent text-charcoal-950 hover:border-charcoal-950 hover:bg-charcoal-950/[0.035]'
                  : 'bg-charcoal-950 text-paper-50 hover:bg-charcoal-800',
              ]"
              :disabled="!canAddToBag || purchaseBusy"
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
                <span>{{ addToBagLabel }}</span>
              </span>
              <span v-if="adding" class="product-add-progress" aria-hidden="true" />
            </button>

            <button
              v-if="directBuyNowEnabled"
              type="button"
              class="product-add-button min-h-[52px] bg-charcoal-950 px-5 text-[10px] font-semibold uppercase tracking-[0.15em] text-paper-50 hover:bg-charcoal-800 disabled:cursor-not-allowed disabled:opacity-45"
              :class="{ 'is-adding': buyingNow }"
              :disabled="!canAddToBag || purchaseBusy"
              :aria-busy="buyingNow"
              @click="buyNow"
            >
              <span class="product-add-button-content">
                <svg v-if="buyingNow" class="product-add-spinner" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-opacity=".28" stroke-width="1.5" />
                  <path d="M9 2.5a6.5 6.5 0 0 1 6.5 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
                <span>{{ buyNowLabel }}</span>
              </span>
              <span v-if="buyingNow" class="product-add-progress" aria-hidden="true" />
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

    <!-- Mobile sticky purchase bar. This is the only mobile purchase CTA;
         there is no duplicate inline Add to bag / Buy now button. -->
    <div class="product-mobile-purchase fixed inset-x-0 bottom-0 z-30 border-t border-charcoal-950/[0.08] bg-paper-50/94 px-4 py-3 shadow-[0_-12px_35px_rgba(0,0,0,0.05)] backdrop-blur-xl lg:hidden">
      <div v-if="directBuyNowEnabled" class="space-y-2.5">
        <div class="flex min-w-0 items-center justify-between gap-4">
          <p class="min-w-0 truncate text-[11px] font-medium text-charcoal-950">{{ product.name }}</p>
          <p class="shrink-0 text-[11px] text-charcoal-500">{{ formatPrice(displayPrice) }}</p>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="product-add-button is-secondary min-h-12 border border-charcoal-950/[0.16] bg-transparent px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-charcoal-950 disabled:opacity-45"
            :class="{ 'is-adding': adding, 'is-added': justAdded }"
            :disabled="!canAddToBag || purchaseBusy"
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
              <span>{{ addToBagLabel }}</span>
            </span>
            <span v-if="adding" class="product-add-progress" aria-hidden="true" />
          </button>

          <button
            type="button"
            class="product-add-button min-h-12 bg-charcoal-950 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-paper-50 disabled:opacity-45"
            :class="{ 'is-adding': buyingNow }"
            :disabled="!canAddToBag || purchaseBusy"
            :aria-busy="buyingNow"
            @click="buyNow"
          >
            <span class="product-add-button-content">
              <svg v-if="buyingNow" class="product-add-spinner" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-opacity=".28" stroke-width="1.5" />
                <path d="M9 2.5a6.5 6.5 0 0 1 6.5 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
              <span>{{ buyNowLabel }}</span>
            </span>
            <span v-if="buyingNow" class="product-add-progress" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div v-else class="flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <p class="truncate text-[11px] font-medium text-charcoal-950">{{ product.name }}</p>
          <p class="mt-0.5 text-[11px] text-charcoal-500">{{ formatPrice(displayPrice) }}</p>
        </div>
        <button
          type="button"
          class="product-add-button min-h-12 min-w-[150px] bg-charcoal-950 px-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-paper-50 disabled:opacity-45"
          :class="{ 'is-adding': adding, 'is-added': justAdded }"
          :disabled="!canAddToBag || purchaseBusy"
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
            <span>{{ addToBagLabel }}</span>
          </span>
          <span v-if="adding" class="product-add-progress" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- Add-to-bag confirmation: desktop side drawer, mobile/PWA draggable bottom sheet -->
    <AddedToBagDrawer
      :open="addedDrawerOpen"
      :product-name="product.name"
      :option-summary="matchedVariant?.option_summary"
      :image-url="galleryImages[0] ? (imageUrl(galleryImages[0], 'card') || imageUrl(galleryImages[0], 'detail')) : null"
      :quantity="quantity"
      :price="formatPrice(displayPrice)"
      @close="closeAddedDrawer"
      @view-cart="continueToCart"
    />

    <!-- Full-screen image slider / zoom -->
    <Teleport to="body">
      <Transition name="product-zoom">
        <div
          v-if="zoomOpen && zoomImage"
          class="fixed inset-0 z-[90] flex flex-col bg-[#0f110f]/[0.985] text-[#f7f6f2]"
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

            <div class="flex items-center gap-2">
              <div class="flex h-11 items-center overflow-hidden rounded-full border border-white/18 bg-white/[0.04] backdrop-blur-md">
                <button
                  type="button"
                  class="flex h-11 w-11 items-center justify-center text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:text-white/25"
                  :disabled="!canZoomOut"
                  aria-label="Zoom out"
                  @click.stop="zoomOut"
                >
                  <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.25">
                    <circle cx="8.5" cy="8.5" r="5" />
                    <path d="M5.8 8.5h5.4M12.2 12.2l3.2 3.2" />
                  </svg>
                </button>

                <button
                  type="button"
                  class="min-w-[54px] border-x border-white/10 px-2 text-[9px] font-semibold tracking-[0.1em] text-white/75 transition hover:bg-white/[0.06] hover:text-white"
                  :aria-label="`Reset zoom, currently ${zoomPercent}%`"
                  @click.stop="resetZoomView"
                >
                  {{ zoomPercent }}%
                </button>

                <button
                  type="button"
                  class="flex h-11 w-11 items-center justify-center text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:text-white/25"
                  :disabled="!canZoomIn"
                  aria-label="Zoom in"
                  @click.stop="zoomIn"
                >
                  <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.25">
                    <circle cx="8.5" cy="8.5" r="5" />
                    <path d="M5.8 8.5h5.4M8.5 5.8v5.4M12.2 12.2l3.2 3.2" />
                  </svg>
                </button>
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
          </div>

          <div class="relative min-h-0 flex-1 overflow-hidden">
            <div
              class="absolute inset-0 flex touch-none items-center justify-center overflow-hidden px-5 pb-32 pt-4 sm:px-20 sm:pb-36 sm:pt-6 lg:px-28 xl:px-36"
              @wheel.prevent="onZoomWheel"
              @pointerdown="onZoomPointerDown"
              @pointermove="onZoomPointerMove"
              @pointerup="onZoomPointerEnd"
              @pointercancel="onZoomPointerEnd"
            >
              <Transition :name="zoomTransitionName">
                <div
                  :key="zoomImage.id ?? imageUrl(zoomImage, 'zoom') ?? zoomImageIndex"
                  class="absolute inset-0 flex items-center justify-center px-5 pb-32 pt-4 sm:px-20 sm:pb-36 sm:pt-6 lg:px-28 xl:px-36"
                >
                  <NuxtImg
                    :src="imageUrl(zoomImage, 'zoom') || imageUrl(zoomImage, 'detail')!"
                    :alt="zoomImage.alt_text || `${product.name} image ${zoomImageIndex + 1}`"
                    class="max-h-[calc(100%-7rem)] max-w-[calc(100%-2rem)] select-none object-contain will-change-transform sm:max-h-[calc(100%-7.5rem)] sm:max-w-[calc(100%-9rem)] lg:max-w-[calc(100%-14rem)]"
                    :style="zoomImageStyle"
                    draggable="false"
                    @click.stop="onZoomImageClick"
                  />
                </div>
              </Transition>

              <div
                class="pointer-events-none absolute bottom-[7.5rem] left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[8px] font-medium uppercase tracking-[0.12em] text-white/55 backdrop-blur-md transition-opacity sm:bottom-[8.5rem]"
                :class="zoomScale > 1 ? 'opacity-100' : 'opacity-0'"
              >
                Drag to inspect · pinch, wheel or tap to zoom
              </div>
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

              <div class="absolute inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0f110f]/92 px-3 py-3 backdrop-blur-xl sm:px-7 sm:py-4">
                <div class="mx-auto flex max-w-4xl items-center gap-3 sm:gap-4">
                  <div class="hidden w-[72px] shrink-0 sm:block">
                    <p class="text-[8px] font-semibold uppercase tracking-[0.14em] text-white/35">Image</p>
                    <p class="mt-1 text-[10px] font-medium tracking-[0.12em] text-white/80">
                      {{ String(zoomImageIndex + 1).padStart(2, '0') }} / {{ String(galleryImages.length).padStart(2, '0') }}
                    </p>
                  </div>

                  <div class="product-zoom-thumbnails min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div class="flex w-max min-w-full items-center justify-center gap-2">
                      <button
                        v-for="(image, index) in galleryImages"
                        :key="`zoom-thumb-${image.id ?? index}`"
                        type="button"
                        class="product-zoom-thumbnail group relative h-[58px] w-[46px] shrink-0 overflow-hidden bg-white/[0.06] sm:h-[68px] sm:w-[54px]"
                        :class="zoomImageIndex === index ? 'is-active' : ''"
                        :aria-label="`View image ${index + 1}`"
                        :aria-current="zoomImageIndex === index ? 'true' : undefined"
                        @click.stop="setZoomImage(index)"
                      >
                        <NuxtImg
                          :src="imageUrl(image, 'thumb') || imageUrl(image, 'detail')!"
                          :alt="image.alt_text || `${product.name} image ${index + 1}`"
                          class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
                          loading="lazy"
                        />
                      </button>
                    </div>
                  </div>

                  <span class="shrink-0 text-[8px] font-medium uppercase tracking-[0.12em] text-white/35 sm:hidden">
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
