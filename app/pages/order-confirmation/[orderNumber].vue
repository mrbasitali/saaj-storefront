<script setup lang="ts">
type OrderItem = {
  product_name: string
  variant_options: string | null
  quantity: number
  line_total: string | number
}

type Order = {
  order_number: string
  fulfillment_status: string
  payment_method: string
  items: OrderItem[]
  subtotal: string | number
  shipping_cost: string | number
  grand_total: string | number
  shipping: {
    recipient_name: string
    address_line1: string
    city: string | null
    state: string | null
  }
}

const route = useRoute()
const { $api } = useNuxtApp()
const authStore = useAuthStore()

const { data, error } = await useAsyncData(`order-confirm-${route.params.orderNumber}`, () => {
  // A logged-in customer's own order lookup is more precise (also
  // returns status history) — guests fall back to the public tracking
  // endpoint, which needs a phone number we don't have here, so this
  // only works cleanly for the logged-in path immediately after
  // checkout. Good enough for "just placed an order" — if it fails,
  // the fallback message below still confirms the order number.
  if (authStore.isLoggedIn) {
    return $api<{ data: Order }>(`/customer/orders/${route.params.orderNumber}`)
  }

  return Promise.reject(new Error('guest'))
})
</script>

<template>
  <div class="mx-auto max-w-2xl px-5 py-16 text-center sm:px-8">
    <div
      class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100"
      aria-hidden="true"
    >
      <svg
        class="h-7 w-7 text-indigo-700"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M5 13l4 4L19 7" />
      </svg>
    </div>

    <h1 class="mt-6 font-display text-3xl font-medium text-ink-900">
      Order placed
    </h1>
    <p class="mt-2 text-ink-500">
      Order <span class="font-medium text-ink-900">{{ route.params.orderNumber }}</span> has been confirmed.
    </p>

    <div
      v-if="data?.data"
      class="mt-10 rounded-2xl bg-stone-100 p-6 text-left"
    >
      <ul class="space-y-2.5 text-sm">
        <li
          v-for="(item, i) in data.data.items"
          :key="i"
          class="flex justify-between"
        >
          <span class="text-ink-500">{{ item.quantity }} × {{ item.product_name }}</span>
          <span class="text-ink-900">Rs {{ Number(item.line_total).toLocaleString() }}</span>
        </li>
      </ul>

      <div class="mt-4 flex justify-between border-t border-stone-200 pt-4 text-[15px] font-medium">
        <span class="text-ink-900">Total</span>
        <span class="text-ink-900">Rs {{ Number(data.data.grand_total).toLocaleString() }}</span>
      </div>

      <p class="mt-4 text-sm text-ink-500">
        Shipping to {{ data.data.shipping.recipient_name }}, {{ data.data.shipping.address_line1 }},
        {{ data.data.shipping.city }}
      </p>
    </div>

    <p
      v-else-if="error"
      class="mt-8 text-sm text-ink-500"
    >
      A confirmation has been sent to you. Keep your order number to
      track it any time.
    </p>

    <div class="mt-10 flex justify-center gap-4">
      <NuxtLink
        to="/shop"
        class="rounded-full bg-ink-900 px-6 py-3 text-[15px] font-medium text-stone-50 transition hover:bg-indigo-900"
      >
        Continue shopping
      </NuxtLink>
      <NuxtLink
        :to="authStore.isLoggedIn ? `/account/orders/${route.params.orderNumber}` : `/track-order?order=${route.params.orderNumber}`"
        class="rounded-full border border-stone-300 px-6 py-3 text-[15px] font-medium text-ink-900 transition hover:border-ink-900"
      >
        Track order
      </NuxtLink>
    </div>
  </div>
</template>
