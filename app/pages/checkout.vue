<script setup lang="ts">
import type { AddressFieldsValue } from '~/components/AddressFields.vue'

type SavedAddress = {
  id: number
  label: string | null
  recipient_name: string
  recipient_phone: string
  address_line1: string
  address_line2: string | null
  city_id: number
  city_name: string | null
  state_name: string | null
  is_default: boolean
}

const { $api } = useNuxtApp()
const authStore = useAuthStore()
const cart = useCartStore()
const router = useRouter()

if (cart.items.length === 0) {
  await navigateTo('/cart')
}

const savedAddresses = ref<SavedAddress[]>([])
const selectedAddressId = ref<number | 'new' | null>(null)

if (authStore.isLoggedIn) {
  try {
    const response = await $api<{ data: SavedAddress[] }>('/customer/addresses')

    savedAddresses.value = response.data
    const defaultAddr = response.data.find((a) => a.is_default) ?? response.data[0]

    selectedAddressId.value = defaultAddr ? defaultAddr.id : 'new'
  } catch {
    selectedAddressId.value = 'new'
  }
} else {
  selectedAddressId.value = 'new'
}

const newAddress = reactive<AddressFieldsValue>({
  label: '',
  recipient_name: '',
  recipient_phone: '',
  address_line1: '',
  address_line2: '',
  country_id: null,
  state_id: null,
  city_id: null,
  postal_code: '',
})

const guest = reactive({
  name: '',
  email: '',
  phone: '',
})

const notes = ref('')
const paymentMethod = 'cod'

const resolvedCityId = computed(() => {
  if (selectedAddressId.value === 'new') return newAddress.city_id

  const addr = savedAddresses.value.find((a) => a.id === selectedAddressId.value)

  return addr?.city_id ?? null
})

const shippingEstimate = ref<{ shipping_cost: number } | null>(null)
const shippingError = ref('')

watch(resolvedCityId, async (cityId) => {
  shippingEstimate.value = null
  shippingError.value = ''

  if (!cityId) return

  try {
    const response = await $api<{ shipping_cost: number }>('/shipping/estimate', {
      query: {
        city_id: cityId,
        subtotal: cart.subtotal,
        quantity: cart.totalItems,
      },
    })

    shippingEstimate.value = response
  } catch (err: any) {
    shippingError.value = extractApiErrorMessage(err, 'Shipping is not available to this location yet.')
  }
}, { immediate: true })

const grandTotal = computed(() => cart.subtotal + (shippingEstimate.value?.shipping_cost ?? 0))

const submitting = ref(false)
const submitError = ref('')

async function submit() {
  submitting.value = true
  submitError.value = ''

  const payload: Record<string, unknown> = {
    items: cart.toCheckoutItems(),
    payment_method: paymentMethod,
    notes: notes.value || undefined,
  }

  if (selectedAddressId.value !== 'new' && selectedAddressId.value !== null) {
    payload.customer_address_id = selectedAddressId.value
  } else {
    payload.recipient_name = newAddress.recipient_name
    payload.recipient_phone = newAddress.recipient_phone
    payload.address_line1 = newAddress.address_line1
    payload.address_line2 = newAddress.address_line2 || undefined
    payload.country_id = newAddress.country_id
    payload.state_id = newAddress.state_id
    payload.city_id = newAddress.city_id
    payload.postal_code = newAddress.postal_code || undefined
  }

  if (!authStore.isLoggedIn) {
    payload.guest_name = guest.name
    payload.guest_email = guest.email || undefined
    payload.guest_phone = guest.phone
  }

  try {
    const response = await $api<{ data: { order_number: string } }>('/customer/checkout', {
      method: 'POST',
      body: payload,
    })

    cart.clear()

    await router.push(`/order-confirmation/${response.data.order_number}`)
  } catch (err: any) {
    submitError.value = extractApiErrorMessage(err, 'Could not place your order. Please check your details and try again.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-5 py-12 sm:px-8">
    <h1 class="font-display text-3xl font-medium text-ink-900">
      Checkout
    </h1>

    <div class="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
      <div class="space-y-8">
        <section v-if="!authStore.isLoggedIn">
          <h2 class="text-[15px] font-semibold text-ink-900">
            Contact details
          </h2>
          <p class="mt-1 text-sm text-ink-500">
            Already have an account?
            <NuxtLink
              to="/login?redirect=/checkout"
              class="text-ink-900 underline decoration-stone-300 underline-offset-4"
            >
              Sign in
            </NuxtLink>
          </p>

          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-[13px] font-medium text-ink-700">Full name</label>
              <input
                v-model="guest.name"
                type="text"
                required
                class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
              >
            </div>
            <div>
              <label class="mb-1.5 block text-[13px] font-medium text-ink-700">Phone</label>
              <input
                v-model="guest.phone"
                type="tel"
                required
                placeholder="03XXXXXXXXX"
                class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
              >
            </div>
          </div>
          <div class="mt-4">
            <label class="mb-1.5 block text-[13px] font-medium text-ink-700">Email (optional)</label>
            <input
              v-model="guest.email"
              type="email"
              class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
            >
          </div>
        </section>

        <section>
          <h2 class="text-[15px] font-semibold text-ink-900">
            Shipping address
          </h2>

          <div
            v-if="savedAddresses.length > 0"
            class="mt-4 space-y-2.5"
          >
            <label
              v-for="addr in savedAddresses"
              :key="addr.id"
              class="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition"
              :class="selectedAddressId === addr.id ? 'border-ink-900 bg-white' : 'border-stone-300'"
            >
              <input
                v-model="selectedAddressId"
                type="radio"
                :value="addr.id"
                class="mt-1"
              >
              <div class="text-sm">
                <p class="font-medium text-ink-900">
                  {{ addr.label || addr.recipient_name }}
                  <span
                    v-if="addr.is_default"
                    class="ml-1 text-xs text-ink-400"
                  >Default</span>
                </p>
                <p class="mt-0.5 text-ink-500">
                  {{ addr.recipient_name }} · {{ addr.recipient_phone }}
                </p>
                <p class="text-ink-500">
                  {{ addr.address_line1 }}, {{ addr.city_name }}, {{ addr.state_name }}
                </p>
              </div>
            </label>

            <label
              class="flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition"
              :class="selectedAddressId === 'new' ? 'border-ink-900 bg-white' : 'border-stone-300'"
            >
              <input
                v-model="selectedAddressId"
                type="radio"
                value="new"
              >
              <span class="text-sm font-medium text-ink-900">Use a new address</span>
            </label>
          </div>

          <div
            v-if="selectedAddressId === 'new'"
            class="mt-5"
          >
            <AddressFields v-model="newAddress" />
          </div>
        </section>

        <section>
          <h2 class="text-[15px] font-semibold text-ink-900">
            Payment
          </h2>
          <div class="mt-3 rounded-xl border border-ink-900 bg-white p-4 text-sm">
            <p class="font-medium text-ink-900">
              Cash on Delivery
            </p>
            <p class="mt-0.5 text-ink-500">
              Pay in cash when your order arrives.
            </p>
          </div>
        </section>

        <section>
          <label class="mb-1.5 block text-[13px] font-medium text-ink-700">Order notes (optional)</label>
          <textarea
            v-model="notes"
            rows="3"
            class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
          />
        </section>
      </div>

      <div class="h-fit rounded-2xl bg-stone-100 p-6">
        <h2 class="text-[15px] font-semibold text-ink-900">
          Order summary
        </h2>

        <ul class="mt-4 space-y-3">
          <li
            v-for="item in cart.items"
            :key="item.variantId"
            class="flex justify-between text-sm"
          >
            <span class="text-ink-500">{{ item.productName }} × {{ item.quantity }}</span>
            <span class="text-ink-900">Rs {{ (item.price * item.quantity).toLocaleString() }}</span>
          </li>
        </ul>

        <div class="mt-4 space-y-2 border-t border-stone-200 pt-4 text-sm">
          <div class="flex justify-between">
            <span class="text-ink-500">Subtotal</span>
            <span class="text-ink-900">Rs {{ cart.subtotal.toLocaleString() }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-ink-500">Shipping</span>
            <span
              v-if="shippingEstimate"
              class="text-ink-900"
            >
              Rs {{ shippingEstimate.shipping_cost.toLocaleString() }}
            </span>
            <span
              v-else-if="shippingError"
              class="text-red-600"
            >Unavailable</span>
            <span
              v-else
              class="text-ink-400"
            >Select an address</span>
          </div>
        </div>

        <div class="mt-3 flex justify-between border-t border-stone-200 pt-3 text-[15px] font-medium">
          <span class="text-ink-900">Total</span>
          <span class="text-ink-900">Rs {{ grandTotal.toLocaleString() }}</span>
        </div>

        <p
          v-if="submitError"
          class="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700"
        >
          {{ submitError }}
        </p>

        <button
          type="button"
          :disabled="submitting || !shippingEstimate"
          class="mt-5 w-full rounded-full bg-ink-900 py-3.5 text-[15px] font-medium text-stone-50 transition hover:bg-indigo-900 disabled:opacity-50"
          @click="submit"
        >
          {{ submitting ? 'Placing order...' : 'Place order' }}
        </button>
      </div>
    </div>
  </div>
</template>
