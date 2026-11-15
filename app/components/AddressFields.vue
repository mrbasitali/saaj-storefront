<script setup lang="ts">
import { isCompletePhoneNumber } from '~/utils/isCompletePhoneNumber'
import type { StorefrontSelectOption } from '~/components/StorefrontSearchSelect.vue'

type LocationOption = StorefrontSelectOption & {
  country_id?: number
  state_id?: number
  phone_code?: string | null
}

export type AddressFieldsValue = {
  label: string
  recipient_name: string
  recipient_phone: string
  address_line1: string
  address_line2: string
  country_id: number | null
  state_id: number | null
  city_id: number | null
  postal_code: string
}

const props = withDefaults(defineProps<{
  modelValue: AddressFieldsValue
  showLabel?: boolean
  showRecipientFields?: boolean
  credentialsStyle?: boolean
  pickerBoundary?: HTMLElement | null
}>(), {
  showLabel: false,
  showRecipientFields: true,
  credentialsStyle: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: AddressFieldsValue]
}>()

const { $api } = useNuxtApp()

const countries = ref<LocationOption[]>([])
const states = ref<LocationOption[]>([])
const cities = ref<LocationOption[]>([])
const loadingCountries = ref(false)
const loadingStates = ref(false)
const loadingCities = ref(false)

// Keep the three dependent selections locally stable while their option
// lists are loading. The parent still receives every change immediately.
const countryId = ref<number | null>(props.modelValue.country_id)
const stateId = ref<number | null>(props.modelValue.state_id)
const cityId = ref<number | null>(props.modelValue.city_id)

let stateRequest = 0
let cityRequest = 0

function update(patch: Partial<AddressFieldsValue>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

function emitLocation() {
  update({
    country_id: countryId.value,
    state_id: stateId.value,
    city_id: cityId.value,
  })
}

async function loadCountries() {
  loadingCountries.value = true

  try {
    const response = await $api<{ data: LocationOption[] }>('/locations/countries')
    countries.value = response.data

    // When a store only ships to one country, select it automatically.
    if (!countryId.value && countries.value.length === 1) {
      countryId.value = countries.value[0].id
      emitLocation()
    }
  } finally {
    loadingCountries.value = false
  }
}

async function loadStates(country: number) {
  const request = ++stateRequest
  loadingStates.value = true

  try {
    const response = await $api<{ data: LocationOption[] }>('/locations/states', {
      query: { country_id: country },
    })

    if (request !== stateRequest || country !== countryId.value) return

    states.value = response.data

    if (stateId.value && !states.value.some(state => state.id === stateId.value)) {
      stateId.value = null
      cityId.value = null
      cities.value = []
      emitLocation()
    }
  } finally {
    if (request === stateRequest) loadingStates.value = false
  }
}

async function loadCities(state: number) {
  const request = ++cityRequest
  loadingCities.value = true

  try {
    const response = await $api<{ data: LocationOption[] }>('/locations/cities', {
      query: { state_id: state },
    })

    if (request !== cityRequest || state !== stateId.value) return

    cities.value = response.data

    if (cityId.value && !cities.value.some(city => city.id === cityId.value)) {
      cityId.value = null
      emitLocation()
    }
  } finally {
    if (request === cityRequest) loadingCities.value = false
  }
}

async function selectCountry(id: number) {
  if (countryId.value === id) return

  countryId.value = id
  stateId.value = null
  cityId.value = null
  states.value = []
  cities.value = []
  stateRequest++
  cityRequest++
  emitLocation()
  await loadStates(id)
}

async function selectState(id: number) {
  if (stateId.value === id) return

  stateId.value = id
  cityId.value = null
  cities.value = []
  cityRequest++
  emitLocation()
  await loadCities(id)
}

function selectCity(id: number) {
  if (cityId.value === id) return
  cityId.value = id
  emitLocation()
}

// Allow a saved/new address to be applied from the parent without letting
// ordinary component re-renders wipe a shopper's current selections.
watch(() => props.modelValue.country_id, async (id) => {
  if (id === countryId.value) return

  countryId.value = id
  stateId.value = props.modelValue.state_id
  cityId.value = props.modelValue.city_id
  states.value = []
  cities.value = []

  if (id) {
    await loadStates(id)
    if (stateId.value) await loadCities(stateId.value)
  }
})

watch(() => props.modelValue.state_id, async (id) => {
  if (id === stateId.value) return

  stateId.value = id
  cityId.value = props.modelValue.city_id
  cities.value = []
  if (id) await loadCities(id)
})

watch(() => props.modelValue.city_id, (id) => {
  if (id !== cityId.value) cityId.value = id
})

onMounted(async () => {
  await loadCountries()

  if (countryId.value) await loadStates(countryId.value)
  if (stateId.value) await loadCities(stateId.value)
})
</script>

<template>
  <div class="grid gap-4" :class="{ 'address-credentials': credentialsStyle }">
    <label v-if="showLabel" class="address-field">
      <span :class="{ 'credentials-label': credentialsStyle }">Label <em>optional</em></span>
      <span class="block min-w-0" :class="{ 'credentials-field': credentialsStyle }">
        <input
          :class="{ 'credentials-input': credentialsStyle }"
          :data-complete="credentialsStyle ? !!modelValue.label.trim() : undefined"
          :value="modelValue.label"
          type="text"
          autocomplete="off"
          placeholder="Home, Office…"
          @input="update({ label: ($event.target as HTMLInputElement).value })"
        >
      </span>
    </label>

    <div v-if="showRecipientFields" class="grid gap-4 sm:grid-cols-2">
      <label class="address-field">
        <span :class="{ 'credentials-label': credentialsStyle }">Recipient name</span>
        <span class="block min-w-0" :class="{ 'credentials-field': credentialsStyle }">
          <input
            :class="{ 'credentials-input': credentialsStyle }"
            :data-complete="credentialsStyle ? !!modelValue.recipient_name.trim() : undefined"
            :value="modelValue.recipient_name"
            type="text"
            autocomplete="name"
            required
            placeholder="Full name"
            @input="update({ recipient_name: ($event.target as HTMLInputElement).value })"
          >
        </span>
      </label>

      <label class="address-field">
        <span :class="{ 'credentials-label': credentialsStyle }">Recipient phone</span>
        <span class="block min-w-0" :class="{ 'credentials-field': credentialsStyle }">
          <input
            :class="{ 'credentials-input': credentialsStyle }"
            :data-complete="credentialsStyle ? isCompletePhoneNumber(modelValue.recipient_phone) : undefined"
            :value="modelValue.recipient_phone"
            type="tel"
            autocomplete="tel"
            inputmode="tel"
            required
            placeholder="03XXXXXXXXX"
            @input="update({ recipient_phone: ($event.target as HTMLInputElement).value })"
          >
        </span>
      </label>
    </div>

    <label class="address-field">
      <span :class="{ 'credentials-label': credentialsStyle }">Street address</span>
      <span class="block min-w-0" :class="{ 'credentials-field': credentialsStyle }">
        <input
          :class="{ 'credentials-input': credentialsStyle }"
          :data-complete="credentialsStyle ? !!modelValue.address_line1.trim() : undefined"
          :value="modelValue.address_line1"
          type="text"
          autocomplete="address-line1"
          required
          placeholder="House / building, street, area"
          @input="update({ address_line1: ($event.target as HTMLInputElement).value })"
        >
      </span>
    </label>

    <label class="address-field">
      <span :class="{ 'credentials-label': credentialsStyle }">Apartment, suite, landmark <em>optional</em></span>
      <span class="block min-w-0" :class="{ 'credentials-field': credentialsStyle }">
        <input
          :class="{ 'credentials-input': credentialsStyle }"
          :data-complete="credentialsStyle ? !!modelValue.address_line2.trim() : undefined"
          :value="modelValue.address_line2"
          type="text"
          autocomplete="address-line2"
          placeholder="Apartment, floor, nearby landmark…"
          @input="update({ address_line2: ($event.target as HTMLInputElement).value })"
        >
      </span>
    </label>

    <div class="grid gap-4 sm:grid-cols-3">
      <div class="address-field">
        <span :class="{ 'credentials-label': credentialsStyle }">Country</span>
        <StorefrontSearchSelect
          :model-value="countryId"
          label="Country"
          :desktop-boundary="pickerBoundary"
          :credentials-style="credentialsStyle"
          :options="countries"
          :loading="loadingCountries"
          placeholder="Select country"
          search-placeholder="Search country…"
          @update:model-value="selectCountry"
        />
      </div>

      <div class="address-field">
        <span :class="{ 'credentials-label': credentialsStyle }">Province</span>
        <StorefrontSearchSelect
          :model-value="stateId"
          label="Province"
          :desktop-boundary="pickerBoundary"
          :credentials-style="credentialsStyle"
          :options="states"
          :loading="loadingStates"
          :disabled="!countryId"
          placeholder="Select province"
          search-placeholder="Search province…"
          @update:model-value="selectState"
        />
      </div>

      <div class="address-field">
        <span :class="{ 'credentials-label': credentialsStyle }">City</span>
        <StorefrontSearchSelect
          :model-value="cityId"
          label="City"
          :desktop-boundary="pickerBoundary"
          :credentials-style="credentialsStyle"
          :options="cities"
          :loading="loadingCities"
          :disabled="!stateId"
          placeholder="Select city"
          search-placeholder="Search city…"
          @update:model-value="selectCity"
        />
      </div>
    </div>

    <label class="address-field sm:max-w-[220px]">
      <span :class="{ 'credentials-label': credentialsStyle }">Postal code <em>optional</em></span>
      <span class="block min-w-0" :class="{ 'credentials-field': credentialsStyle }">
        <input
          :class="{ 'credentials-input': credentialsStyle }"
          :data-complete="credentialsStyle ? !!modelValue.postal_code.trim() : undefined"
          :value="modelValue.postal_code"
          type="text"
          autocomplete="postal-code"
          inputmode="numeric"
          placeholder="Postal code"
          @input="update({ postal_code: ($event.target as HTMLInputElement).value })"
        >
      </span>
    </label>
  </div>
</template>

<style scoped>
.address-field {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.address-credentials .address-field {
  gap: 0;
}

.address-field > span:first-child:not(.credentials-label) {
  font-size: 9px;
  font-weight: 650;
  letter-spacing: .13em;
  text-transform: uppercase;
  color: var(--color-charcoal-400);
}

.address-field > span:first-child:not(.credentials-label) em {
  font-style: normal;
  font-weight: 500;
  letter-spacing: .04em;
  text-transform: none;
}

.address-field input:not(.credentials-input) {
  width: 100%;
  min-height: 50px;
  border: 1px solid color-mix(in srgb, var(--color-charcoal-950) 14%, transparent);
  background: var(--color-paper-50);
  padding: 0 14px;
  color: var(--color-charcoal-950);
  font-size: 16px;
  line-height: 1.4;
  outline: none;
  transition: border-color 160ms ease, box-shadow 180ms ease, opacity 160ms ease;
}

.address-field input:not(.credentials-input)::placeholder {
  color: var(--color-charcoal-350);
}

.address-field input:not(.credentials-input):focus {
  border-color: color-mix(in srgb, var(--color-charcoal-950) 65%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-charcoal-950) 5%, transparent);
}

@media (min-width: 768px) {
  .address-field input:not(.credentials-input) {
    font-size: 14px;
  }
}
</style>
