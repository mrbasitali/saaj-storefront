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
  postal_code?: string | null
  is_default: boolean
}

type ShippingEstimate = {
  zone_id: number
  zone_name: string
  shipping_cost: number
  is_free: boolean
}

type PlacedOrderItem = {
  product_name: string | null
  variant_options: string | null
  sku: string | null
  quantity: number
  unit_price: string | number
  line_total: string | number
}

type PlacedOrder = {
  order_number: string
  status: string
  fulfillment_status: string
  payment_method: string
  payment_status: string
  items: PlacedOrderItem[]
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
  placed_at: string | null
}

type CheckoutCreatedAccount = {
  created: boolean
  password_setup: 'now' | 'later'
  setup_email_sent: boolean
  token: string
  customer: {
    id: number
    name: string
    email: string | null
    phone: string | null
    secondary_phone: string | null
    gender: string | null
    date_of_birth: string | null
    address: string | null
    city: string | null
    country: string | null
    email_verified: boolean
    phone_verified: boolean
    is_active?: boolean
  }
}

const { $api } = useNuxtApp()
const authStore = useAuthStore()
const cart = useCartStore()
const router = useRouter()
const customerToken = useCookie<string | null>('saaj_customer_token')
const lastPlacedOrder = useState<PlacedOrder | null>('last-placed-order', () => null)

useSeoMeta({
  title: 'Checkout | SAAJ',
  description: 'Complete your SAAJ order securely.',
  robots: 'noindex,nofollow',
})

// A token can survive a refresh while Pinia starts empty. Hydrate the
// customer before deciding whether this is a guest checkout.
if (customerToken.value && !authStore.isLoggedIn) {
  await authStore.fetchMe()
}

const savedAddresses = ref<SavedAddress[]>([])
const addressesLoading = ref(false)
const selectedAddressId = ref<number | 'new' | null>(null)
const saveNewAddress = ref(true)

async function loadSavedAddresses() {
  if (!authStore.isLoggedIn) {
    selectedAddressId.value = 'new'
    return
  }

  addressesLoading.value = true

  try {
    const response = await $api<{ data: SavedAddress[] }>('/customer/addresses')
    savedAddresses.value = response.data

    const defaultAddress = response.data.find(address => address.is_default) ?? response.data[0]
    selectedAddressId.value = defaultAddress?.id ?? 'new'
  } catch {
    selectedAddressId.value = 'new'
  } finally {
    addressesLoading.value = false
  }
}

await loadSavedAddresses()

const newAddress = reactive<AddressFieldsValue>({
  label: '',
  recipient_name: authStore.customer?.name ?? '',
  recipient_phone: authStore.customer?.phone ?? '',
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

const createAccount = ref(false)
const accountPasswordMode = ref<'later' | 'now'>('later')
const accountPassword = reactive({
  password: '',
  password_confirmation: '',
})
const showAccountPassword = ref(false)

const accountPasswordChecks = computed(() => ({
  length: accountPassword.password.length >= 8,
  letter: /[A-Za-z]/.test(accountPassword.password),
  number: /\d/.test(accountPassword.password),
  match: !!accountPassword.password_confirmation && accountPassword.password === accountPassword.password_confirmation,
}))

const accountSetupComplete = computed(() => (
  authStore.isLoggedIn
  || !createAccount.value
  || accountPasswordMode.value === 'later'
  || (accountPasswordChecks.value.length
    && accountPasswordChecks.value.letter
    && accountPasswordChecks.value.number
    && accountPasswordChecks.value.match)
))

// Guest Contact is the delivery recipient. Keep the backend payload fully
// populated without asking the shopper to type the same name/phone twice.
watch(() => guest.name, value => {
  if (!authStore.isLoggedIn) newAddress.recipient_name = value
})

watch(() => guest.phone, value => {
  if (!authStore.isLoggedIn) newAddress.recipient_phone = value
})

const notes = ref('')
const notesOpen = ref(false)
const mobileSummaryOpen = ref(false)
const paymentMethod = 'cod'

const resolvedAddress = computed(() => {
  if (selectedAddressId.value === 'new' || selectedAddressId.value === null) return null
  return savedAddresses.value.find(address => address.id === selectedAddressId.value) ?? null
})

const resolvedCityId = computed(() => {
  if (selectedAddressId.value === 'new') return newAddress.city_id
  return resolvedAddress.value?.city_id ?? null
})

const shippingEstimate = ref<ShippingEstimate | null>(null)
const shippingPending = ref(false)
const shippingError = ref('')
let shippingRequestId = 0

watch(
  [resolvedCityId, () => cart.subtotal, () => cart.totalItems],
  async ([cityId, subtotal, quantity]) => {
    const requestId = ++shippingRequestId

    shippingEstimate.value = null
    shippingError.value = ''

    if (!cityId || !quantity) {
      shippingPending.value = false
      return
    }

    shippingPending.value = true

    try {
      const response = await $api<ShippingEstimate>('/shipping/estimate', {
        query: {
          city_id: cityId,
          subtotal,
          quantity,
        },
      })

      if (requestId !== shippingRequestId) return
      shippingEstimate.value = response
    } catch (error: any) {
      if (requestId !== shippingRequestId) return
      shippingError.value = extractApiErrorMessage(error, 'Shipping is not available to this location yet.')
    } finally {
      if (requestId === shippingRequestId) shippingPending.value = false
    }
  },
  { immediate: true },
)

const grandTotal = computed(() => cart.subtotal + (shippingEstimate.value?.shipping_cost ?? 0))
const submitting = ref(false)
const submitSucceeded = ref(false)
const submitError = ref('')
const submitErrorEl = ref<HTMLElement | null>(null)
const accountConflict = ref(false)
const accountConflictEl = ref<HTMLElement | null>(null)

function apiErrorData(error: any) {
  return error?.data ?? error?.response?._data ?? error?.response?.data ?? null
}

watch([() => guest.email, () => guest.phone], () => {
  // If the shopper changes the contact details after an account conflict,
  // let the next checkout attempt be evaluated afresh.
  accountConflict.value = false
})

function applyNewAddress(value: AddressFieldsValue) {
  // `newAddress` is a reactive object. Mutate it in place instead of
  // replacing it through component v-model so City/Province changes are
  // immediately visible to the shipping watcher on guest checkout.
  Object.assign(newAddress, value)
}

const inlineAddressComplete = computed(() => (
  !!newAddress.recipient_name.trim()
  && !!newAddress.recipient_phone.trim()
  && !!newAddress.address_line1.trim()
  && !!newAddress.country_id
  && !!newAddress.state_id
  && !!newAddress.city_id
))

const guestContactComplete = computed(() => (
  authStore.isLoggedIn
  || (!!guest.name.trim() && !!guest.phone.trim() && !!guest.email.trim())
))

const deliverySelectionComplete = computed(() => {
  if (selectedAddressId.value === 'new' || selectedAddressId.value === null) {
    return inlineAddressComplete.value
  }

  return !!resolvedAddress.value
})

const canPlaceOrder = computed(() => (
  cart.hydrated
  && cart.items.length > 0
  && guestContactComplete.value
  && accountSetupComplete.value
  && deliverySelectionComplete.value
  && !!shippingEstimate.value
  && !shippingPending.value
  && !submitting.value
))

const placeOrderHint = computed(() => {
  if (submitting.value) return 'Placing your order…'
  if (!guestContactComplete.value) return 'Add your name, phone number and email for order confirmation.'
  if (!accountSetupComplete.value) return 'Finish your account password or choose to set it later.'
  if (!deliverySelectionComplete.value) return 'Complete your delivery address.'
  if (shippingPending.value) return 'Calculating delivery for this location…'
  if (shippingError.value) return shippingError.value
  if (!shippingEstimate.value) return 'Select a city so we can calculate delivery.'
  return ''
})

const itemLabel = computed(() => {
  const count = cart.totalItems
  return `${count} ${count === 1 ? 'piece' : 'pieces'}`
})

function formatPrice(value: number | string) {
  return `Rs ${Number(value || 0).toLocaleString('en-PK')}`
}

function shippingLabel() {
  if (shippingPending.value) return 'Calculating…'
  if (shippingError.value) return 'Unavailable'
  if (!shippingEstimate.value) return 'Select delivery location'
  if (shippingEstimate.value.is_free || shippingEstimate.value.shipping_cost === 0) return 'Complimentary'
  return formatPrice(shippingEstimate.value.shipping_cost)
}

function selectedAddressSummary(address: SavedAddress) {
  return [
    address.address_line1,
    address.address_line2,
    address.city_name,
    address.state_name,
  ].filter(Boolean).join(', ')
}

async function submit() {
  if (submitting.value) return

  submitError.value = ''
  accountConflict.value = false

  if (!shippingEstimate.value) {
    submitError.value = shippingError.value || 'Choose a delivery address so we can calculate shipping.'
    await nextTick()
    submitErrorEl.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }

  submitting.value = true
  submitSucceeded.value = false

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

    // Saving is automatic for a checkout-created account. Signed-in shoppers
    // keep control through the "Save for next time" switch, which defaults on.
    payload.save_address = authStore.isLoggedIn ? saveNewAddress.value : createAccount.value
    if ((authStore.isLoggedIn && saveNewAddress.value) || (!authStore.isLoggedIn && createAccount.value)) {
      payload.address_label = newAddress.label.trim() || undefined
    }
  }

  if (!authStore.isLoggedIn) {
    payload.guest_name = guest.name
    payload.guest_email = guest.email
    payload.guest_phone = guest.phone
    payload.create_account = createAccount.value

    if (createAccount.value) {
      payload.account_password_mode = accountPasswordMode.value
      if (accountPasswordMode.value === 'now') {
        payload.password = accountPassword.password
        payload.password_confirmation = accountPassword.password_confirmation
      }
    }
  }

  try {
    const response = await $api<{ data: PlacedOrder, account?: CheckoutCreatedAccount | null }>('/customer/checkout', {
      method: 'POST',
      body: payload,
    })

    // Keep the just-created order available to the confirmation screen even
    // for guests. Session storage also survives a refresh in the same tab.
    lastPlacedOrder.value = response.data

    if (response.account?.created) {
      authStore.acceptSession({
        token: response.account.token,
        customer: response.account.customer,
      })
    }

    if (import.meta.client) {
      sessionStorage.setItem(
        `saaj_order_confirmation_${response.data.order_number}`,
        JSON.stringify(response.data),
      )
      if (response.account?.created) {
        sessionStorage.setItem(
          `saaj_order_account_${response.data.order_number}`,
          JSON.stringify({
            password_setup: response.account.password_setup,
            setup_email_sent: response.account.setup_email_sent,
            email: response.account.customer.email,
          }),
        )
      }
    }

    submitSucceeded.value = true
    cart.clear()

    // Brief visual acknowledgement before navigation without making a fast
    // checkout feel artificially slow.
    await new Promise(resolve => setTimeout(resolve, 220))
    await router.push(`/order-confirmation/${response.data.order_number}`)
  } catch (error: any) {
    const data = apiErrorData(error)

    if (data?.code === 'customer_account_exists' || data?.account_exists === true) {
      accountConflict.value = true
      submitError.value = ''
      await nextTick()
      accountConflictEl.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else {
      submitError.value = extractApiErrorMessage(error, 'Could not place your order. Please check your details and try again.')
      await nextTick()
      submitErrorEl.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  if (!cart.hydrated) cart.hydrate()
  await nextTick()

  if (cart.items.length === 0) {
    await navigateTo('/cart')
  }
})
</script>

<template>
  <main class="min-h-[76vh] bg-paper-50 pb-36 text-charcoal-950 lg:pb-24">
    <div class="mx-auto max-w-[1500px] px-5 pt-8 sm:px-8 sm:pt-10 lg:px-10 lg:pt-12">
      <nav
        aria-label="Checkout progress"
        class="flex items-center gap-2 overflow-x-auto pb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400 sm:gap-3"
      >
        <NuxtLink to="/cart" class="flex shrink-0 items-center gap-2 text-charcoal-500 transition hover:text-charcoal-950">
          <span class="flex h-5 w-5 items-center justify-center rounded-full border border-charcoal-950/18 text-[8px]">✓</span>
          Bag
        </NuxtLink>
        <span class="h-px w-7 shrink-0 bg-charcoal-950/15 sm:w-10" />
        <span class="flex shrink-0 items-center gap-2 text-charcoal-950">
          <span class="flex h-5 w-5 items-center justify-center rounded-full bg-charcoal-950 text-[8px] text-paper-50">02</span>
          Delivery
        </span>
        <span class="h-px w-7 shrink-0 bg-charcoal-950/15 sm:w-10" />
        <span class="flex shrink-0 items-center gap-2">
          <span class="flex h-5 w-5 items-center justify-center rounded-full border border-charcoal-950/15 text-[8px]">03</span>
          Confirmation
        </span>
      </nav>

      <header class="mt-7 border-b border-charcoal-950/10 pb-6 sm:mt-9 sm:pb-7">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="section-kicker">Secure checkout</p>
            <h1 class="mt-2 font-display text-[38px] font-medium leading-none tracking-[-0.035em] sm:text-[46px] lg:text-[52px]">
              Delivery & payment
            </h1>
          </div>
          <p class="max-w-[340px] text-[11px] leading-5 text-charcoal-400 sm:text-right">
            Your order is only confirmed after the final stock and delivery check.
          </p>
        </div>
      </header>

      <!-- Mobile order summary teaser -->
      <section v-if="cart.hydrated && cart.items.length" class="border-b border-charcoal-950/10 lg:hidden">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-5 py-4 text-left"
          :aria-expanded="mobileSummaryOpen"
          @click="mobileSummaryOpen = !mobileSummaryOpen"
        >
          <div>
            <p class="text-[9px] font-semibold uppercase tracking-[0.15em] text-charcoal-400">Order summary · {{ itemLabel }}</p>
            <p class="mt-1 text-[14px] font-medium tabular-nums">{{ formatPrice(grandTotal) }}</p>
          </div>
          <svg
            viewBox="0 0 24 24"
            class="h-4 w-4 transition duration-200"
            :class="mobileSummaryOpen ? 'rotate-180' : ''"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <Transition name="checkout-reveal">
          <div v-if="mobileSummaryOpen" class="pb-5">
            <ul class="space-y-4">
              <li v-for="item in cart.items" :key="item.variantId" class="grid grid-cols-[54px_minmax(0,1fr)_auto] items-start gap-3">
                <div class="relative aspect-[3/4] overflow-hidden bg-mist-100">
                  <NuxtImg v-if="item.imageUrl" :src="item.imageUrl" :alt="item.productName" class="h-full w-full object-cover" sizes="54px" />
                  <span class="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-charcoal-950 px-1 text-[8px] font-semibold text-paper-50">{{ item.quantity }}</span>
                </div>
                <div class="min-w-0 pt-0.5">
                  <p class="truncate text-[12px] font-medium">{{ item.productName }}</p>
                  <p v-if="item.optionSummary" class="mt-1 truncate text-[10px] text-charcoal-400">{{ item.optionSummary }}</p>
                </div>
                <p class="pt-0.5 text-[11px] font-medium tabular-nums">{{ formatPrice(item.price * item.quantity) }}</p>
              </li>
            </ul>

            <div class="mt-5 space-y-2 border-t border-charcoal-950/10 pt-4 text-[11px]">
              <div class="flex justify-between gap-5"><span class="text-charcoal-500">Subtotal</span><span class="tabular-nums">{{ formatPrice(cart.subtotal) }}</span></div>
              <div class="flex justify-between gap-5"><span class="text-charcoal-500">Delivery</span><span :class="shippingError ? 'text-red-600' : ''">{{ shippingLabel() }}</span></div>
            </div>
          </div>
        </Transition>
      </section>

      <div v-if="!cart.hydrated" class="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-16" aria-busy="true">
        <div class="space-y-10">
          <div v-for="index in 3" :key="index">
            <div class="skeleton h-3 w-28" />
            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <div class="skeleton h-13" />
              <div class="skeleton h-13" />
            </div>
          </div>
        </div>
        <div class="hidden lg:block"><div class="skeleton h-[460px]" /></div>
      </div>

      <form
        v-else-if="cart.items.length"
        id="checkout-form"
        class="grid gap-12 py-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-14 xl:gap-20"
        @submit.prevent="submit"
      >
        <div class="min-w-0 space-y-12 lg:space-y-14">
          <section v-if="!authStore.isLoggedIn" aria-labelledby="contact-heading">
            <div class="flex items-start justify-between gap-6 border-b border-charcoal-950/10 pb-4">
              <div class="flex items-start gap-3">
                <span class="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">01</span>
                <div>
                  <h2 id="contact-heading" class="text-[14px] font-semibold tracking-[-0.01em]">Contact</h2>
                  <p class="mt-1 text-[11px] leading-5 text-charcoal-400">For order updates and delivery questions.</p>
                </div>
              </div>
              <NuxtLink to="/login?redirect=/checkout" class="text-link hidden sm:inline-flex">Sign in</NuxtLink>
            </div>

            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <label class="checkout-field sm:col-span-1">
                <span>Full name</span>
                <input v-model="guest.name" type="text" autocomplete="name" required placeholder="Your name">
              </label>
              <label class="checkout-field sm:col-span-1">
                <span>Phone</span>
                <input v-model="guest.phone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="03XXXXXXXXX">
              </label>
              <label class="checkout-field sm:col-span-2">
                <span>Email <em>for confirmation</em></span>
                <input v-model="guest.email" type="email" autocomplete="email" required placeholder="you@example.com">
              </label>
            </div>

            <div class="mt-5 border border-charcoal-950/10 bg-mist-50/70 p-4 sm:p-5">
              <div class="flex items-start justify-between gap-5">
                <div class="min-w-0">
                  <p class="text-[12px] font-semibold tracking-[-0.01em]">Create a SAAJ account with this order?</p>
                  <p class="mt-1 text-[10px] leading-5 text-charcoal-500">See all your orders in one place, track updates, save delivery addresses and keep your wishlist synced.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label="Create a SAAJ account with this order"
                  :aria-checked="createAccount"
                  class="checkout-account-switch"
                  :class="{ 'is-on': createAccount }"
                  @click="createAccount = !createAccount"
                >
                  <span class="checkout-account-switch-knob" aria-hidden="true" />
                </button>
              </div>

              <Transition name="checkout-reveal">
                <div v-if="createAccount" class="mt-5 border-t border-charcoal-950/10 pt-4">
                  <p class="text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">Choose how to finish setup</p>
                  <div class="mt-3 grid gap-2 sm:grid-cols-2">
                    <label class="checkout-account-option" :class="accountPasswordMode === 'later' ? 'is-selected' : ''">
                      <input v-model="accountPasswordMode" class="sr-only" type="radio" value="later">
                      <span class="checkout-radio-dot" aria-hidden="true" />
                      <span><strong>Email me a setup link</strong><small>Fastest checkout. Choose your password securely after ordering.</small></span>
                    </label>
                    <label class="checkout-account-option" :class="accountPasswordMode === 'now' ? 'is-selected' : ''">
                      <input v-model="accountPasswordMode" class="sr-only" type="radio" value="now">
                      <span class="checkout-radio-dot" aria-hidden="true" />
                      <span><strong>Set password now</strong><small>Your account is ready before you leave checkout.</small></span>
                    </label>
                  </div>

                  <Transition name="checkout-reveal">
                    <div v-if="accountPasswordMode === 'now'" class="mt-4 grid gap-4 sm:grid-cols-2">
                      <label class="checkout-field">
                        <span>Password</span>
                        <div class="relative">
                          <input v-model="accountPassword.password" :type="showAccountPassword ? 'text' : 'password'" autocomplete="new-password" required>
                          <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-[0.1em] text-charcoal-400" @click="showAccountPassword = !showAccountPassword">{{ showAccountPassword ? 'Hide' : 'Show' }}</button>
                        </div>
                      </label>
                      <label class="checkout-field">
                        <span>Confirm password</span>
                        <input v-model="accountPassword.password_confirmation" :type="showAccountPassword ? 'text' : 'password'" autocomplete="new-password" required>
                      </label>
                      <div class="sm:col-span-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px]">
                        <span :class="accountPasswordChecks.length ? 'text-[#657d6c]' : 'text-charcoal-400'">{{ accountPasswordChecks.length ? '✓' : '○' }} 8+ characters</span>
                        <span :class="accountPasswordChecks.letter ? 'text-[#657d6c]' : 'text-charcoal-400'">{{ accountPasswordChecks.letter ? '✓' : '○' }} Letter</span>
                        <span :class="accountPasswordChecks.number ? 'text-[#657d6c]' : 'text-charcoal-400'">{{ accountPasswordChecks.number ? '✓' : '○' }} Number</span>
                        <span :class="accountPasswordChecks.match ? 'text-[#657d6c]' : 'text-charcoal-400'">{{ accountPasswordChecks.match ? '✓' : '○' }} Passwords match</span>
                      </div>
                    </div>
                  </Transition>
                </div>
              </Transition>
            </div>

            <NuxtLink to="/login?redirect=/checkout" class="mt-4 inline-flex text-[10px] font-semibold uppercase tracking-[0.12em] text-charcoal-500 sm:hidden">
              Already have an account? Sign in
            </NuxtLink>

            <Transition name="checkout-reveal">
              <div
                v-if="accountConflict"
                ref="accountConflictEl"
                role="alert"
                class="mt-5 border border-rose-300/80 border-l-2 border-l-rose-500 bg-rose-50/70 px-4 py-4 shadow-[0_10px_30px_rgba(153,27,27,0.04)] sm:px-5 dark:border-rose-900/70 dark:border-l-rose-500 dark:bg-rose-950/20"
              >
                <div class="flex items-start gap-3">
                  <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rose-300 bg-white/60 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300" aria-hidden="true">
                    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5">
                      <circle cx="12" cy="8" r="3.25" />
                      <path d="M5.5 19c.8-3.4 3-5.1 6.5-5.1s5.7 1.7 6.5 5.1" />
                    </svg>
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="text-[12px] font-semibold text-rose-950 dark:text-rose-100">It looks like you already have a SAAJ account.</p>
                      <span class="rounded-full border border-rose-300/80 bg-white/60 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">Sign in required</span>
                    </div>
                    <p class="mt-1 text-[11px] leading-5 text-rose-900/70 dark:text-rose-100/70">
                      Sign in to continue with these contact details and keep this order connected to your account.
                    </p>
                    <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                      <NuxtLink
                        to="/login?redirect=/checkout"
                        class="inline-flex items-center gap-2 bg-charcoal-950 px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-paper-50 transition hover:opacity-80"
                      >
                        Sign in to continue
                        <span aria-hidden="true">→</span>
                      </NuxtLink>
                      <NuxtLink to="/forgot-password" class="text-link">Forgot password?</NuxtLink>
                    </div>
                    <p class="mt-3 text-[9px] leading-4 text-rose-900/55 dark:text-rose-100/55">Or use different contact details to continue as a guest.</p>
                  </div>
                </div>
              </div>
            </Transition>
          </section>

          <section aria-labelledby="delivery-heading">
            <div class="flex items-start justify-between gap-6 border-b border-charcoal-950/10 pb-4">
              <div class="flex items-start gap-3">
                <span class="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">{{ authStore.isLoggedIn ? '01' : '02' }}</span>
                <div>
                  <h2 id="delivery-heading" class="text-[14px] font-semibold tracking-[-0.01em]">Delivery address</h2>
                  <p class="mt-1 text-[11px] leading-5 text-charcoal-400">Where should we send your SAAJ order?</p>
                </div>
              </div>
              <NuxtLink v-if="authStore.isLoggedIn && savedAddresses.length" to="/account/addresses" class="text-link hidden sm:inline-flex">Manage</NuxtLink>
            </div>

            <div v-if="addressesLoading" class="mt-5 grid gap-3 sm:grid-cols-2">
              <div class="skeleton h-28" />
              <div class="skeleton h-28" />
            </div>

            <div v-else-if="savedAddresses.length" class="mt-5 grid gap-3 sm:grid-cols-2">
              <label
                v-for="address in savedAddresses"
                :key="address.id"
                class="checkout-address-card"
                :class="selectedAddressId === address.id ? 'is-selected' : ''"
              >
                <input v-model="selectedAddressId" type="radio" name="delivery-address" :value="address.id" class="sr-only">
                <span class="checkout-radio-dot" aria-hidden="true" />
                <span class="min-w-0">
                  <span class="flex flex-wrap items-center gap-2">
                    <strong class="text-[12px] font-semibold">{{ address.label || address.recipient_name }}</strong>
                    <small v-if="address.is_default" class="text-[8px] font-semibold uppercase tracking-[0.13em] text-charcoal-400">Default</small>
                  </span>
                  <span class="mt-2 block text-[11px] leading-5 text-charcoal-500">{{ address.recipient_name }} · {{ address.recipient_phone }}</span>
                  <span class="mt-0.5 block text-[11px] leading-5 text-charcoal-400">{{ selectedAddressSummary(address) }}</span>
                </span>
              </label>

              <label class="checkout-address-card" :class="selectedAddressId === 'new' ? 'is-selected' : ''">
                <input v-model="selectedAddressId" type="radio" name="delivery-address" value="new" class="sr-only">
                <span class="checkout-radio-dot" aria-hidden="true" />
                <span>
                  <strong class="text-[12px] font-semibold">Use a new address</strong>
                  <span class="mt-2 block text-[11px] leading-5 text-charcoal-400">Enter a different recipient or delivery location.</span>
                </span>
              </label>
            </div>

            <Transition name="checkout-reveal">
              <div v-if="selectedAddressId === 'new'" :class="savedAddresses.length ? 'mt-7' : 'mt-5'">
                <div class="mb-4 border-b border-charcoal-950/8 pb-4">
                  <div v-if="authStore.isLoggedIn" class="checkout-save-address-row">
                    <div class="min-w-0">
                      <p class="text-[11px] font-medium">Save this address for next time</p>
                      <p class="mt-0.5 text-[10px] leading-5 text-charcoal-400">It will appear here automatically on your next checkout.</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-label="Save this delivery address for next time"
                      :aria-checked="saveNewAddress"
                      class="checkout-account-switch"
                      :class="{ 'is-on': saveNewAddress }"
                      @click="saveNewAddress = !saveNewAddress"
                    >
                      <span class="checkout-account-switch-knob" aria-hidden="true" />
                    </button>
                  </div>

                  <div v-else-if="createAccount" class="checkout-address-benefit">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                    <span>This delivery address will be saved to your new account, ready for your next order.</span>
                  </div>

                  <p v-else class="text-[10px] leading-5 text-charcoal-400">
                    No account required — your contact name and phone are used as the delivery recipient automatically.
                  </p>
                </div>

                <AddressFields
                  :model-value="newAddress"
                  :show-label="(authStore.isLoggedIn && saveNewAddress) || (!authStore.isLoggedIn && createAccount)"
                  :show-recipient-fields="authStore.isLoggedIn"
                  @update:model-value="applyNewAddress"
                />
              </div>
            </Transition>

            <div class="mt-6 border-y border-charcoal-950/10 py-4">
              <div class="flex items-center justify-between gap-6">
                <div class="flex min-w-0 items-center gap-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-charcoal-950/12">
                    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
                      <path d="M3 7h11v10H3zM14 10h3l4 4v3h-7z" />
                      <circle cx="7" cy="18" r="1.5" /><circle cx="17.5" cy="18" r="1.5" />
                    </svg>
                  </span>
                  <div class="min-w-0">
                    <p class="text-[11px] font-medium">Delivery</p>
                    <p v-if="shippingEstimate" class="mt-0.5 truncate text-[10px] text-charcoal-400">{{ shippingEstimate.zone_name }}</p>
                    <p v-else class="mt-0.5 text-[10px] text-charcoal-400">Calculated from your city</p>
                  </div>
                </div>

                <div class="text-right">
                  <span v-if="shippingPending" class="inline-flex items-center gap-2 text-[10px] text-charcoal-400">
                    <span class="checkout-spinner" aria-hidden="true" /> Calculating
                  </span>
                  <span v-else class="text-[11px] font-medium tabular-nums" :class="shippingError ? 'text-red-600' : ''">{{ shippingLabel() }}</span>
                </div>
              </div>

              <p v-if="shippingError" class="mt-3 border-t border-red-500/15 pt-3 text-[11px] leading-5 text-red-600">{{ shippingError }}</p>
            </div>
          </section>

          <section aria-labelledby="payment-heading">
            <div class="flex items-start gap-3 border-b border-charcoal-950/10 pb-4">
              <span class="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">{{ authStore.isLoggedIn ? '02' : '03' }}</span>
              <div>
                <h2 id="payment-heading" class="text-[14px] font-semibold tracking-[-0.01em]">Payment</h2>
                <p class="mt-1 text-[11px] leading-5 text-charcoal-400">Simple and secure for launch.</p>
              </div>
            </div>

            <div class="mt-5 flex items-start justify-between gap-5 border border-charcoal-950 bg-paper-50 px-4 py-4 sm:px-5">
              <div class="flex items-start gap-3">
                <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-charcoal-950">
                  <span class="h-2.5 w-2.5 rounded-full bg-charcoal-950" />
                </span>
                <div>
                  <p class="text-[12px] font-semibold">Cash on Delivery</p>
                  <p class="mt-1 text-[11px] leading-5 text-charcoal-400">Pay when your order reaches you.</p>
                </div>
              </div>
              <span class="text-[8px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">Selected</span>
            </div>
          </section>

          <section>
            <button type="button" class="group flex w-full items-center justify-between border-b border-charcoal-950/10 pb-4 text-left" @click="notesOpen = !notesOpen">
              <span>
                <span class="text-[12px] font-semibold">Order note</span>
                <span class="ml-2 text-[10px] text-charcoal-400">Optional</span>
              </span>
              <svg viewBox="0 0 24 24" class="h-4 w-4 transition duration-200" :class="notesOpen ? 'rotate-45' : ''" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            </button>
            <Transition name="checkout-reveal">
              <label v-if="notesOpen" class="checkout-field mt-5">
                <span>Anything we should know?</span>
                <textarea v-model="notes" rows="3" maxlength="1000" placeholder="Delivery note, gift instruction…" />
              </label>
            </Transition>
          </section>

          <p
            v-if="submitError"
            ref="submitErrorEl"
            role="alert"
            class="border border-red-500/20 bg-red-500/[0.045] px-4 py-3 text-[11px] leading-5 text-red-600"
          >
            {{ submitError }}
          </p>
        </div>

        <!-- Desktop order summary -->
        <aside class="hidden lg:block">
          <div class="sticky top-[126px] bg-mist-50 px-7 py-8 xl:px-8">
            <div class="flex items-center justify-between border-b border-charcoal-950/10 pb-5">
              <h2 class="font-display text-[28px] font-medium leading-none tracking-[-0.025em]">Order summary</h2>
              <span class="text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">{{ itemLabel }}</span>
            </div>

            <ul class="max-h-[330px] space-y-4 overflow-y-auto py-5 pr-1">
              <li v-for="item in cart.items" :key="item.variantId" class="grid grid-cols-[58px_minmax(0,1fr)_auto] items-start gap-3">
                <NuxtLink :to="`/products/${item.productSlug}`" class="relative aspect-[3/4] overflow-hidden bg-mist-100">
                  <NuxtImg v-if="item.imageUrl" :src="item.imageUrl" :alt="item.productName" class="h-full w-full object-cover" sizes="58px" />
                  <span class="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-charcoal-950 px-1 text-[8px] font-semibold text-paper-50">{{ item.quantity }}</span>
                </NuxtLink>
                <div class="min-w-0 pt-0.5">
                  <NuxtLink :to="`/products/${item.productSlug}`" class="block truncate text-[11px] font-medium transition hover:opacity-60">{{ item.productName }}</NuxtLink>
                  <p v-if="item.optionSummary" class="mt-1 truncate text-[9px] text-charcoal-400">{{ item.optionSummary }}</p>
                </div>
                <p class="pt-0.5 text-[10px] font-medium tabular-nums">{{ formatPrice(item.price * item.quantity) }}</p>
              </li>
            </ul>

            <div class="space-y-3 border-t border-charcoal-950/10 py-5 text-[11px]">
              <div class="flex items-center justify-between gap-6"><span class="text-charcoal-500">Subtotal</span><span class="font-medium tabular-nums">{{ formatPrice(cart.subtotal) }}</span></div>
              <div class="flex items-center justify-between gap-6"><span class="text-charcoal-500">Delivery</span><span class="text-right" :class="shippingError ? 'text-red-600' : 'text-charcoal-500'">{{ shippingLabel() }}</span></div>
            </div>

            <div class="border-t border-charcoal-950/10 pt-5">
              <div class="flex items-end justify-between gap-6">
                <div>
                  <p class="text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">Total</p>
                  <p class="mt-1 text-[10px] leading-5 text-charcoal-400">Cash on delivery</p>
                </div>
                <p class="font-display text-[28px] font-medium leading-none tabular-nums tracking-[-0.025em]">{{ formatPrice(grandTotal) }}</p>
              </div>

              <button
                type="submit"
                :disabled="!canPlaceOrder"
                class="checkout-place-button mt-7 flex min-h-13 w-full items-center justify-center gap-3 bg-charcoal-950 px-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-50 disabled:cursor-not-allowed disabled:opacity-45"
                :class="{ 'is-loading': submitting, 'is-success': submitSucceeded }"
              >
                <span v-if="submitting" class="checkout-spinner is-light" aria-hidden="true" />
                <svg v-else-if="submitSucceeded" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m5 12 4 4 10-10" /></svg>
                <span>{{ submitting ? 'Placing order…' : submitSucceeded ? 'Order placed' : 'Place order' }}</span>
                <svg v-if="!submitting && !submitSucceeded" viewBox="0 0 24 24" class="h-3.5 w-3.5 transition duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
              </button>

              <p
                v-if="!canPlaceOrder && placeOrderHint"
                class="mt-4 text-center text-[9px] leading-5"
                :class="shippingError ? 'text-red-600' : 'text-charcoal-400'"
              >
                {{ placeOrderHint }}
              </p>
              <p v-else class="mt-4 text-center text-[9px] leading-5 text-charcoal-400">By placing the order, you confirm the delivery information above is correct.</p>
            </div>
          </div>
        </aside>
      </form>
    </div>

    <!-- Mobile final action. `form=` preserves native required-field validation. -->
    <Transition name="checkout-sticky">
      <div
        v-if="cart.hydrated && cart.items.length"
        class="mobile-safe-action-bar fixed inset-x-0 bottom-0 z-40 border-t border-charcoal-950/10 bg-paper-50/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden"
      >
        <div class="mx-auto flex max-w-xl items-center gap-4">
          <div class="min-w-0 flex-1">
            <p class="text-[8px] font-semibold uppercase tracking-[0.14em] text-charcoal-400">{{ !canPlaceOrder && placeOrderHint ? 'Next step' : 'Total' }}</p>
            <p v-if="!canPlaceOrder && placeOrderHint" class="mt-0.5 truncate text-[10px] text-charcoal-500">{{ placeOrderHint }}</p>
            <p v-else class="mt-0.5 truncate text-[14px] font-medium tabular-nums">{{ formatPrice(grandTotal) }}</p>
          </div>
          <button
            form="checkout-form"
            type="submit"
            :disabled="!canPlaceOrder"
            class="checkout-place-button flex min-h-12 min-w-[172px] items-center justify-center gap-2 bg-charcoal-950 px-5 text-[9px] font-semibold uppercase tracking-[0.15em] text-paper-50 disabled:cursor-not-allowed disabled:opacity-45"
            :class="{ 'is-loading': submitting, 'is-success': submitSucceeded }"
          >
            <span v-if="submitting" class="checkout-spinner is-light" aria-hidden="true" />
            <svg v-else-if="submitSucceeded" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m5 12 4 4 10-10" /></svg>
            {{ submitting ? 'Placing…' : submitSucceeded ? 'Placed' : 'Place order' }}
          </button>
        </div>
      </div>
    </Transition>
  </main>
</template>

<style scoped>
.checkout-field {
  display: grid;
  gap: 7px;
}

.checkout-field > span {
  font-size: 9px;
  font-weight: 650;
  letter-spacing: .13em;
  text-transform: uppercase;
  color: var(--color-charcoal-400);
}

.checkout-field em {
  font-style: normal;
  font-weight: 500;
  letter-spacing: .04em;
  text-transform: none;
}

.checkout-field :is(input, textarea) {
  width: 100%;
  min-height: 50px;
  border: 1px solid color-mix(in srgb, var(--color-charcoal-950) 14%, transparent);
  background: var(--color-paper-50);
  padding: 0 14px;
  color: var(--color-charcoal-950);
  font-size: 16px;
  line-height: 1.4;
  outline: none;
  transition: border-color 160ms ease, background-color 160ms ease;
}

.checkout-field textarea {
  min-height: 104px;
  padding-top: 13px;
  padding-bottom: 13px;
  resize: vertical;
}

.checkout-field :is(input, textarea)::placeholder {
  color: var(--color-charcoal-350);
}

.checkout-field :is(input, textarea):focus {
  border-color: color-mix(in srgb, var(--color-charcoal-950) 70%, transparent);
}

.checkout-address-card {
  position: relative;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 12px;
  min-height: 112px;
  cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--color-charcoal-950) 12%, transparent);
  padding: 16px;
  transition: border-color 160ms ease, background-color 160ms ease, transform 160ms ease;
}

.checkout-address-card:hover {
  border-color: color-mix(in srgb, var(--color-charcoal-950) 35%, transparent);
}

.checkout-address-card.is-selected {
  border-color: var(--color-charcoal-950);
  background: color-mix(in srgb, var(--color-mist-50) 72%, transparent);
}

.checkout-radio-dot {
  position: relative;
  margin-top: 1px;
  height: 17px;
  width: 17px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-charcoal-950) 38%, transparent);
}

.checkout-address-card.is-selected .checkout-radio-dot {
  border-color: var(--color-charcoal-950);
}

.checkout-address-card.is-selected .checkout-radio-dot::after {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: inherit;
  background: var(--color-charcoal-950);
}



.checkout-save-address-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.checkout-address-benefit {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  color: var(--color-charcoal-500);
  font-size: 10px;
  line-height: 1.8;
}

.checkout-address-benefit svg {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
  margin-top: 1px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.checkout-account-switch {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  width: 44px;
  height: 24px;
  margin-top: 1px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-charcoal-950) 15%, transparent);
  cursor: pointer;
  vertical-align: middle;
  transition: background-color 180ms ease, box-shadow 180ms ease;
}

.checkout-account-switch.is-on {
  background: var(--color-charcoal-950);
}

.checkout-account-switch-knob {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: var(--color-paper-50);
  box-shadow: 0 1px 3px rgba(0, 0, 0, .16);
  transform: translate3d(0, 0, 0);
  transition: transform 200ms cubic-bezier(.22, 1, .36, 1);
  will-change: transform;
}

.checkout-account-switch.is-on .checkout-account-switch-knob {
  transform: translate3d(20px, 0, 0);
}

.checkout-account-switch:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--color-charcoal-950) 55%, transparent);
  outline-offset: 3px;
}

.checkout-account-option {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 11px;
  cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--color-charcoal-950) 10%, transparent);
  background: color-mix(in srgb, var(--color-paper-50) 78%, transparent);
  padding: 13px;
  transition: border-color 160ms ease, background-color 160ms ease;
}

.checkout-account-option.is-selected {
  border-color: color-mix(in srgb, var(--color-charcoal-950) 65%, transparent);
  background: var(--color-paper-50);
}

.checkout-account-option strong {
  display: block;
  font-size: 11px;
  font-weight: 650;
}

.checkout-account-option small {
  display: block;
  margin-top: 4px;
  color: var(--color-charcoal-400);
  font-size: 9px;
  line-height: 1.65;
}

.checkout-account-option.is-selected .checkout-radio-dot {
  border-color: var(--color-charcoal-950);
}
.checkout-account-option.is-selected .checkout-radio-dot::after {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: inherit;
  background: var(--color-charcoal-950);
}

.checkout-spinner {
  display: inline-block;
  width: 13px;
  height: 13px;
  border: 1.5px solid color-mix(in srgb, var(--color-charcoal-950) 22%, transparent);
  border-top-color: var(--color-charcoal-950);
  border-radius: 999px;
  animation: checkout-spin .7s linear infinite;
}

.checkout-spinner.is-light {
  border-color: rgba(255, 255, 255, .34);
  border-top-color: white;
}

.checkout-place-button {
  position: relative;
  overflow: hidden;
  transition: transform 150ms ease, opacity 150ms ease, background-color 180ms ease;
}

.checkout-place-button:not(:disabled):active {
  transform: scale(.985);
}

.checkout-place-button.is-loading::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 25%, rgba(255,255,255,.11) 50%, transparent 75%);
  transform: translateX(-100%);
  animation: checkout-sheen 1.15s ease-in-out infinite;
}

.checkout-place-button.is-success {
  background: #33463f;
}

.checkout-reveal-enter-active,
.checkout-reveal-leave-active {
  transition: opacity 220ms ease, transform 260ms cubic-bezier(.22,1,.36,1);
}
.checkout-reveal-enter-from,
.checkout-reveal-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.checkout-sticky-enter-active,
.checkout-sticky-leave-active {
  transition: transform 260ms cubic-bezier(.22,1,.36,1), opacity 180ms ease;
}
.checkout-sticky-enter-from,
.checkout-sticky-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

@keyframes checkout-spin { to { transform: rotate(360deg); } }
@keyframes checkout-sheen { to { transform: translateX(100%); } }

@media (min-width: 768px) {
  .checkout-field :is(input, textarea) {
    font-size: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .checkout-address-card,
  .checkout-place-button,
  .checkout-reveal-enter-active,
  .checkout-reveal-leave-active,
  .checkout-sticky-enter-active,
  .checkout-sticky-leave-active {
    transition: none !important;
  }
  .checkout-spinner,
  .checkout-place-button.is-loading::after {
    animation: none !important;
  }
}
</style>
