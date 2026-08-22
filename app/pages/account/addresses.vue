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
  country_name: string | null
  state_id: number
  state_name: string | null
  city_id: number
  city_name: string | null
  postal_code: string | null
  is_default: boolean
}

const { $api } = useNuxtApp()
const authStore = useAuthStore()

const { data, pending, refresh } = await useAsyncData('account-addresses-v2', () =>
  $api<{ data: SavedAddress[] }>('/customer/addresses'),
)

const addresses = computed(() => data.value?.data ?? [])
const formOpen = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const formError = ref('')
const deletingId = ref<number | null>(null)
const pendingDelete = ref<SavedAddress | null>(null)
const settingDefaultId = ref<number | null>(null)

function blankAddress(): AddressFieldsValue {
  return {
    label: '',
    recipient_name: authStore.customer?.name ?? '',
    recipient_phone: authStore.customer?.phone ?? '',
    address_line1: '',
    address_line2: '',
    country_id: null,
    state_id: null,
    city_id: null,
    postal_code: '',
  }
}

const form = reactive<AddressFieldsValue>(blankAddress())
const isDefault = ref(false)

watch(formOpen, (open) => {
  if (!import.meta.client) return
  document.body.style.overflow = open ? 'hidden' : ''
})

onBeforeUnmount(() => {
  if (import.meta.client) document.body.style.overflow = ''
})

function openAdd() {
  Object.assign(form, blankAddress())
  isDefault.value = addresses.value.length === 0
  editingId.value = null
  formError.value = ''
  formOpen.value = true
}

function openEdit(address: SavedAddress) {
  Object.assign(form, {
    label: address.label ?? '',
    recipient_name: address.recipient_name,
    recipient_phone: address.recipient_phone,
    address_line1: address.address_line1,
    address_line2: address.address_line2 ?? '',
    country_id: address.country_id,
    state_id: address.state_id,
    city_id: address.city_id,
    postal_code: address.postal_code ?? '',
  })
  isDefault.value = address.is_default
  editingId.value = address.id
  formError.value = ''
  formOpen.value = true
}

function closeForm() {
  if (saving.value) return
  formOpen.value = false
}

function applyAddressFields(value: AddressFieldsValue) {
  // Keep the same reactive form object alive. Replacing a reactive object via
  // component v-model can leave dependent Country / Province / City updates
  // working with an older snapshot and wipe fields the customer already typed.
  Object.assign(form, value)
}

const formComplete = computed(() => (
  !!form.recipient_name.trim()
  && !!form.recipient_phone.trim()
  && !!form.address_line1.trim()
  && !!form.country_id
  && !!form.state_id
  && !!form.city_id
))

async function submit() {
  if (saving.value) return
  formError.value = ''

  if (!formComplete.value) {
    formError.value = 'Please complete the recipient, street address, country, province and city.'
    return
  }

  saving.value = true

  try {
    const payload = {
      label: form.label.trim() || null,
      recipient_name: form.recipient_name.trim(),
      recipient_phone: form.recipient_phone.trim(),
      address_line1: form.address_line1.trim(),
      address_line2: form.address_line2.trim() || null,
      country_id: form.country_id,
      state_id: form.state_id,
      city_id: form.city_id,
      postal_code: form.postal_code.trim() || null,
      is_default: isDefault.value,
    }

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

async function makeDefault(address: SavedAddress) {
  if (address.is_default || settingDefaultId.value) return
  settingDefaultId.value = address.id

  try {
    await $api(`/customer/addresses/${address.id}`, {
      method: 'PUT',
      body: { is_default: true },
    })
    await refresh()
  } finally {
    settingDefaultId.value = null
  }
}

async function remove() {
  if (!pendingDelete.value || deletingId.value) return
  deletingId.value = pendingDelete.value.id

  try {
    await $api(`/customer/addresses/${pendingDelete.value.id}`, { method: 'DELETE' })
    pendingDelete.value = null
    await refresh()
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-4 border-b border-charcoal-950/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-[9px] font-semibold uppercase tracking-[0.18em] text-charcoal-400">Delivery details</p>
        <h2 class="mt-2 font-display text-[38px] font-medium tracking-[-0.04em] text-charcoal-950 sm:text-[44px]">Addresses</h2>
        <p class="mt-2 text-[11px] text-charcoal-500">Keep your preferred delivery locations ready for checkout.</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-3 self-start bg-charcoal-950 px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-paper-50 sm:self-auto"
        @click="openAdd"
      >
        Add address
        <span class="text-[15px] font-light leading-none">+</span>
      </button>
    </div>

    <div v-if="pending" class="mt-7 grid gap-4 sm:grid-cols-2">
      <div v-for="n in 2" :key="n" class="h-48 animate-pulse bg-charcoal-950/[0.04]" />
    </div>

    <div v-else-if="addresses.length" class="mt-7 grid gap-px bg-charcoal-950/10 sm:grid-cols-2">
      <article
        v-for="address in addresses"
        :key="address.id"
        class="relative bg-paper-50 p-5 sm:p-6"
      >
        <div class="flex min-h-[168px] flex-col">
          <div class="flex items-start justify-between gap-5">
            <div>
              <p class="text-[9px] font-semibold uppercase tracking-[0.15em] text-charcoal-400">{{ address.label || 'Delivery address' }}</p>
              <p class="mt-3 text-[13px] font-medium text-charcoal-950">{{ address.recipient_name }}</p>
            </div>
            <span v-if="address.is_default" class="border border-[#657d6c]/25 bg-[#657d6c]/[0.08] px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#52685a]">Default</span>
          </div>

          <p class="mt-3 text-[11px] leading-5 text-charcoal-500">
            {{ address.recipient_phone }}<br>
            {{ address.address_line1 }}<span v-if="address.address_line2">, {{ address.address_line2 }}</span><br>
            {{ address.city_name }}<span v-if="address.state_name">, {{ address.state_name }}</span><span v-if="address.country_name"> · {{ address.country_name }}</span>
            <template v-if="address.postal_code"><br>{{ address.postal_code }}</template>
          </p>

          <div class="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-5 text-[9px] font-semibold uppercase tracking-[0.12em]">
            <button type="button" class="text-charcoal-950 underline decoration-charcoal-950/20 underline-offset-4" @click="openEdit(address)">Edit</button>
            <button
              v-if="!address.is_default"
              type="button"
              :disabled="settingDefaultId === address.id"
              class="text-charcoal-500 underline decoration-charcoal-950/15 underline-offset-4 disabled:opacity-40"
              @click="makeDefault(address)"
            >
              {{ settingDefaultId === address.id ? 'Updating…' : 'Make default' }}
            </button>
            <button type="button" class="text-[#9a4f4f] underline decoration-[#bd6f6f]/25 underline-offset-4" @click="pendingDelete = address">Remove</button>
          </div>
        </div>
      </article>
    </div>

    <div v-else-if="!pending" class="py-14">
      <p class="font-display text-[34px] tracking-[-0.04em] text-charcoal-950">No saved addresses yet.</p>
      <p class="mt-3 max-w-md text-[11px] leading-5 text-charcoal-500">Add a home, office or preferred delivery address to make future checkout quicker.</p>
      <button type="button" class="mt-6 inline-flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-950" @click="openAdd">Add your first address →</button>
    </div>

    <Transition name="address-panel">
      <div v-if="formOpen" class="fixed inset-0 z-[80] bg-black/30 backdrop-blur-[2px]" @click.self="closeForm">
        <section class="absolute inset-y-0 right-0 flex w-full max-w-[690px] flex-col bg-paper-50 shadow-2xl">
          <header class="flex items-center justify-between border-b border-charcoal-950/10 px-5 py-5 sm:px-8">
            <div>
              <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-400">{{ editingId ? 'Update delivery details' : 'New delivery details' }}</p>
              <h3 class="mt-1 font-display text-[30px] tracking-[-0.035em] text-charcoal-950">{{ editingId ? 'Edit address' : 'Add address' }}</h3>
            </div>
            <button type="button" aria-label="Close address form" class="flex h-10 w-10 items-center justify-center text-charcoal-950" @click="closeForm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" class="h-5 w-5"><path d="m5 5 14 14M19 5 5 19" /></svg>
            </button>
          </header>

          <form class="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8" @submit.prevent="submit">
            <AddressFields
              :model-value="form"
              show-label
              @update:model-value="applyAddressFields"
            />

            <label class="mt-6 flex cursor-pointer items-center gap-3 border-t border-charcoal-950/10 pt-5 text-[10px] text-charcoal-600">
              <input v-model="isDefault" type="checkbox" class="h-4 w-4 accent-charcoal-950">
              Use as my default delivery address
            </label>

            <div v-if="formError" class="mt-5 border border-[#bd6f6f]/35 bg-[#bd6f6f]/[0.07] px-4 py-3 text-[11px] leading-5 text-[#9a4f4f]">{{ formError }}</div>

            <div class="mt-8 flex flex-col-reverse gap-3 border-t border-charcoal-950/10 pt-6 sm:flex-row sm:justify-end">
              <button type="button" :disabled="saving" class="border border-charcoal-950/18 px-6 py-3.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-charcoal-950 disabled:opacity-40" @click="closeForm">Cancel</button>
              <button type="submit" :disabled="saving" class="min-w-[160px] bg-charcoal-950 px-6 py-3.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-paper-50 disabled:opacity-45">{{ saving ? 'Saving…' : 'Save address' }}</button>
            </div>
          </form>
        </section>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="pendingDelete" class="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" @click.self="pendingDelete = null">
        <div class="w-full max-w-md bg-paper-50 p-6 sm:p-7">
          <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9a4f4f]">Remove address</p>
          <h3 class="mt-2 font-display text-[30px] tracking-[-0.035em] text-charcoal-950">Remove this delivery address?</h3>
          <p class="mt-3 text-[11px] leading-5 text-charcoal-500">This only removes it from your saved account addresses. Past orders are not changed.</p>
          <div class="mt-7 grid grid-cols-2 gap-3">
            <button type="button" class="border border-charcoal-950/18 px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-950" @click="pendingDelete = null">Keep it</button>
            <button type="button" :disabled="Boolean(deletingId)" class="bg-[#9a4f4f] px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-white disabled:opacity-45" @click="remove">{{ deletingId ? 'Removing…' : 'Remove' }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.address-panel-enter-active,
.address-panel-leave-active {
  transition: opacity 260ms ease;
}
.address-panel-enter-active section,
.address-panel-leave-active section {
  transition: transform 420ms cubic-bezier(.22,1,.36,1);
}
.address-panel-enter-from,
.address-panel-leave-to { opacity: 0; }
.address-panel-enter-from section,
.address-panel-leave-to section { transform: translateX(100%); }

.fade-enter-active,
.fade-leave-active { transition: opacity 220ms ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .address-panel-enter-active,
  .address-panel-leave-active,
  .address-panel-enter-active section,
  .address-panel-leave-active section,
  .fade-enter-active,
  .fade-leave-active { transition-duration: 1ms !important; }
}
</style>
