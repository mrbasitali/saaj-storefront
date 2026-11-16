<script setup lang="ts">
import type { PriceChange } from '~/components/ReplacementPriceSummary.vue'
import type { ProductDetail } from '~/components/StorefrontProductDetail.vue'

type Line = { name: string; variant: string | null; quantity: number; unit_price: number; line_total: number }
type OrderSummary = { order_number: string; total: number; replacement?: Line; original?: Line; price_change?: PriceChange; email_sent?: boolean }
type ProductImage = { image_url: string; alt_text?: string | null; optimized_urls?: { card?: string; detail?: string; thumb?: string } }
type Choice = { id: number; label: string; price: number }
type CatalogueProduct = { id: number; name: string; slug: string; badges?: string[]; image: ProductImage | null; variants: Choice[] }
type Catalogue = {
  order: OrderSummary
  original: Line
  contact_url: string
  expires_at: string
  auto_cancel?: boolean
  products: CatalogueProduct[]
  page: number
  last_page: number
}
type Review = {
  review_key: string
  order_number: string
  original: Line
  replacement: Line
  other_items: Line[]
  price_change: PriceChange
  subtotal: number
  existing_coupon?: boolean
  discount_total: number
  tax_total: number
  shipping: number
  grand_total: number
}

definePageMeta({ key: route => route.fullPath })
useSeoMeta({ title: 'Choose a replacement | SAAJ', robots: 'noindex, nofollow' })
const { $api } = useNuxtApp()
const catalogue = ref<Catalogue>()
const review = ref<Review>()
const completed = ref<OrderSummary>()
const cancelled = ref(false)
const confirmingCancellation = ref(false)
const deadline = computed(() => {
  if (!catalogue.value?.expires_at) return ''
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(catalogue.value.expires_at))
})
const search = ref('')
const catalogueSearch = ref('')
const cardVariants = reactive<Record<number, number>>({})
const loadMoreSentinel = ref<HTMLElement>()
const loadMoreError = ref('')
const loadingMore = ref(false)
const hasMore = computed(() => !!catalogue.value && catalogue.value.page < catalogue.value.last_page)
const previewProduct = ref<CatalogueProduct>()
const previewDetail = ref<ProductDetail>()
const previewError = ref('')
const previewLoading = ref(false)
const catalogueScroll = ref<number | null>(null)
let previewRequest = 0
const ready = ref(false)
const busy = ref(false)
const closed = ref(false)
const error = ref('')
const selectedVariant = ref<number>()
const couponInput = ref('')
const couponApplied = ref('')
const couponPending = ref(false)
const reviewStale = ref(false)
const reviewHeading = ref<HTMLElement>()
let token = ''

usePrivateOrderLink(32, async (link) => {
  token = link.token
  if (token) {
    await loadCatalogue(1)
  } else {
    closed.value = true
    error.value = link.closed
      ? 'This replacement link is no longer available.'
      : 'Open the private replacement link from your email or text message.'
  }
  ready.value = true
})

function money(value: number) {
  return `Rs ${Number(value).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function closeExpiredLink(message: string) {
  closeLink()
  error.value = message
  resetProductPreview()
  closed.value = true
  review.value = undefined
  confirmingCancellation.value = false
}

function closeLink() {
  retirePrivateOrderLink(token)
  token = ''
}

async function fetchReplacement<T>(path: string, body: Record<string, unknown>) {
  const response = await $api<{ data: T }>(`/customer/order-replacement/${path}`, {
    method: 'POST',
    body: { ...body, token },
  })
  return response.data
}

async function request<T>(path: string, body: Record<string, unknown>, fallback: string) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    return await fetchReplacement<T>(path, body)
  } catch (cause: any) {
    error.value = extractApiErrorMessage(cause, fallback)
    if (Number(cause?.statusCode ?? cause?.response?.status) === 410) {
      closeExpiredLink(error.value)
    }
  } finally {
    busy.value = false
  }
}

async function loadCatalogue(page: number) {
  const data = await request<Catalogue>('catalogue', { page, search: catalogueSearch.value }, 'Could not load the replacement catalogue.')
  if (!data) return false
  loadMoreError.value = ''
  for (const id of Object.keys(cardVariants)) delete cardVariants[Number(id)]
  catalogue.value = data
  return true
}

async function loadMore() {
  const current = catalogue.value
  if (!current || !hasMore.value || busy.value || loadingMore.value || previewProduct.value) return

  loadMoreError.value = ''
  loadingMore.value = true
  try {
    const data = await fetchReplacement<Catalogue>('catalogue', { page: current.page + 1, search: catalogueSearch.value })
    if (catalogue.value !== current || closed.value) return

    const seen = new Set(current.products.map(product => product.id))
    catalogue.value = { ...data, products: [...current.products, ...data.products.filter(product => !seen.has(product.id))] }
  } catch (cause: any) {
    if (catalogue.value !== current || closed.value) return
    const message = extractApiErrorMessage(cause, 'Could not load more replacements.')
    if (Number(cause?.statusCode ?? cause?.response?.status) === 410) closeExpiredLink(message)
    else loadMoreError.value = message
  } finally {
    loadingMore.value = false
  }
}

watch([loadMoreSentinel, hasMore, busy, loadingMore, previewProduct, loadMoreError], ([sentinel, more, pending, loading, preview, failure], _, onCleanup) => {
  if (!sentinel || !more || pending || loading || preview || failure || typeof IntersectionObserver === 'undefined') return

  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) void loadMore()
  }, { rootMargin: '900px 0px' })
  observer.observe(sentinel)
  onCleanup(() => observer.disconnect())
}, { flush: 'post' })

function resetProductPreview() {
  previewRequest += 1
  previewProduct.value = undefined
  previewDetail.value = undefined
  previewLoading.value = false
}

async function openProduct(product: CatalogueProduct) {
  const sequence = ++previewRequest
  previewProduct.value = product
  previewDetail.value = undefined
  previewError.value = ''
  previewLoading.value = true
  catalogueScroll.value ??= window.scrollY
  window.scrollTo(0, 0)

  try {
    const data = await fetchReplacement<ProductDetail>('product', { product_id: product.id })
    if (sequence !== previewRequest) return

    previewDetail.value = data

  } catch (cause: any) {
    if (sequence !== previewRequest) return
    const message = extractApiErrorMessage(cause, 'Could not load the product details.')
    if (Number(cause?.statusCode ?? cause?.response?.status) === 410) closeExpiredLink(message)
    else previewError.value = message
  } finally {
    if (sequence === previewRequest) previewLoading.value = false
  }
}

async function backToCatalogue() {
  review.value = undefined
  couponInput.value = ''
  couponApplied.value = ''
  reviewStale.value = false
  resetProductPreview()
  error.value = ''
  const previousScroll = catalogueScroll.value
  catalogueScroll.value = null
  await nextTick()
  if (previousScroll !== null) window.scrollTo(0, previousScroll)
}

async function startSearch() {
  if (busy.value) return
  const previousSearch = catalogueSearch.value
  catalogueSearch.value = search.value.trim()
  if (!await loadCatalogue(1)) catalogueSearch.value = previousSearch
}

async function replaceProduct(product: CatalogueProduct) {
  const variant = product.variants.find(candidate => candidate.id === cardVariants[product.id]) ?? product.variants[0]
  if (variant) await reviewVariant(variant.id)
}

async function reviewVariant(variantId: number) {
  const data = await request<Review>('review', { variant_id: variantId }, 'Could not review this replacement.')
  if (!data) return
  if (!review.value) catalogueScroll.value ??= window.scrollY
  resetProductPreview()
  selectedVariant.value = variantId
  review.value = data
  couponInput.value = ''
  couponApplied.value = ''
  reviewStale.value = false
  await nextTick()
  window.scrollTo(0, 0)
  reviewHeading.value?.focus()
}

async function applyReplacementCoupon(code: string) {
  if (!selectedVariant.value || busy.value) return
  couponPending.value = true
  try {
    const data = await request<Review>('review', {
      variant_id: selectedVariant.value,
      coupon_code: code || undefined,
    }, 'Could not update the replacement total.')
    if (!data) return
    review.value = data
    couponInput.value = code
    couponApplied.value = code
    reviewStale.value = false
  } finally {
    couponPending.value = false
  }
}

async function confirm() {
  if (!review.value || !selectedVariant.value || busy.value || reviewStale.value) return
  const data = await request<OrderSummary>('confirm', {
    variant_id: selectedVariant.value,
    review_key: review.value.review_key,
    coupon_code: couponApplied.value || undefined,
  }, 'Could not update this order.')
  if (!data && review.value) reviewStale.value = true
  if (data) {
    completed.value = data
    review.value = undefined
    closeLink()
    await nextTick()
    reviewHeading.value?.focus()
  }
}
async function openCancellation() {
  confirmingCancellation.value = true
  error.value = ''
  await nextTick()
  reviewHeading.value?.focus()
}

async function cancelOrder() {
  if (!confirmingCancellation.value || busy.value) return
  const data = await request<OrderSummary>('cancel', { confirm_cancellation: true }, 'Could not cancel this order.')
  if (!data) return

  completed.value = data
  cancelled.value = true
  confirmingCancellation.value = false
  review.value = undefined
  closeLink()
  await nextTick()
  reviewHeading.value?.focus()
}
</script>

<template>
  <div :class="previewProduct && !closed ? 'min-h-[45vh]' : 'mx-auto min-h-[45vh] max-w-[1320px] px-5 py-12 sm:px-9 sm:py-16 lg:py-20'">
    <p v-if="!ready" role="status" class="text-sm text-charcoal-600">Opening your replacement link…</p>

    <section v-else-if="completed" class="mx-auto max-w-xl py-8">
      <h1 ref="reviewHeading" tabindex="-1" class="font-display text-5xl leading-tight">{{ cancelled ? 'Order cancelled' : 'Replacement confirmed' }}</h1>
      <p class="mt-4 text-charcoal-700">Order {{ completed.order_number }}</p>
      <ReplacementPriceSummary v-if="completed.price_change" class="mt-6" :change="completed.price_change" :total="completed.total" />
      <p v-else class="mt-5 border-y border-charcoal-950/15 py-4 text-lg font-semibold">{{ cancelled ? `Amount due · ${money(completed.total)}` : `Cash on delivery · ${money(completed.total)}` }}</p>
      <p v-if="completed.replacement" class="mt-4 text-sm text-charcoal-700">Replacement · {{ completed.replacement.name }} · Qty {{ completed.replacement.quantity }}</p>
      <p v-if="completed.email_sent" class="mt-3 text-sm text-charcoal-700">We sent a confirmation email with your updated order.</p>
    </section>

    <section v-else-if="closed || !catalogue" class="mx-auto max-w-xl">
      <h1 class="font-display text-5xl">Order replacement</h1>
      <p v-if="error" role="alert" class="mt-4 text-sm text-charcoal-700">{{ error }}</p>
      <a v-if="closed" :href="catalogue?.contact_url || '/#store-contact'" class="mt-6 inline-block text-sm font-semibold underline underline-offset-4">Contact SAAJ</a>
      <button v-else type="button" class="mt-6 text-sm font-semibold underline underline-offset-4" :disabled="busy" @click="loadCatalogue(1)">Try again</button>
    </section>

    <section v-else-if="confirmingCancellation" class="mx-auto max-w-xl">
      <h1 ref="reviewHeading" tabindex="-1" class="font-display text-5xl leading-tight">Cancel your order?</h1>
      <p class="mt-4 text-sm text-charcoal-700">This cancels all items in order {{ catalogue.order.order_number }} and clears the cash-on-delivery amount due.</p>
      <p v-if="error" role="alert" class="mt-4 text-sm text-rose-900 dark:text-rose-300">{{ error }}</p>
      <div class="mt-6 flex flex-wrap gap-3">
        <button type="button" class="min-h-11 bg-charcoal-950 px-5 text-sm font-semibold text-paper-50 disabled:opacity-50" :disabled="busy" @click="cancelOrder">Confirm cancellation</button>
        <button type="button" class="min-h-11 border border-charcoal-950/25 px-5 text-sm font-semibold" :disabled="busy" @click="confirmingCancellation = false; error = ''">Keep shopping</button>
      </div>
    </section>

    <section v-else-if="review" class="mx-auto max-w-2xl">
      <button type="button" class="mb-5 text-sm font-semibold underline underline-offset-4" :disabled="busy" @click="backToCatalogue">Back to catalogue</button>
      <h1 ref="reviewHeading" tabindex="-1" class="font-display text-5xl leading-tight">Review your replacement</h1>
      <p class="mt-3 text-sm text-charcoal-600">Order {{ review.order_number }}</p>
      <p v-if="deadline" class="mt-2 text-sm text-charcoal-700">
        {{ catalogue.auto_cancel ? 'Confirm by' : 'Link expires' }} {{ deadline }}{{ catalogue.auto_cancel ? ' to avoid automatic cancellation.' : '.' }}
      </p>

      <div class="mt-8 grid divide-y divide-charcoal-950/15 border-y border-charcoal-950/15 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div class="py-4 sm:pr-5">
          <p class="text-sm text-charcoal-600">Unavailable item</p>
          <p class="mt-1 font-semibold">{{ review.original.name }}</p>
          <p class="mt-1 text-sm">{{ review.original.variant }} · Qty {{ review.original.quantity }}</p>
        </div>
        <div class="py-4 sm:pl-5">
          <p class="text-sm text-charcoal-600">Your replacement</p>
          <p class="mt-1 font-semibold">{{ review.replacement.name }}</p>
          <p class="mt-1 text-sm">{{ review.replacement.variant }} · Qty {{ review.replacement.quantity }}</p>
          <p class="mt-1 text-sm">{{ money(review.replacement.line_total) }}</p>
        </div>
      </div>

      <div v-if="review.other_items.length" class="mt-5 space-y-2 text-sm">
        <h2 class="font-semibold">Other items in your order</h2>
        <div v-for="(item, index) in review.other_items" :key="index" class="flex justify-between gap-5">
          <span>{{ item.name }} · Qty {{ item.quantity }}</span><span class="shrink-0">{{ money(item.line_total) }}</span>
        </div>
      </div>

      <StorefrontCouponField
        v-if="!review.existing_coupon"
        v-model="couponInput"
        class="mt-6"
        :applied="couponApplied"
        :busy="couponPending"
        :disabled="busy && !couponPending"
        @apply="couponInput.trim() && applyReplacementCoupon(couponInput.trim().toUpperCase())"
        @remove="applyReplacementCoupon('')"
      />
      <ReplacementPriceSummary class="mt-6" :change="review.price_change" :total="review.grand_total" :shipping="review.shipping" />
      <p v-if="error" role="alert" class="mt-4 text-sm text-rose-900 dark:text-rose-300">{{ error }}</p>
      <div class="mt-6 flex flex-wrap gap-3">
        <button type="button" class="min-h-11 bg-charcoal-950 px-5 text-sm font-semibold text-paper-50 disabled:opacity-50" :disabled="busy || reviewStale" @click="confirm">{{ busy ? 'Updating your order…' : 'Confirm updated order' }}</button>
        <button type="button" class="min-h-11 border border-charcoal-950/25 px-5 text-sm font-semibold" :disabled="busy" @click="openCancellation">Cancel order</button>
        <button v-if="reviewStale && selectedVariant" type="button" class="min-h-11 border border-charcoal-950/25 px-5 text-sm font-semibold" :disabled="busy" @click="applyReplacementCoupon(couponApplied)">Refresh summary</button>
      </div>
    </section>

    <section v-else-if="previewProduct">
      <button v-if="!previewDetail" type="button" class="mb-4 min-h-10 text-sm font-semibold underline underline-offset-4" @click="backToCatalogue">Back to replacement catalogue</button>
      <p v-if="previewError" role="alert" class="mb-4 text-sm text-rose-900 dark:text-rose-300">{{ previewError }}</p>
      <StorefrontProductDetail
        :product="previewDetail"
        :slug="previewProduct.slug"
        :pending="previewLoading"
        :failed="!!previewError"
        :replacement-quantity="catalogue.original.quantity"
        :replacement-busy="busy"
        :replacement-error="error"
        @replace="reviewVariant"
        @back="backToCatalogue"
        @retry="openProduct(previewProduct)"
      />
    </section>

    <section v-else>
      <div class="flex flex-wrap items-end justify-between gap-5 border-b border-charcoal-950/15 pb-6">
        <div>
          <p class="text-sm text-charcoal-600">Order {{ catalogue.order.order_number }}</p>
          <h1 class="mt-2 font-display text-5xl leading-tight sm:text-6xl">Choose a replacement</h1>
          <p class="mt-3 text-sm text-charcoal-700">Replacing {{ catalogue.original.name }} · Quantity {{ catalogue.original.quantity }}</p>
        </div>
        <div class="flex flex-wrap gap-4">
          <a :href="catalogue.contact_url" class="text-sm font-semibold underline underline-offset-4">Contact SAAJ</a>
          <button type="button" class="text-sm font-semibold underline underline-offset-4" :disabled="busy" @click="openCancellation">Cancel order</button>
        </div>
      </div>
      <p v-if="deadline" class="mt-5 border-l-2 border-charcoal-950/35 pl-3 text-sm text-charcoal-700">
        {{ catalogue.auto_cancel ? 'Your order will automatically cancel if you haven’t confirmed a replacement by' : 'This link expires on' }}
        <time :datetime="catalogue.expires_at" class="font-semibold">{{ deadline }}</time>.
      </p>
      <form class="mt-6 flex max-w-lg gap-2" role="search" @submit.prevent="startSearch">
        <input v-model="search" type="search" maxlength="100" aria-label="Search replacement products" placeholder="Search products" class="placeholder:text-charcoal-500 min-h-11 min-w-0 flex-1 border border-charcoal-950/25 bg-transparent px-3 text-sm">
        <button type="submit" class="min-h-11 border border-charcoal-950/25 px-4 text-sm font-semibold disabled:opacity-50" :disabled="busy">Search</button>
      </form>
      <p v-if="error" role="alert" class="mt-4 text-sm text-rose-900 dark:text-rose-300">{{ error }}</p>
      <p v-if="!catalogue.products.length" class="mt-6 text-sm text-charcoal-600">No available replacements match this search.</p>

      <div v-else class="mt-7 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-6 md:grid-cols-3 lg:grid-cols-4" :aria-busy="busy">
        <article v-for="product in catalogue.products" :key="product.id" class="flex min-w-0 flex-col">
          <button type="button" :aria-label="`See ${product.name}`" :disabled="busy" class="group relative block aspect-[4/5] w-full overflow-hidden bg-paper-100" @click="openProduct(product)">
            <NuxtImg v-if="product.image" :src="product.image.optimized_urls?.card || product.image.image_url" alt="" loading="lazy" sizes="50vw md:33vw lg:25vw" class="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
            <ProductBadgeStack :badges="product.badges" class="absolute right-2 top-2" />
          </button>
          <h2 class="mt-3 flex-1 text-sm font-semibold">
            <button type="button" :disabled="busy" class="text-left hover:underline" @click="openProduct(product)">{{ product.name }}</button>
          </h2>
          <p v-if="product.variants.length" class="mt-2 text-sm text-charcoal-700">
            {{ product.variants.some(variant => variant.price !== product.variants[0]?.price) ? 'From ' : '' }}{{ money(Math.min(...product.variants.map(variant => variant.price))) }} per piece
          </p>
          <label v-if="product.variants.length > 1" class="mt-2 block text-xs text-charcoal-700">
            <span class="sr-only">Variant for {{ product.name }}</span>
            <select :value="cardVariants[product.id] ?? product.variants[0]?.id" class="min-h-10 w-full border border-charcoal-950/25 bg-paper-50 px-2 text-sm" @change="cardVariants[product.id] = Number(($event.target as HTMLSelectElement).value)">
              <option v-for="variant in product.variants" :key="variant.id" :value="variant.id">{{ variant.label }} · {{ money(variant.price) }}</option>
            </select>
          </label>
          <div class="mt-3 grid gap-2 sm:grid-cols-2">
            <button type="button" :aria-label="`View details for ${product.name}`" :disabled="busy" class="min-h-11 border border-charcoal-950/25 px-2 text-xs font-semibold hover:bg-paper-100 disabled:opacity-50" @click="openProduct(product)">View details</button>
            <button type="button" :aria-label="`Replace with ${product.name}`" :disabled="busy || !product.variants.length" class="min-h-11 bg-charcoal-950 px-2 text-xs font-semibold text-paper-50 disabled:opacity-50" @click="replaceProduct(product)">Replace</button>
          </div>
        </article>
      </div>

      <div v-if="hasMore" ref="loadMoreSentinel" class="h-px w-full" aria-hidden="true" />
      <div v-if="hasMore" class="mt-8 text-center text-sm">
        <p v-if="loadingMore" role="status">Loading more pieces…</p>
        <template v-else>
          <p v-if="loadMoreError" role="alert" class="mb-2 text-rose-900 dark:text-rose-300">{{ loadMoreError }}</p>
          <button type="button" class="min-h-11 border border-charcoal-950/25 px-4 font-semibold disabled:opacity-50" :disabled="busy" @click="loadMore">{{ loadMoreError ? 'Try loading more again' : 'Load more pieces' }}</button>
        </template>
      </div>
    </section>
  </div>
</template>
