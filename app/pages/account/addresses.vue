<script setup lang="ts">
import type { AddressFieldsValue } from '~/components/AddressFields.vue'

type SavedAddress = {
  id: number
  label: string | null
  recipient_name: string
  recipient_phone: string
  address_line1: string
  address_line2: string | null
  country_id: number
  state_id: number
  city_id: number
  city_name: string | null
  state_name: string | null
  postal_code: string | null
  is_default: boolean
}

const { $api } = useNuxtApp()

const { data, refresh } = await useAsyncData('account-addresses', () =>
  $api<{ data: SavedAddress[] }>('/customer/addresses'),
)

const addresses = computed(() => data.value?.data ?? [])

const formOpen = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const formError = ref('')

const empty: AddressFieldsValue = {
  label: '',
  recipient_name: '',
  recipient_phone: '',
  address_line1: '',
  address_line2: '',
  country_id: null,
  state_id: null,
  city_id: null,
  postal_code: '',
}

const form = reactive<AddressFieldsValue>({ ...empty })
const isDefault = ref(false)

function openAdd() {
  Object.assign(form, empty)
  isDefault.value = false
  editingId.value = null
  formError.value = ''
  formOpen.value = true
}

function openEdit(addr: SavedAddress) {
  Object.assign(form, {
    label: addr.label ?? '',
    recipient_name: addr.recipient_name,
    recipient_phone: addr.recipient_phone,
    address_line1: addr.address_line1,
    address_line2: addr.address_line2 ?? '',
    country_id: addr.country_id,
    state_id: addr.state_id,
    city_id: addr.city_id,
    postal_code: addr.postal_code ?? '',
  })
  isDefault.value = addr.is_default
  editingId.value = addr.id
  formError.value = ''
  formOpen.value = true
}

async function submit() {
  saving.value = true
  formError.value = ''

  const payload = { ...form, is_default: isDefault.value }

  try {
    if (editingId.value) {
      await $api(`/customer/addresses/${editingId.value}`, { method: 'PUT', body: payload })
    } else {
      await $api('/customer/addresses', { method: 'POST', body: payload })
    }

    formOpen.value = false
    await refresh()
  } catch (err: any) {
    formError.value = extractApiErrorMessage(err, 'Could not save this address.')
  } finally {
    saving.value = false
  }
}

const deletingId = ref<number | null>(null)

async function remove(id: number) {
  deletingId.value = id

  try {
    await $api(`/customer/addresses/${id}`, { method: 'DELETE' })
    await refresh()
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-ink-900">
        Addresses
      </h2>
      <button
        type="button"
        class="rounded-full border border-ink-900 px-4 py-2 text-sm font-medium text-ink-900 transition hover:bg-ink-900 hover:text-stone-50"
        @click="openAdd"
      >
        Add address
      </button>
    </div>

    <p
      v-if="addresses.length === 0"
      class="mt-6 text-sm text-ink-500"
    >
      No saved addresses yet.
    </p>

    <div
      v-else
      class="mt-6 grid gap-4 sm:grid-cols-2"
    >
      <div
        v-for="addr in addresses"
        :key="addr.id"
        class="rounded-2xl border border-stone-200 p-5"
      >
        <div class="flex items-start justify-between gap-2">
          <p class="text-[15px] font-medium text-ink-900">
            {{ addr.label || addr.recipient_name }}
          </p>
          <span
            v-if="addr.is_default"
            class="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-medium text-indigo-900"
          >Default</span>
        </div>

        <p class="mt-2 text-sm text-ink-500">
          {{ addr.recipient_name }} · {{ addr.recipient_phone }}
        </p>
        <p class="text-sm text-ink-500">
          {{ addr.address_line1 }}<span v-if="addr.address_line2">, {{ addr.address_line2 }}</span>
        </p>
        <p class="text-sm text-ink-500">
          {{ addr.city_name }}, {{ addr.state_name }}
        </p>

        <div class="mt-4 flex gap-4 text-sm">
          <button
            type="button"
            class="text-ink-700 hover:text-ink-900"
            @click="openEdit(addr)"
          >
            Edit
          </button>
          <button
            type="button"
            :disabled="deletingId === addr.id"
            class="text-ink-400 hover:text-red-600"
            @click="remove(addr.id)"
          >
            {{ deletingId === addr.id ? 'Removing...' : 'Remove' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="formOpen"
      class="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-5"
      @click.self="formOpen = false"
    >
      <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl">
        <h3 class="text-lg font-semibold text-ink-900">
          {{ editingId ? 'Edit address' : 'Add address' }}
        </h3>

        <form
          class="mt-5 space-y-4"
          @submit.prevent="submit"
        >
          <AddressFields
            v-model="form"
            show-label
          />

          <label class="flex items-center gap-2 text-sm text-ink-700">
            <input
              v-model="isDefault"
              type="checkbox"
              class="rounded border-stone-300"
            >
            Set as default address
          </label>

          <p
            v-if="formError"
            class="rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700"
          >
            {{ formError }}
          </p>

          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-full border border-stone-300 py-3 text-[15px] font-medium text-ink-900"
              @click="formOpen = false"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="flex-1 rounded-full bg-ink-900 py-3 text-[15px] font-medium text-stone-50 transition hover:bg-indigo-900 disabled:opacity-60"
            >
              {{ saving ? 'Saving...' : 'Save address' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
