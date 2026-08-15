<script setup lang="ts">
type StatusEntry = { status: string, note: string | null, at: string | null }
type OrderItem = { product_name: string, quantity: number, line_total: string | number }
type Order = {
  order_number: string
  fulfillment_status: string
  items: OrderItem[]
  grand_total: string | number
  shipping: { recipient_name: string, address_line1: string, city: string | null, state: string | null }
  tracking_number: string | null
  shipping_carrier: string | null
  status_history: StatusEntry[]
}

const route = useRoute()
const { $api } = useNuxtApp()

const form = reactive({
  order_number: (route.query.order as string) || '',
  phone: '',
})

const submitting = ref(false)
const error = ref('')
const order = ref<Order | null>(null)

async function submit() {
  submitting.value = true
  error.value = ''
  order.value = null

  try {
    const response = await $api<{ data: Order }>('/customer/track-order', {
      method: 'POST',
      body: form,
    })

    order.value = response.data
  } catch (err: any) {
    error.value = extractApiErrorMessage(err, 'No matching order found. Double-check your order number and phone.')
  } finally {
    submitting.value = false
  }
}

function statusLabel(status: string) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
</script>

<template>
  <div class="mx-auto max-w-xl px-5 py-16 sm:px-8">
    <h1 class="font-display text-3xl font-medium text-ink-900">
      Track your order
    </h1>
    <p class="mt-2 text-sm text-ink-500">
      Enter your order number and the phone number used at checkout.
    </p>

    <form
      class="mt-8 flex flex-col gap-4 sm:flex-row"
      @submit.prevent="submit"
    >
      <input
        v-model="form.order_number"
        type="text"
        required
        placeholder="Order number (e.g. SI-...)"
        class="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
      >
      <input
        v-model="form.phone"
        type="tel"
        required
        placeholder="Phone number"
        class="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
      >
      <button
        type="submit"
        :disabled="submitting"
        class="rounded-xl bg-ink-900 px-6 py-3 text-[15px] font-medium text-stone-50 transition hover:bg-indigo-900 disabled:opacity-60"
      >
        {{ submitting ? 'Searching...' : 'Track' }}
      </button>
    </form>

    <p
      v-if="error"
      class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700"
    >
      {{ error }}
    </p>

    <div
      v-if="order"
      class="mt-10"
    >
      <div class="flex items-center justify-between">
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
        </div>
      </div>

      <p
        v-if="order.tracking_number"
        class="mt-6 text-sm text-ink-700"
      >
        Tracking: <span class="font-medium">{{ order.tracking_number }}</span>
      </p>
    </div>
  </div>
</template>
