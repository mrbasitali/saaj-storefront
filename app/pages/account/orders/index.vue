<script setup lang="ts">
type Order = {
  order_number: string
  status: string
  fulfillment_status: string
  grand_total: string | number
  placed_at: string | null
}

const { $api } = useNuxtApp()

const { data, pending } = await useAsyncData('account-orders', () =>
  $api<{ data: Order[] }>('/customer/orders'),
)

const orders = computed(() => data.value?.data ?? [])

function statusLabel(status: string) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
</script>

<template>
  <div>
    <h2 class="text-lg font-semibold text-ink-900">
      Orders
    </h2>

    <div
      v-if="pending"
      class="mt-6 space-y-3"
    >
      <div
        v-for="n in 3"
        :key="n"
        class="h-20 animate-pulse rounded-xl bg-stone-100"
      />
    </div>

    <p
      v-else-if="orders.length === 0"
      class="mt-6 text-sm text-ink-500"
    >
      No orders yet.
      <NuxtLink
        to="/shop"
        class="text-ink-900 underline decoration-stone-300 underline-offset-4"
      >
        Start shopping
      </NuxtLink>
    </p>

    <ul
      v-else
      class="mt-6 divide-y divide-stone-200"
    >
      <li
        v-for="order in orders"
        :key="order.order_number"
      >
        <NuxtLink
          :to="`/account/orders/${order.order_number}`"
          class="flex items-center justify-between gap-4 py-4"
        >
          <div>
            <p class="text-[15px] font-medium text-ink-900">
              {{ order.order_number }}
            </p>
            <p class="mt-0.5 text-sm text-ink-500">
              {{ statusLabel(order.fulfillment_status) }}
            </p>
          </div>
          <p class="text-[15px] text-ink-900">
            Rs {{ Number(order.grand_total).toLocaleString() }}
          </p>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
