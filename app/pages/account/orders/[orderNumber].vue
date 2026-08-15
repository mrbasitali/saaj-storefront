<script setup lang="ts">
type StatusEntry = { status: string, note: string | null, at: string | null }
type OrderItem = { product_name: string, variant_options: string | null, quantity: number, unit_price: string | number, line_total: string | number }
type Order = {
  order_number: string
  status: string
  fulfillment_status: string
  payment_method: string
  payment_status: string
  items: OrderItem[]
  subtotal: string | number
  shipping_cost: string | number
  grand_total: string | number
  shipping: { recipient_name: string, recipient_phone: string, address_line1: string, address_line2: string | null, city: string | null, state: string | null, postal_code: string | null }
  tracking_number: string | null
  shipping_carrier: string | null
  status_history: StatusEntry[]
  placed_at: string | null
}

const route = useRoute()
const { $api } = useNuxtApp()

const { data } = await useAsyncData(`account-order-${route.params.orderNumber}`, () =>
  $api<{ data: Order }>(`/customer/orders/${route.params.orderNumber}`),
)

const order = computed(() => data.value?.data)

function statusLabel(status: string) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
</script>

<template>
  <div v-if="order">
    <NuxtLink
      to="/account/orders"
      class="text-sm text-ink-500 hover:text-ink-900"
    >
      ← All orders
    </NuxtLink>

    <div class="mt-3 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-ink-900">
        {{ order.order_number }}
      </h2>
      <span class="rounded-full bg-indigo-100 px-3 py-1 text-[13px] font-medium text-indigo-900">
        {{ statusLabel(order.fulfillment_status) }}
      </span>
    </div>

    <div
      v-if="order.status_history.length > 0"
      class="mt-6 space-y-4 border-l border-stone-200 pl-5"
    >
      <div
        v-for="(entry, i) in order.status_history"
        :key="i"
        class="relative"
      >
        <span class="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-700" />
        <p class="text-[15px] font-medium text-ink-900">
          {{ statusLabel(entry.status) }}
        </p>
        <p
          v-if="entry.note"
          class="mt-0.5 text-sm text-ink-500"
        >
          {{ entry.note }}
        </p>
        <p
          v-if="entry.at"
          class="mt-0.5 text-xs text-ink-400"
        >
          {{ new Date(entry.at).toLocaleString() }}
        </p>
      </div>
    </div>

    <p
      v-if="order.tracking_number"
      class="mt-6 text-sm text-ink-700"
    >
      Tracking: <span class="font-medium">{{ order.tracking_number }}</span>
      <span v-if="order.shipping_carrier">({{ order.shipping_carrier }})</span>
    </p>

    <div class="mt-8 rounded-2xl bg-stone-100 p-6">
      <ul class="space-y-2.5 text-sm">
        <li
          v-for="(item, i) in order.items"
          :key="i"
          class="flex justify-between"
        >
          <span class="text-ink-500">{{ item.quantity }} × {{ item.product_name }}<span v-if="item.variant_options"> ({{ item.variant_options }})</span></span>
          <span class="text-ink-900">Rs {{ Number(item.line_total).toLocaleString() }}</span>
        </li>
      </ul>

      <div class="mt-4 space-y-1.5 border-t border-stone-200 pt-4 text-sm">
        <div class="flex justify-between">
          <span class="text-ink-500">Subtotal</span>
          <span class="text-ink-900">Rs {{ Number(order.subtotal).toLocaleString() }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-ink-500">Shipping</span>
          <span class="text-ink-900">Rs {{ Number(order.shipping_cost).toLocaleString() }}</span>
        </div>
        <div class="flex justify-between text-[15px] font-medium">
          <span class="text-ink-900">Total</span>
          <span class="text-ink-900">Rs {{ Number(order.grand_total).toLocaleString() }}</span>
        </div>
      </div>

      <p class="mt-4 text-sm text-ink-500">
        {{ order.shipping.recipient_name }} · {{ order.shipping.recipient_phone }}<br>
        {{ order.shipping.address_line1 }}<span v-if="order.shipping.address_line2">, {{ order.shipping.address_line2 }}</span><br>
        {{ order.shipping.city }}, {{ order.shipping.state }}
      </p>
    </div>
  </div>
</template>
