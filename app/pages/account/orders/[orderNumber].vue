<script setup lang="ts">
type OrderImage = {
  image_url?: string | null
  optimized_urls?: { thumb?: string | null, card?: string | null } | null
}

type StatusEntry = { status: string, note: string | null, at: string | null }
type OrderItem = {
  product_id?: number | null
  product_name: string | null
  product_slug?: string | null
  product_image?: OrderImage | null
  variant_options: string | null
  sku: string | null
  quantity: number
  unit_price: string | number
  line_total: string | number
}

type Order = {
  order_number: string
  status: string
  fulfillment_status: string
  payment_method: string
  payment_status: string
  items: OrderItem[]
  subtotal: string | number
  discount_total: string | number
  tax_total: string | number
  shipping_cost: string | number
  grand_total: string | number
  shipping: {
    recipient_name: string
    recipient_phone: string
    address_line1: string
    address_line2: string | null
    city: string | null
    state: string | null
    postal_code: string | null
  }
  tracking_number: string | null
  shipping_carrier: string | null
  status_history: StatusEntry[]
  placed_at: string | null
}

const route = useRoute()
const { $api } = useNuxtApp()
const orderNumber = computed(() => String(route.params.orderNumber || ''))

useSeoMeta({
  title: computed(() => `${orderNumber.value} | My Account | SAAJ`),
  robots: 'noindex,nofollow',
})

const { data, pending, error, refresh } = await useAsyncData(
  () => `account-order-${orderNumber.value}`,
  () => $api<{ data: Order }>(`/customer/orders/${encodeURIComponent(orderNumber.value)}`),
)

const order = computed(() => data.value?.data ?? null)

function money(value: string | number | null | undefined) {
  return `Rs ${Number(value || 0).toLocaleString('en-PK')}`
}

function formatDate(value: string | null, withTime = false) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-PK', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(new Date(value))
}

function imageUrl(item: OrderItem) {
  const image = item.product_image
  return image?.optimized_urls?.thumb || image?.optimized_urls?.card || image?.image_url || null
}

function paymentLabel(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase())
}
</script>

<template>
  <div>
    <NuxtLink to="/account/orders" class="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-500 transition hover:text-charcoal-950">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" class="h-4 w-4"><path d="M19 12H5M10 7l-5 5 5 5" /></svg>
      All orders
    </NuxtLink>

    <div v-if="pending" class="mt-7">
      <div class="h-10 w-64 animate-pulse bg-charcoal-950/[0.05]" />
      <div class="mt-4 h-4 w-40 animate-pulse bg-charcoal-950/[0.05]" />
      <div class="mt-10 grid gap-10 xl:grid-cols-[1.15fr_.85fr]">
        <div class="h-72 animate-pulse bg-charcoal-950/[0.04]" />
        <div class="h-72 animate-pulse bg-charcoal-950/[0.04]" />
      </div>
    </div>

    <div v-else-if="error || !order" class="mt-10 border-t border-charcoal-950/10 py-12">
      <p class="font-display text-[34px] tracking-[-0.04em] text-charcoal-950">We couldn’t open this order.</p>
      <p class="mt-3 text-[11px] text-charcoal-500">It may no longer be available, or the request may have failed.</p>
      <button type="button" class="mt-5 text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-950 underline underline-offset-4" @click="refresh">Try again</button>
    </div>

    <template v-else>
      <header class="mt-6 border-b border-charcoal-950/10 pb-7">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-[9px] font-semibold uppercase tracking-[0.18em] text-charcoal-400">Order</p>
            <h2 class="mt-2 font-display text-[38px] font-medium tracking-[-0.04em] text-charcoal-950 sm:text-[46px]">{{ order.order_number }}</h2>
            <p class="mt-2 text-[10px] uppercase tracking-[0.09em] text-charcoal-400">Placed {{ formatDate(order.placed_at, true) }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <OrderStatusBadge :status="order.fulfillment_status" />
            <span class="border border-charcoal-950/10 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-charcoal-500">{{ paymentLabel(order.payment_status) }}</span>
          </div>
        </div>
      </header>

      <div class="mt-10 grid gap-12 xl:grid-cols-[1.12fr_.88fr] xl:gap-16">
        <div class="min-w-0">
          <section>
            <div class="flex items-end justify-between border-b border-charcoal-950/10 pb-4">
              <div>
                <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Your pieces</p>
                <h3 class="mt-2 font-display text-[28px] tracking-[-0.03em] text-charcoal-950">Order contents</h3>
              </div>
              <p class="text-[9px] uppercase tracking-[0.11em] text-charcoal-400">{{ order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) }} pieces</p>
            </div>

            <div class="divide-y divide-charcoal-950/10">
              <div v-for="(item, index) in order.items" :key="`${item.sku || item.product_name}-${index}`" class="grid grid-cols-[76px_minmax(0,1fr)_auto] gap-4 py-5 sm:grid-cols-[88px_minmax(0,1fr)_auto]">
                <NuxtLink v-if="item.product_slug" :to="`/products/${item.product_slug}`" class="aspect-[4/5] overflow-hidden bg-charcoal-950/[0.035]">
                  <img v-if="imageUrl(item)" :src="imageUrl(item)!" :alt="item.product_name || 'Product'" class="h-full w-full object-cover transition duration-500 hover:scale-[1.025]">
                </NuxtLink>
                <div v-else class="aspect-[4/5] bg-charcoal-950/[0.035]">
                  <img v-if="imageUrl(item)" :src="imageUrl(item)!" :alt="item.product_name || 'Product'" class="h-full w-full object-cover">
                </div>

                <div class="min-w-0 self-center">
                  <NuxtLink v-if="item.product_slug" :to="`/products/${item.product_slug}`" class="text-[12px] font-medium text-charcoal-950 hover:underline hover:underline-offset-4">{{ item.product_name }}</NuxtLink>
                  <p v-else class="text-[12px] font-medium text-charcoal-950">{{ item.product_name }}</p>
                  <p v-if="item.variant_options" class="mt-1 text-[10px] text-charcoal-400">{{ item.variant_options }}</p>
                  <p v-if="item.sku" class="mt-2 text-[8px] uppercase tracking-[0.1em] text-charcoal-300">SKU {{ item.sku }}</p>
                  <p class="mt-2 text-[10px] text-charcoal-500">Qty {{ item.quantity }} · {{ money(item.unit_price) }} each</p>
                </div>

                <p class="self-center text-[11px] text-charcoal-950">{{ money(item.line_total) }}</p>
              </div>
            </div>
          </section>

          <section class="mt-12">
            <div class="border-b border-charcoal-950/10 pb-4">
              <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Progress</p>
              <h3 class="mt-2 font-display text-[28px] tracking-[-0.03em] text-charcoal-950">Order journey</h3>
            </div>
            <div class="py-7">
              <OrderTimeline :entries="order.status_history" :current-status="order.fulfillment_status" />
            </div>
          </section>
        </div>

        <aside class="min-w-0 xl:border-l xl:border-charcoal-950/10 xl:pl-10">
          <section class="border-b border-charcoal-950/10 pb-7">
            <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Order summary</p>
            <div class="mt-5 space-y-3 text-[11px]">
              <div class="flex items-center justify-between gap-5"><span class="text-charcoal-500">Subtotal</span><span class="text-charcoal-950">{{ money(order.subtotal) }}</span></div>
              <div v-if="Number(order.discount_total)" class="flex items-center justify-between gap-5"><span class="text-charcoal-500">Discount</span><span class="text-charcoal-950">−{{ money(order.discount_total) }}</span></div>
              <div v-if="Number(order.tax_total)" class="flex items-center justify-between gap-5"><span class="text-charcoal-500">Tax</span><span class="text-charcoal-950">{{ money(order.tax_total) }}</span></div>
              <div class="flex items-center justify-between gap-5"><span class="text-charcoal-500">Delivery</span><span class="text-charcoal-950">{{ Number(order.shipping_cost) ? money(order.shipping_cost) : 'Complimentary' }}</span></div>
            </div>
            <div class="mt-5 flex items-end justify-between border-t border-charcoal-950/10 pt-5">
              <div><p class="text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">Total</p><p class="mt-1 text-[9px] text-charcoal-400">{{ paymentLabel(order.payment_method) }}</p></div>
              <p class="font-display text-[34px] leading-none tracking-[-0.035em] text-charcoal-950">{{ money(order.grand_total) }}</p>
            </div>
          </section>

          <section class="border-b border-charcoal-950/10 py-7">
            <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Delivery address</p>
            <p class="mt-4 text-[12px] font-medium text-charcoal-950">{{ order.shipping.recipient_name }}</p>
            <p class="mt-1 text-[11px] leading-5 text-charcoal-500">
              {{ order.shipping.recipient_phone }}<br>
              {{ order.shipping.address_line1 }}<span v-if="order.shipping.address_line2">, {{ order.shipping.address_line2 }}</span><br>
              <template v-if="order.shipping.city">{{ order.shipping.city }}</template><template v-if="order.shipping.state">, {{ order.shipping.state }}</template>
              <template v-if="order.shipping.postal_code"><br>{{ order.shipping.postal_code }}</template>
            </p>
          </section>

          <section class="py-7">
            <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Tracking</p>
            <template v-if="order.tracking_number">
              <p class="mt-4 text-[12px] font-medium text-charcoal-950">{{ order.tracking_number }}</p>
              <p v-if="order.shipping_carrier" class="mt-1 text-[10px] text-charcoal-500">{{ order.shipping_carrier }}</p>
            </template>
            <p v-else class="mt-4 text-[11px] leading-5 text-charcoal-500">Tracking details will appear here when your order is handed to the delivery partner.</p>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>
