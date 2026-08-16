<script setup lang="ts">
type OrderImage = {
  image_url?: string | null
  optimized_urls?: { thumb?: string | null, card?: string | null } | null
}

type StatusEntry = { status: string, note: string | null, at: string | null }
type OrderItem = {
  product_name: string | null
  product_slug?: string | null
  product_image?: OrderImage | null
  variant_options?: string | null
  quantity: number
  line_total: string | number
}

type Order = {
  order_number: string
  fulfillment_status: string
  payment_method: string
  payment_status: string
  items: OrderItem[]
  subtotal: string | number
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

useSeoMeta({
  title: 'Track Your Order | SAAJ',
  description: 'Check the current delivery progress of your SAAJ order using your order number and checkout phone.',
  robots: 'noindex,nofollow',
})

const route = useRoute()
const { $api } = useNuxtApp()
const authStore = useAuthStore()

const form = reactive({
  order_number: typeof route.query.order === 'string' ? route.query.order : '',
  phone: '',
})

const submitting = ref(false)
const error = ref('')
const order = ref<Order | null>(null)

watch(() => authStore.customer?.phone, (phone) => {
  if (phone && !form.phone) form.phone = phone
}, { immediate: true })

async function submit() {
  if (submitting.value) return
  submitting.value = true
  error.value = ''
  order.value = null

  try {
    const response = await $api<{ data: Order }>('/customer/track-order', {
      method: 'POST',
      body: {
        order_number: form.order_number.trim(),
        phone: form.phone.trim(),
      },
    })

    order.value = response.data

    if (import.meta.client) {
      window.setTimeout(() => document.getElementById('tracking-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    }
  } catch (err: any) {
    error.value = extractApiErrorMessage(err, 'No matching order found. Double-check your order number and phone.')
  } finally {
    submitting.value = false
  }
}

function money(value: string | number) {
  return `Rs ${Number(value || 0).toLocaleString('en-PK')}`
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-PK', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function imageUrl(item: OrderItem) {
  const image = item.product_image
  return image?.optimized_urls?.thumb || image?.optimized_urls?.card || image?.image_url || null
}
</script>

<template>
  <main class="bg-paper-50 text-charcoal-950">
    <section class="mx-auto max-w-[1520px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16 xl:px-14">
      <div class="grid gap-12 border-b border-charcoal-950/10 pb-12 lg:grid-cols-[.82fr_1.18fr] lg:gap-20 lg:pb-16">
        <div>
          <p class="text-[9px] font-semibold uppercase tracking-[0.2em] text-charcoal-400">Order tracking</p>
          <h1 class="mt-3 max-w-[680px] font-display text-[clamp(3.4rem,7vw,7rem)] font-medium leading-[0.86] tracking-[-0.06em] text-charcoal-950">Where is your order?</h1>
          <p class="mt-6 max-w-lg text-[12px] leading-6 text-charcoal-500">Use the order number from your confirmation and the phone number used at checkout. Guest and account orders use the same secure lookup.</p>
        </div>

        <form class="self-end border-t border-charcoal-950/10 pt-7 lg:border-t-0 lg:pt-0" @submit.prevent="submit">
          <div class="grid gap-5 sm:grid-cols-2">
            <label>
              <span class="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Order number</span>
              <input v-model.trim="form.order_number" type="text" required autocomplete="off" placeholder="SI-..." class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950">
            </label>
            <label>
              <span class="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Checkout phone</span>
              <input v-model.trim="form.phone" type="tel" required inputmode="tel" autocomplete="tel" placeholder="03XXXXXXXXX" class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950">
            </label>
          </div>

          <div v-if="error" class="mt-5 border border-[#bd6f6f]/35 bg-[#bd6f6f]/[0.07] px-4 py-3 text-[11px] leading-5 text-[#9a4f4f]">{{ error }}</div>

          <button type="submit" :disabled="submitting || !form.order_number || !form.phone" class="mt-6 flex min-w-[180px] items-center justify-center gap-3 bg-charcoal-950 px-7 py-4 text-[9px] font-semibold uppercase tracking-[0.15em] text-paper-50 transition hover:opacity-90 disabled:opacity-45">
            <span v-if="submitting" class="h-3.5 w-3.5 animate-spin rounded-full border border-paper-50/30 border-t-paper-50" />
            {{ submitting ? 'Finding order…' : 'Track order' }}
          </button>
        </form>
      </div>

      <section v-if="order" id="tracking-result" class="scroll-mt-32 pt-12 lg:pt-16">
        <header class="flex flex-col gap-5 border-b border-charcoal-950/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-[9px] font-semibold uppercase tracking-[0.18em] text-charcoal-400">Order found</p>
            <h2 class="mt-2 font-display text-[38px] font-medium tracking-[-0.04em] text-charcoal-950 sm:text-[46px]">{{ order.order_number }}</h2>
            <p class="mt-2 text-[10px] uppercase tracking-[0.09em] text-charcoal-400">Placed {{ formatDate(order.placed_at) }}</p>
          </div>
          <OrderStatusBadge :status="order.fulfillment_status" />
        </header>

        <div class="mt-10 grid gap-12 xl:grid-cols-[1.08fr_.92fr] xl:gap-16">
          <div>
            <div class="border-b border-charcoal-950/10 pb-4">
              <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Latest updates</p>
              <h3 class="mt-2 font-display text-[28px] tracking-[-0.03em] text-charcoal-950">Delivery progress</h3>
            </div>
            <div class="py-7">
              <OrderTimeline :entries="order.status_history" :current-status="order.fulfillment_status" />
            </div>

            <div v-if="order.tracking_number" class="mt-3 border-y border-charcoal-950/10 py-5">
              <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Courier tracking</p>
              <div class="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                <p class="text-[13px] font-medium text-charcoal-950">{{ order.tracking_number }}</p>
                <p v-if="order.shipping_carrier" class="text-[10px] text-charcoal-500">{{ order.shipping_carrier }}</p>
              </div>
            </div>
          </div>

          <aside class="xl:border-l xl:border-charcoal-950/10 xl:pl-10">
            <div class="border-b border-charcoal-950/10 pb-4">
              <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Order summary</p>
              <h3 class="mt-2 font-display text-[28px] tracking-[-0.03em] text-charcoal-950">Your pieces</h3>
            </div>

            <div class="divide-y divide-charcoal-950/10">
              <div v-for="(item, index) in order.items" :key="`${item.product_name}-${index}`" class="grid grid-cols-[64px_minmax(0,1fr)_auto] gap-3 py-4">
                <div class="aspect-[4/5] overflow-hidden bg-charcoal-950/[0.035]">
                  <img v-if="imageUrl(item)" :src="imageUrl(item)!" :alt="item.product_name || 'Product'" class="h-full w-full object-cover">
                </div>
                <div class="min-w-0 self-center">
                  <p class="truncate text-[11px] font-medium text-charcoal-950">{{ item.product_name }}</p>
                  <p v-if="item.variant_options" class="mt-1 truncate text-[9px] text-charcoal-400">{{ item.variant_options }}</p>
                  <p class="mt-1 text-[9px] text-charcoal-500">Qty {{ item.quantity }}</p>
                </div>
                <p class="self-center text-[10px] text-charcoal-950">{{ money(item.line_total) }}</p>
              </div>
            </div>

            <div class="border-t border-charcoal-950/10 pt-5">
              <div class="flex items-center justify-between text-[10px]"><span class="text-charcoal-500">Delivery</span><span class="text-charcoal-950">{{ Number(order.shipping_cost) ? money(order.shipping_cost) : 'Complimentary' }}</span></div>
              <div class="mt-5 flex items-end justify-between border-t border-charcoal-950/10 pt-5">
                <p class="text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">Total</p>
                <p class="font-display text-[31px] leading-none tracking-[-0.035em] text-charcoal-950">{{ money(order.grand_total) }}</p>
              </div>
            </div>

            <div class="mt-7 border-t border-charcoal-950/10 pt-6">
              <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">Sending to</p>
              <p class="mt-3 text-[11px] leading-5 text-charcoal-500">
                {{ order.shipping.recipient_name }}<br>
                {{ order.shipping.address_line1 }}<span v-if="order.shipping.address_line2">, {{ order.shipping.address_line2 }}</span><br>
                <template v-if="order.shipping.city">{{ order.shipping.city }}</template><template v-if="order.shipping.state">, {{ order.shipping.state }}</template>
              </p>
            </div>
          </aside>
        </div>
      </section>
    </section>
  </main>
</template>
