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
  grand_total: string | number
  placed_at: string | null
  items?: OrderItem[]
}

type Address = {
  id: number
  label: string | null
  recipient_name: string
  recipient_phone: string
  address_line1: string
  address_line2: string | null
  city_name: string | null
  state_name: string | null
  is_default: boolean
}

type WishlistEntry = { product: { id: number } }

const authStore = useAuthStore()
const { $api } = useNuxtApp()

const { data, pending, refresh } = await useAsyncData('account-overview-v2', async () => {
  const [orders, addresses, wishlist] = await Promise.all([
    $api<{ data: Order[], meta: { total: number } }>('/customer/orders', { query: { per_page: 3 } }),
    $api<{ data: Address[] }>('/customer/addresses'),
    $api<{ data: WishlistEntry[] }>('/customer/wishlist'),
  ])

  return { orders, addresses, wishlist }
})

const recentOrders = computed(() => data.value?.orders.data ?? [])
const orderCount = computed(() => data.value?.orders.meta.total ?? 0)
const addresses = computed(() => data.value?.addresses.data ?? [])
const defaultAddress = computed(() => addresses.value.find(address => address.is_default) ?? addresses.value[0] ?? null)
const wishlistCount = computed(() => data.value?.wishlist.data.length ?? 0)
const verificationComplete = computed(() => Boolean(
  authStore.customer?.email_verified
  && (!authStore.customer?.phone || authStore.customer?.phone_verified),
))

function money(value: string | number | null | undefined) {
  return `Rs ${Number(value || 0).toLocaleString('en-PK')}`
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function orderImage(order: Order) {
  const image = order.items?.[0]?.product_image
  return image?.optimized_urls?.thumb || image?.optimized_urls?.card || image?.image_url || null
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-4 border-b border-charcoal-950/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-[9px] font-semibold uppercase tracking-[0.18em] text-charcoal-400">Account overview</p>
        <h2 class="mt-2 font-display text-[38px] font-medium leading-none tracking-[-0.04em] text-charcoal-950 sm:text-[44px]">Your account.</h2>
      </div>
      <button
        type="button"
        :disabled="pending"
        class="self-start text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-500 underline decoration-charcoal-950/20 underline-offset-4 disabled:opacity-40 sm:self-auto"
        @click="refresh"
      >
        Refresh
      </button>
    </div>

    <div
      v-if="!verificationComplete"
      class="mt-6 grid gap-5 border border-[#b78b57]/30 bg-[#b78b57]/[0.06] p-5 sm:grid-cols-[1fr_auto] sm:items-center"
    >
      <div>
        <p class="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#89683f]">Account verification</p>
        <p class="mt-2 text-[12px] leading-5 text-charcoal-700">Complete your email or mobile verification to unlock the full sign-in and recovery experience.</p>
      </div>
      <NuxtLink to="/verify-account" class="inline-flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-950">
        Manage verification
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" class="h-4 w-4"><path d="M5 12h14M14 7l5 5-5 5" /></svg>
      </NuxtLink>
    </div>

    <div class="mt-8 grid border-y border-charcoal-950/10 sm:grid-cols-3">
      <NuxtLink to="/account/orders" class="group py-6 sm:border-r sm:border-charcoal-950/10 sm:px-6 first:sm:pl-0">
        <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Orders</p>
        <div class="mt-2 flex items-end justify-between gap-4">
          <p class="font-display text-[38px] leading-none tracking-[-0.04em] text-charcoal-950">{{ pending ? '—' : orderCount }}</p>
          <span class="text-[9px] uppercase tracking-[0.12em] text-charcoal-400 transition group-hover:text-charcoal-950">View history →</span>
        </div>
      </NuxtLink>
      <NuxtLink to="/account/addresses" class="group border-t border-charcoal-950/10 py-6 sm:border-r sm:border-t-0 sm:px-6">
        <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Addresses</p>
        <div class="mt-2 flex items-end justify-between gap-4">
          <p class="font-display text-[38px] leading-none tracking-[-0.04em] text-charcoal-950">{{ pending ? '—' : addresses.length }}</p>
          <span class="text-[9px] uppercase tracking-[0.12em] text-charcoal-400 transition group-hover:text-charcoal-950">Manage →</span>
        </div>
      </NuxtLink>
      <NuxtLink to="/account/wishlist" class="group border-t border-charcoal-950/10 py-6 sm:border-t-0 sm:pl-6">
        <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Saved pieces</p>
        <div class="mt-2 flex items-end justify-between gap-4">
          <p class="font-display text-[38px] leading-none tracking-[-0.04em] text-charcoal-950">{{ pending ? '—' : wishlistCount }}</p>
          <span class="text-[9px] uppercase tracking-[0.12em] text-charcoal-400 transition group-hover:text-charcoal-950">Open wishlist →</span>
        </div>
      </NuxtLink>
    </div>

    <div class="mt-12 grid gap-12 xl:grid-cols-[1.25fr_.75fr] xl:gap-16">
      <section>
        <div class="flex items-end justify-between border-b border-charcoal-950/10 pb-4">
          <div>
            <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Recent activity</p>
            <h3 class="mt-2 font-display text-[28px] font-medium tracking-[-0.03em] text-charcoal-950">Latest orders</h3>
          </div>
          <NuxtLink to="/account/orders" class="text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-500 underline decoration-charcoal-950/20 underline-offset-4">All orders</NuxtLink>
        </div>

        <div v-if="pending" class="divide-y divide-charcoal-950/10">
          <div v-for="n in 2" :key="n" class="flex gap-4 py-5">
            <div class="h-20 w-16 animate-pulse bg-charcoal-950/[0.05]" />
            <div class="flex-1 space-y-3 py-1"><div class="h-3 w-28 animate-pulse bg-charcoal-950/[0.05]" /><div class="h-3 w-44 animate-pulse bg-charcoal-950/[0.05]" /></div>
          </div>
        </div>

        <div v-else-if="recentOrders.length" class="divide-y divide-charcoal-950/10">
          <NuxtLink
            v-for="order in recentOrders"
            :key="order.order_number"
            :to="`/account/orders/${encodeURIComponent(order.order_number)}`"
            class="group grid grid-cols-[64px_minmax(0,1fr)_auto] gap-4 py-5 sm:grid-cols-[72px_minmax(0,1fr)_auto]"
          >
            <div class="aspect-[4/5] overflow-hidden bg-charcoal-950/[0.035]">
              <img v-if="orderImage(order)" :src="orderImage(order)!" :alt="order.items?.[0]?.product_name || 'Order item'" class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]">
            </div>
            <div class="min-w-0 self-center">
              <p class="text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-400">{{ formatDate(order.placed_at) }}</p>
              <p class="mt-1.5 truncate text-[12px] font-medium text-charcoal-950">{{ order.order_number }}</p>
              <p class="mt-1 text-[10px] text-charcoal-500">{{ order.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0 }} piece<span v-if="(order.items?.length || 0) !== 1">s</span></p>
            </div>
            <div class="flex flex-col items-end justify-center gap-2 text-right">
              <OrderStatusBadge :status="order.fulfillment_status" />
              <p class="text-[11px] text-charcoal-950">{{ money(order.grand_total) }}</p>
            </div>
          </NuxtLink>
        </div>

        <div v-else class="py-10">
          <p class="font-display text-[26px] tracking-[-0.03em] text-charcoal-950">No orders yet.</p>
          <p class="mt-2 max-w-md text-[11px] leading-5 text-charcoal-500">Your online orders will appear here once you find something worth keeping.</p>
          <NuxtLink to="/shop" class="mt-5 inline-flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-950">Explore the shop →</NuxtLink>
        </div>
      </section>

      <section>
        <div class="border-b border-charcoal-950/10 pb-4">
          <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Delivery</p>
          <h3 class="mt-2 font-display text-[28px] font-medium tracking-[-0.03em] text-charcoal-950">Default address</h3>
        </div>

        <div v-if="defaultAddress" class="py-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[12px] font-medium text-charcoal-950">{{ defaultAddress.label || 'Delivery address' }}</p>
              <p class="mt-2 text-[11px] leading-5 text-charcoal-500">
                {{ defaultAddress.recipient_name }} · {{ defaultAddress.recipient_phone }}<br>
                {{ defaultAddress.address_line1 }}<span v-if="defaultAddress.address_line2">, {{ defaultAddress.address_line2 }}</span><br>
                {{ defaultAddress.city_name }}<span v-if="defaultAddress.state_name">, {{ defaultAddress.state_name }}</span>
              </p>
            </div>
            <span v-if="defaultAddress.is_default" class="border border-[#657d6c]/25 bg-[#657d6c]/[0.08] px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#52685a]">Default</span>
          </div>
          <NuxtLink to="/account/addresses" class="mt-5 inline-flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-950">Manage addresses →</NuxtLink>
        </div>

        <div v-else-if="!pending" class="py-8">
          <p class="text-[11px] leading-5 text-charcoal-500">Save a delivery address to make your next checkout quicker.</p>
          <NuxtLink to="/account/addresses" class="mt-5 inline-flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-950">Add an address →</NuxtLink>
        </div>

        <div class="mt-4 border-t border-charcoal-950/10 pt-6">
          <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Need an order update?</p>
          <p class="mt-2 text-[11px] leading-5 text-charcoal-500">Guest orders and older orders can be checked using the order number and checkout phone.</p>
          <NuxtLink to="/track-order" class="mt-4 inline-flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-950">Track an order →</NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>
