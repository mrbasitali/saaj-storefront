<script setup lang="ts">
type OrderItem = {
  product_name: string | null
  variant_options: string | null
  sku?: string | null
  quantity: number
  unit_price?: string | number
  line_total: string | number
}

type Order = {
  order_number: string
  status?: string
  fulfillment_status: string
  payment_method: string
  payment_status?: string
  items: OrderItem[]
  subtotal: string | number
  shipping_cost: string | number
  grand_total: string | number
  shipping: {
    recipient_name: string
    recipient_phone?: string
    address_line1: string
    address_line2?: string | null
    city: string | null
    state: string | null
    postal_code?: string | null
  }
  placed_at?: string | null
}

const route = useRoute()
const { $api } = useNuxtApp()
const authStore = useAuthStore()
const orderNumber = String(route.params.orderNumber)
const lastPlacedOrder = useState<Order | null>('last-placed-order', () => null)
const order = ref<Order | null>(lastPlacedOrder.value?.order_number === orderNumber ? lastPlacedOrder.value : null)
const loading = ref(false)
const copied = ref(false)
const createdAccount = ref<{ password_setup: 'now' | 'later', setup_email_sent: boolean, email: string | null } | null>(null)
let copyTimer: ReturnType<typeof setTimeout> | null = null

useSeoMeta({
  title: `Order ${orderNumber} | SAAJ`,
  description: 'Your SAAJ order has been received.',
  robots: 'noindex,nofollow',
})

function formatPrice(value: number | string) {
  return `Rs ${Number(value || 0).toLocaleString('en-PK')}`
}

function paymentLabel(method?: string) {
  return method === 'cod' ? 'Cash on Delivery' : 'Payment'
}

const { formatDateTime: formatStorefrontDateTime } = useStorefrontDateTime()

function formattedPlacedAt(value?: string | null) {
  return value ? formatStorefrontDateTime(value, { day: 'numeric', month: 'long' }) : ''
}

async function copyOrderNumber() {
  if (!import.meta.client) return

  try {
    await navigator.clipboard.writeText(orderNumber)
    copied.value = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copied.value = false }, 1800)
  } catch {
    // Clipboard can be unavailable in restricted browsers. The visible order
    // number remains selectable, so confirmation never depends on this action.
  }
}

onMounted(async () => {
  try {
    const accountRaw = sessionStorage.getItem(`saaj_order_account_${orderNumber}`)
    if (accountRaw) createdAccount.value = JSON.parse(accountRaw)
  } catch {
    // Account setup message is optional confirmation context only.
  }

  if (!order.value) {
    try {
      const raw = sessionStorage.getItem(`saaj_order_confirmation_${orderNumber}`)
      if (raw) order.value = JSON.parse(raw)
    } catch {
      // The order number itself is still enough to show a safe confirmation.
    }
  }

  if (!order.value && authStore.isLoggedIn) {
    loading.value = true
    try {
      const response = await $api<{ data: Order }>(`/customer/orders/${orderNumber}`)
      order.value = response.data
    } catch {
      // Keep the generic confirmation instead of turning a successful order
      // into an error screen because the follow-up lookup failed.
    } finally {
      loading.value = false
    }
  }
})

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer)
})
</script>

<template>
  <main class="min-h-[74vh] bg-paper-50 px-5 py-10 text-charcoal-950 sm:px-8 sm:py-14 lg:py-16">
    <div class="mx-auto max-w-[1280px]">
      <nav aria-label="Checkout progress" class="flex items-center justify-center gap-2 overflow-x-auto pb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400 sm:gap-3">
        <span class="flex shrink-0 items-center gap-2"><span class="flex h-5 w-5 items-center justify-center rounded-full border border-charcoal-950/18 text-[8px]">✓</span>Bag</span>
        <span class="h-px w-7 shrink-0 bg-charcoal-950/15 sm:w-10" />
        <span class="flex shrink-0 items-center gap-2"><span class="flex h-5 w-5 items-center justify-center rounded-full border border-charcoal-950/18 text-[8px]">✓</span>Delivery</span>
        <span class="h-px w-7 shrink-0 bg-charcoal-950/15 sm:w-10" />
        <span class="flex shrink-0 items-center gap-2 text-charcoal-950"><span class="flex h-5 w-5 items-center justify-center rounded-full bg-charcoal-950 text-[8px] text-paper-50">03</span>Confirmation</span>
      </nav>

      <header class="mx-auto mt-9 max-w-3xl text-center sm:mt-12">
        <div class="confirmation-check mx-auto flex h-13 w-13 items-center justify-center rounded-full border border-charcoal-950/14">
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m5 12 4 4 10-10" /></svg>
        </div>
        <p class="mt-6 section-kicker">Order received</p>
        <h1 class="mt-3 font-display text-[44px] font-medium leading-[.94] tracking-[-0.045em] sm:text-[62px]">Thank you.</h1>
        <p class="mx-auto mt-5 max-w-xl text-[12px] leading-6 text-charcoal-500">
          Your SAAJ order is confirmed. Keep the order number below handy — we’ll use your delivery contact details for the next updates.
        </p>

        <button
          type="button"
          class="group mx-auto mt-6 inline-flex min-h-11 items-center gap-3 border border-charcoal-950/12 bg-paper-50 px-4 text-left transition hover:border-charcoal-950/28"
          :aria-label="copied ? 'Order number copied' : 'Copy order number'"
          @click="copyOrderNumber"
        >
          <span>
            <span class="block text-[8px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">Order number</span>
            <strong class="mt-0.5 block text-[12px] font-semibold tracking-[0.03em]">{{ orderNumber }}</strong>
          </span>
          <span class="h-7 w-px bg-charcoal-950/10" />
          <span class="text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-500 transition group-hover:text-charcoal-950">{{ copied ? 'Copied ✓' : 'Copy' }}</span>
        </button>
      </header>

      <div v-if="createdAccount" class="mx-auto mt-8 max-w-[1040px] border border-charcoal-950/10 bg-mist-50 px-5 py-4 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-6">
        <div>
          <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-950">Your SAAJ account is ready</p>
          <p class="mt-1 text-[11px] leading-5 text-charcoal-500">
            <template v-if="createdAccount.password_setup === 'later'">
              <template v-if="createdAccount.setup_email_sent">We sent {{ createdAccount.email }} a secure link to choose a password. You’re already signed in on this device.</template>
              <template v-else>Your account was created and you’re signed in on this device. Use “Forgot password” later with {{ createdAccount.email }} to choose a password.</template>
            </template>
            <template v-else>
              <template v-if="createdAccount.setup_email_sent">You’re signed in now. Check {{ createdAccount.email }} for the email verification link.</template>
              <template v-else>You’re signed in now. You can resend your email verification link any time from your account.</template>
            </template>
          </p>
        </div>
        <NuxtLink to="/account/orders" class="mt-4 inline-flex shrink-0 text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-950 underline underline-offset-4 sm:mt-0">View my orders →</NuxtLink>
      </div>

      <div v-if="loading" class="mx-auto mt-11 grid max-w-[1040px] gap-6 lg:grid-cols-[1fr_.78fr]">
        <div class="skeleton h-80" />
        <div class="skeleton h-80" />
      </div>

      <div v-else class="mx-auto mt-11 grid max-w-[1040px] gap-6 lg:mt-14 lg:grid-cols-[1fr_.78fr] lg:gap-10">
        <!-- What happens next -->
        <section class="border-y border-charcoal-950/10 py-7 sm:py-8">
          <div class="flex items-end justify-between gap-6">
            <div>
              <p class="section-kicker">What happens next</p>
              <h2 class="mt-3 font-display text-[30px] font-medium leading-none tracking-[-0.03em] sm:text-[34px]">From us to you.</h2>
            </div>
            <span v-if="order?.placed_at" class="hidden text-right text-[9px] leading-5 text-charcoal-400 sm:block">Placed<br>{{ formattedPlacedAt(order.placed_at) }}</span>
          </div>

          <ol class="mt-8 grid gap-0 sm:grid-cols-3">
            <li class="confirmation-step is-current">
              <span class="confirmation-step__number">01</span>
              <span class="confirmation-step__line" aria-hidden="true" />
              <strong>Order received</strong>
              <p>We have your order and delivery details.</p>
            </li>
            <li class="confirmation-step">
              <span class="confirmation-step__number">02</span>
              <span class="confirmation-step__line" aria-hidden="true" />
              <strong>Preparing</strong>
              <p>Your pieces are checked and prepared for dispatch.</p>
            </li>
            <li class="confirmation-step">
              <span class="confirmation-step__number">03</span>
              <strong>On its way</strong>
              <p>We’ll share delivery updates using your order contact.</p>
            </li>
          </ol>

          <div class="mt-9 flex flex-col gap-3 sm:flex-row">
            <NuxtLink to="/shop" class="inline-flex min-h-12 items-center justify-center bg-charcoal-950 px-7 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-50 transition hover:opacity-85">Continue shopping</NuxtLink>
            <NuxtLink
              :to="authStore.isLoggedIn ? `/account/orders/${orderNumber}` : `/track-order?order=${orderNumber}`"
              class="inline-flex min-h-12 items-center justify-center border border-charcoal-950/18 px-7 text-[10px] font-semibold uppercase tracking-[0.16em] transition hover:border-charcoal-950"
            >
              Track order
            </NuxtLink>
          </div>
        </section>

        <!-- Receipt -->
        <aside class="bg-mist-50 px-5 py-6 sm:px-7 sm:py-7">
          <div class="flex items-center justify-between border-b border-charcoal-950/10 pb-5">
            <h2 class="font-display text-[27px] font-medium leading-none tracking-[-0.025em]">Order summary</h2>
            <span v-if="order" class="text-[8px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">{{ order.items?.length || 0 }} {{ order.items?.length === 1 ? 'line' : 'lines' }}</span>
          </div>

          <template v-if="order">
            <ul class="space-y-4 py-5">
              <li v-for="(item, index) in order.items" :key="`${item.sku || item.product_name}-${index}`" class="flex items-start justify-between gap-5 text-[11px]">
                <div class="min-w-0">
                  <p class="font-medium"><span class="mr-1.5 text-charcoal-400">{{ item.quantity }}×</span>{{ item.product_name || 'SAAJ piece' }}</p>
                  <p v-if="item.variant_options" class="mt-1 text-[9px] leading-4 text-charcoal-400">{{ item.variant_options }}</p>
                </div>
                <p class="shrink-0 font-medium tabular-nums">{{ formatPrice(item.line_total) }}</p>
              </li>
            </ul>

            <div class="space-y-3 border-t border-charcoal-950/10 py-5 text-[10px]">
              <div class="flex justify-between gap-6"><span class="text-charcoal-500">Subtotal</span><span>{{ formatPrice(order.subtotal) }}</span></div>
              <div class="flex justify-between gap-6"><span class="text-charcoal-500">Delivery</span><span>{{ Number(order.shipping_cost) === 0 ? 'Complimentary' : formatPrice(order.shipping_cost) }}</span></div>
              <div class="flex justify-between gap-6"><span class="text-charcoal-500">Payment</span><span>{{ paymentLabel(order.payment_method) }}</span></div>
            </div>

            <div class="flex items-end justify-between gap-6 border-t border-charcoal-950/10 py-5">
              <span class="text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">Total</span>
              <span class="font-display text-[29px] font-medium leading-none tabular-nums tracking-[-0.025em]">{{ formatPrice(order.grand_total) }}</span>
            </div>

            <div class="border-t border-charcoal-950/10 pt-5">
              <p class="text-[8px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">Delivering to</p>
              <p class="mt-2 text-[10px] leading-5 text-charcoal-500">
                <strong class="font-medium text-charcoal-950">{{ order.shipping.recipient_name }}</strong>
                <span v-if="order.shipping.recipient_phone"> · {{ order.shipping.recipient_phone }}</span><br>
                {{ order.shipping.address_line1 }}<span v-if="order.shipping.address_line2">, {{ order.shipping.address_line2 }}</span><br>
                {{ [order.shipping.city, order.shipping.state].filter(Boolean).join(', ') }}<span v-if="order.shipping.postal_code"> · {{ order.shipping.postal_code }}</span>
              </p>
            </div>
          </template>

          <div v-else class="py-7 text-[11px] leading-6 text-charcoal-500">
            <p>Your order has been received successfully.</p>
            <p class="mt-2">Keep <strong class="font-semibold text-charcoal-950">{{ orderNumber }}</strong> and your delivery phone number safe to track it at any time.</p>
          </div>
        </aside>
      </div>
    </div>
  </main>
</template>

<style scoped>
.confirmation-check {
  animation: confirmation-pop 520ms cubic-bezier(.2,.85,.2,1) both;
}

.confirmation-step {
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  column-gap: 10px;
  padding: 0 0 24px;
}

.confirmation-step__number {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--color-charcoal-950) 15%, transparent);
  border-radius: 999px;
  color: var(--color-charcoal-400);
  font-size: 8px;
  font-weight: 650;
  letter-spacing: .05em;
}

.confirmation-step.is-current .confirmation-step__number {
  border-color: var(--color-charcoal-950);
  background: var(--color-charcoal-950);
  color: var(--color-paper-50);
}

.confirmation-step__line {
  position: absolute;
  top: 26px;
  bottom: 0;
  left: 12.5px;
  width: 1px;
  background: color-mix(in srgb, var(--color-charcoal-950) 12%, transparent);
}

.confirmation-step strong,
.confirmation-step p {
  grid-column: 2;
}

.confirmation-step strong {
  align-self: center;
  font-size: 11px;
  font-weight: 600;
}

.confirmation-step p {
  margin-top: 7px;
  color: var(--color-charcoal-400);
  font-size: 10px;
  line-height: 1.75;
}

@media (min-width: 640px) {
  .confirmation-step {
    display: block;
    padding: 0 24px 0 0;
  }

  .confirmation-step__number {
    margin-bottom: 18px;
  }

  .confirmation-step__line {
    top: 12.5px;
    right: 10px;
    bottom: auto;
    left: 36px;
    width: auto;
    height: 1px;
  }

  .confirmation-step strong {
    display: block;
  }

  .confirmation-step p {
    margin-top: 8px;
    max-width: 180px;
  }
}

@keyframes confirmation-pop {
  from { opacity: 0; transform: translateY(8px) scale(.92); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .confirmation-check { animation: none; }
}
</style>
