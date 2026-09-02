<script setup lang="ts">
type OrderImage = {
  image_url?: string | null
  optimized_urls?: { thumb?: string | null, card?: string | null } | null
}

type OrderItem = {
  product_name: string | null
  product_slug?: string | null
  product_image?: OrderImage | null
  variant_options?: string | null
  quantity: number
}

type Order = {
  order_number: string
  fulfillment_status: string
  payment_status: string
  grand_total: string | number
  placed_at: string | null
  items: OrderItem[]
}

type OrdersResponse = {
  data: Order[]
  meta: { current_page: number, last_page: number, total: number }
}

const { $api } = useNuxtApp()

const { data, pending, error, refresh } = await useAsyncData('account-orders-v2', () =>
  $api<OrdersResponse>('/customer/orders', { query: { page: 1, per_page: 12 } }),
)

const orders = ref<Order[]>([])
const currentPage = ref(1)
const lastPage = ref(1)
const total = ref(0)
const loadingMore = ref(false)

watch(data, (value) => {
  if (!value) return
  orders.value = value.data
  currentPage.value = value.meta.current_page
  lastPage.value = value.meta.last_page
  total.value = value.meta.total
}, { immediate: true })

const canLoadMore = computed(() => currentPage.value < lastPage.value)

async function loadMore() {
  if (!canLoadMore.value || loadingMore.value) return
  loadingMore.value = true

  try {
    const next = await $api<OrdersResponse>('/customer/orders', {
      query: { page: currentPage.value + 1, per_page: 12 },
    })

    orders.value.push(...next.data)
    currentPage.value = next.meta.current_page
    lastPage.value = next.meta.last_page
    total.value = next.meta.total
  } finally {
    loadingMore.value = false
  }
}

function money(value: string | number) {
  return `Rs ${Number(value || 0).toLocaleString('en-PK')}`
}

const { formatDate: formatStorefrontDate } = useStorefrontDateTime()

function formatDate(value: string | null) {
  return value ? formatStorefrontDate(value, { month: 'long' }) : 'Date unavailable'
}

function itemCount(order: Order) {
  return order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
}

function imageUrl(item?: OrderItem) {
  const image = item?.product_image
  return image?.optimized_urls?.thumb || image?.optimized_urls?.card || image?.image_url || null
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-3 border-b border-charcoal-950/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-[9px] font-semibold uppercase tracking-[0.18em] text-charcoal-400">Order history</p>
        <h2 class="mt-2 font-display text-[38px] font-medium tracking-[-0.04em] text-charcoal-950 sm:text-[44px]">Orders</h2>
        <p class="mt-2 text-[11px] text-charcoal-500">{{ pending ? 'Loading your orders…' : `${total} online order${total === 1 ? '' : 's'}` }}</p>
      </div>
      <NuxtLink to="/track-order" class="inline-flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-950">
        Track another order
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" class="h-4 w-4"><path d="M5 12h14M14 7l5 5-5 5" /></svg>
      </NuxtLink>
    </div>

    <div v-if="pending" class="divide-y divide-charcoal-950/10">
      <div v-for="n in 4" :key="n" class="grid grid-cols-[72px_1fr] gap-4 py-6 sm:grid-cols-[90px_1fr_auto]">
        <div class="aspect-[4/5] animate-pulse bg-charcoal-950/[0.05]" />
        <div class="space-y-3 py-2"><div class="h-3 w-32 animate-pulse bg-charcoal-950/[0.05]" /><div class="h-3 w-48 animate-pulse bg-charcoal-950/[0.05]" /><div class="h-3 w-24 animate-pulse bg-charcoal-950/[0.05]" /></div>
      </div>
    </div>

    <div v-else-if="error" class="py-12">
      <p class="font-display text-[30px] tracking-[-0.035em] text-charcoal-950">We couldn’t load your orders.</p>
      <p class="mt-2 text-[11px] text-charcoal-500">Try the request again in a moment.</p>
      <button type="button" class="mt-5 text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-950 underline underline-offset-4" @click="refresh">Try again</button>
    </div>

    <div v-else-if="orders.length" class="divide-y divide-charcoal-950/10">
      <NuxtLink
        v-for="order in orders"
        :key="order.order_number"
        :to="`/account/orders/${encodeURIComponent(order.order_number)}`"
        class="group grid gap-5 py-6 sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:items-center"
      >
        <div class="relative aspect-[4/5] w-[84px] overflow-hidden bg-charcoal-950/[0.035] sm:w-[92px]">
          <img
            v-if="imageUrl(order.items[0])"
            :src="imageUrl(order.items[0])!"
            :alt="order.items[0]?.product_name || 'Order item'"
            class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
          >
          <div v-if="order.items.length > 1" class="absolute bottom-1.5 right-1.5 bg-charcoal-950 px-2 py-1 text-[8px] font-semibold tracking-[0.08em] text-paper-50">+{{ order.items.length - 1 }}</div>
        </div>

        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-3">
            <p class="text-[12px] font-medium text-charcoal-950">{{ order.order_number }}</p>
            <OrderStatusBadge :status="order.fulfillment_status" />
          </div>
          <p class="mt-2 text-[10px] uppercase tracking-[0.08em] text-charcoal-400">{{ formatDate(order.placed_at) }}</p>
          <p class="mt-2 line-clamp-1 text-[11px] text-charcoal-500">
            {{ itemCount(order) }} piece<span v-if="itemCount(order) !== 1">s</span>
            <template v-if="order.items[0]?.product_name"> · {{ order.items[0].product_name }}</template>
          </p>
        </div>

        <div class="flex items-center justify-between gap-6 sm:flex-col sm:items-end sm:justify-center">
          <p class="font-display text-[25px] tracking-[-0.03em] text-charcoal-950">{{ money(order.grand_total) }}</p>
          <span class="text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-400 transition group-hover:text-charcoal-950">View order →</span>
        </div>
      </NuxtLink>

      <div v-if="canLoadMore" class="pt-8 text-center">
        <button
          type="button"
          :disabled="loadingMore"
          class="min-w-[190px] border border-charcoal-950 px-7 py-3.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-charcoal-950 transition hover:bg-charcoal-950 hover:text-paper-50 disabled:opacity-45"
          @click="loadMore"
        >
          {{ loadingMore ? 'Loading…' : 'Load more orders' }}
        </button>
      </div>
    </div>

    <div v-else class="py-14">
      <p class="font-display text-[34px] tracking-[-0.04em] text-charcoal-950">Your order history is empty.</p>
      <p class="mt-3 max-w-lg text-[11px] leading-5 text-charcoal-500">When you place an online order, its delivery progress and full details will live here.</p>
      <NuxtLink to="/shop" class="mt-6 inline-flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-950">Explore SAAJ →</NuxtLink>
    </div>
  </div>
</template>
