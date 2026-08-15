<script setup lang="ts">
type LocationOption = { id: number, name: string }

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

const props = defineProps<{
  modelValue: AddressFieldsValue
  showLabel?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: AddressFieldsValue]
}>()

const { $api } = useNuxtApp()

const countries = ref<LocationOption[]>([])
const states = ref<LocationOption[]>([])
const cities = ref<LocationOption[]>([])
const loadingStates = ref(false)
const loadingCities = ref(false)

function update(patch: Partial<AddressFieldsValue>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

async function loadCountries() {
  const response = await $api<{ data: LocationOption[] }>('/locations/countries')

  countries.value = response.data

  // Only one country exists today — select it automatically so
  // there's nothing to click through for a single-option dropdown.
  if (countries.value.length === 1 && !props.modelValue.country_id) {
    update({ country_id: countries.value[0].id })
  }
}

async function loadStates(countryId: number) {
  loadingStates.value = true
  states.value = []

  try {
    const response = await $api<{ data: LocationOption[] }>('/locations/states', {
      query: { country_id: countryId },
    })

    states.value = response.data
  } finally {
    loadingStates.value = false
  }
}

async function loadCities(stateId: number) {
  loadingCities.value = true
  cities.value = []

  try {
    const response = await $api<{ data: LocationOption[] }>('/locations/cities', {
      query: { state_id: stateId },
    })

    cities.value = response.data
  } finally {
    loadingCities.value = false
  }
}

onMounted(async () => {
  await loadCountries()

  if (props.modelValue.country_id) await loadStates(props.modelValue.country_id)
  if (props.modelValue.state_id) await loadCities(props.modelValue.state_id)
})

function onCountryChange(id: number) {
  update({ country_id: id, state_id: null, city_id: null })
  loadStates(id)
}

function onStateChange(id: number) {
  update({ state_id: id, city_id: null })
  loadCities(id)
}
</script>

<template>
  <div class="grid gap-4">
    <div v-if="showLabel">
      <label class="mb-1.5 block text-[13px] font-medium text-ink-700">Label (optional)</label>
      <input
        :value="modelValue.label"
        type="text"
        placeholder="Home, Office..."
        class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
        @input="update({ label: ($event.target as HTMLInputElement).value })"
      >
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label class="mb-1.5 block text-[13px] font-medium text-ink-700">Recipient name</label>
        <input
          :value="modelValue.recipient_name"
          type="text"
          required
          class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
          @input="update({ recipient_name: ($event.target as HTMLInputElement).value })"
        >
      </div>

      <div>
        <label class="mb-1.5 block text-[13px] font-medium text-ink-700">Recipient phone</label>
        <input
          :value="modelValue.recipient_phone"
          type="tel"
          required
          placeholder="03XXXXXXXXX"
          class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
          @input="update({ recipient_phone: ($event.target as HTMLInputElement).value })"
        >
      </div>
    </div>

    <div>
      <label class="mb-1.5 block text-[13px] font-medium text-ink-700">Address line 1</label>
      <input
        :value="modelValue.address_line1"
        type="text"
        required
        class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
        @input="update({ address_line1: ($event.target as HTMLInputElement).value })"
      >
    </div>

    <div>
      <label class="mb-1.5 block text-[13px] font-medium text-ink-700">Address line 2 (optional)</label>
      <input
        :value="modelValue.address_line2"
        type="text"
        class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
        @input="update({ address_line2: ($event.target as HTMLInputElement).value })"
      >
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <div>
        <label class="mb-1.5 block text-[13px] font-medium text-ink-700">Country</label>
        <select
          :value="modelValue.country_id ?? ''"
          class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
          @change="onCountryChange(Number(($event.target as HTMLSelectElement).value))"
        >
          <option
            value=""
            disabled
          >
            Select
          </option>
          <option
            v-for="c in countries"
            :key="c.id"
            :value="c.id"
          >
            {{ c.name }}
          </option>
        </select>
      </div>

      <div>
        <label class="mb-1.5 block text-[13px] font-medium text-ink-700">Province</label>
        <select
          :value="modelValue.state_id ?? ''"
          :disabled="!modelValue.country_id || loadingStates"
          class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700 disabled:opacity-50"
          @change="onStateChange(Number(($event.target as HTMLSelectElement).value))"
        >
          <option
            value=""
            disabled
          >
            {{ loadingStates ? 'Loading...' : 'Select' }}
          </option>
          <option
            v-for="s in states"
            :key="s.id"
            :value="s.id"
          >
            {{ s.name }}
          </option>
        </select>
      </div>

      <div>
        <label class="mb-1.5 block text-[13px] font-medium text-ink-700">City</label>
        <select
          :value="modelValue.city_id ?? ''"
          :disabled="!modelValue.state_id || loadingCities"
          class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700 disabled:opacity-50"
          @change="update({ city_id: Number(($event.target as HTMLSelectElement).value) })"
        >
          <option
            value=""
            disabled
          >
            {{ loadingCities ? 'Loading...' : 'Select' }}
          </option>
          <option
            v-for="c in cities"
            :key="c.id"
            :value="c.id"
          >
            {{ c.name }}
          </option>
        </select>
      </div>
    </div>

    <div>
      <label class="mb-1.5 block text-[13px] font-medium text-ink-700">Postal code (optional)</label>
      <input
        :value="modelValue.postal_code"
        type="text"
        class="w-full max-w-[200px] rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
        @input="update({ postal_code: ($event.target as HTMLInputElement).value })"
      >
    </div>
  </div>
</template>
