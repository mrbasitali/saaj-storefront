<script setup lang="ts">
import type { AddressFieldsValue } from '~/components/AddressFields.vue'

type CorrectionRequest = {
  order_number: string
  expires_at: string
  fields: ('address' | 'email' | 'phone')[]
}

definePageMeta({ key: route => route.fullPath })
useSeoMeta({ title: 'Update order details | SAAJ', robots: 'noindex, nofollow' })

const { $api } = useNuxtApp()
const correction = ref<CorrectionRequest>()
const complete = ref(false)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const email = ref('')
const phone = ref('')
const address = ref<AddressFieldsValue>({
  label: '', recipient_name: '', recipient_phone: '', address_line1: '', address_line2: '',
  country_id: null, state_id: null, city_id: null, postal_code: '',
})
let token = ''

const deadline = computed(() => correction.value
  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(correction.value.expires_at))
  : '')
const isRequested = (field: CorrectionRequest['fields'][number]) => correction.value?.fields.includes(field) ?? false

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await $api<{ data: CorrectionRequest }>('/customer/order-details-correction/show', {
      method: 'POST',
      body: { token },
    })
    correction.value = response.data
  } catch (cause) {
    error.value = extractApiErrorMessage(cause, 'Could not open the order update link.')
    if (isClosed(cause)) closeLink()
  } finally {
    loading.value = false
  }
}

usePrivateOrderLink(48, (link) => {
  token = link.token
  if (token) {
    void load()
  } else {
    error.value = link.closed
      ? 'This order update link is no longer available.'
      : 'Open the private link from your SAAJ email or text message.'
    loading.value = false
  }
})

function isClosed(cause: unknown) {
  const failure = cause as { statusCode?: number, response?: { status?: number } } | null
  return (failure?.statusCode ?? failure?.response?.status) === 410
}

function closeLink() {
  retirePrivateOrderLink(token)
  token = ''
}

async function submit() {
  if (!correction.value || saving.value) return
  error.value = ''
  if (isRequested('address') && (!address.value.country_id || !address.value.state_id || !address.value.city_id)) {
    error.value = 'Choose a country, province, and city.'
    return
  }
  if (isRequested('phone') && !isCompletePhoneNumber(phone.value)) {
    error.value = 'Enter a valid delivery phone number.'
    return
  }

  saving.value = true
  try {
    const { country_id, state_id, city_id, address_line1, address_line2, postal_code } = address.value
    await $api('/customer/order-details-correction/submit', {
      method: 'POST',
      body: {
        token,
        ...(isRequested('email') ? { email: email.value } : {}),
        ...(isRequested('phone') ? { phone: phone.value } : {}),
        ...(isRequested('address') ? { country_id, state_id, city_id, address_line1, address_line2, postal_code } : {}),
      },
    })
    closeLink()
    complete.value = true
  } catch (cause) {
    error.value = extractApiErrorMessage(cause, 'Could not save your order details. Please try again.')
    if (isClosed(cause)) {
      correction.value = undefined
      closeLink()
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section aria-labelledby="update-order-heading" class="min-h-[65vh] bg-paper-50 px-5 py-10 text-charcoal-950 sm:px-8 sm:py-16">
    <div class="mx-auto max-w-2xl">
      <h1 id="update-order-heading" class="font-display text-[42px] font-medium leading-none tracking-[-0.04em] sm:text-[54px]">
        {{ complete ? 'Order details updated' : 'Update your order details' }}
      </h1>
      <p v-if="loading" role="status" class="mt-4 text-sm text-charcoal-700">Opening your private link…</p>
      <template v-else-if="complete">
        <p class="mt-4 text-sm leading-6 text-charcoal-700">Order {{ correction?.order_number }} can continue. The cancellation deadline has been removed.</p>
        <NuxtLink to="/shop" class="mt-5 inline-flex min-h-11 items-center border border-charcoal-950/25 px-5 text-sm font-semibold">Continue shopping</NuxtLink>
      </template>
      <template v-else-if="correction">
        <p class="mt-4 text-sm font-semibold">Order {{ correction.order_number }}</p>
        <p class="mt-2 text-sm leading-6 text-charcoal-700">Enter the requested details by <strong>{{ deadline }}</strong> to avoid automatic cancellation. Your order total stays the same.</p>

        <form class="storefront-field-theme mt-7 space-y-5 border-t border-charcoal-950/10 pt-6" @submit.prevent="submit">
          <div v-if="isRequested('email')">
            <label for="correction-email" class="credentials-label">Updated email address</label>
            <div class="credentials-field">
              <input id="correction-email" v-model.trim="email" type="email" autocomplete="email" maxlength="190" class="credentials-input" placeholder="you@example.com" required>
            </div>
          </div>
          <div v-if="isRequested('phone')">
            <label for="correction-phone" class="credentials-label">Updated delivery phone</label>
            <div class="credentials-field">
              <input id="correction-phone" v-model.trim="phone" type="tel" autocomplete="tel" maxlength="50" class="credentials-input" placeholder="03XXXXXXXXX" required :data-complete="isCompletePhoneNumber(phone)">
            </div>
          </div>
          <fieldset v-if="isRequested('address')">
            <legend class="mb-3 text-sm font-semibold">Updated delivery address</legend>
            <AddressFields v-model="address" :show-recipient-fields="false" credentials-style location-first />
          </fieldset>
          <p v-if="error" role="alert" class="border border-rose-700/35 bg-rose-700/5 p-3 text-sm text-rose-800 dark:text-rose-200">{{ error }}</p>
          <button type="submit" :disabled="saving" class="inline-flex min-h-12 items-center bg-charcoal-950 px-6 text-sm font-semibold text-paper-50 disabled:opacity-50">
            {{ saving ? 'Saving…' : 'Save updated details' }}
          </button>
        </form>
      </template>
      <div v-else class="mt-4 space-y-4">
        <p v-if="error" role="alert" class="text-sm leading-6 text-charcoal-700">{{ error }}</p>
        <button v-if="token" type="button" class="min-h-11 text-sm font-semibold underline underline-offset-4" @click="load">Try again</button>
        <NuxtLink v-else to="/#store-contact" class="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">Contact SAAJ</NuxtLink>
      </div>
    </div>
  </section>
</template>
