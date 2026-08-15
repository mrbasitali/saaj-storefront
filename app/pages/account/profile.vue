<script setup lang="ts">
const authStore = useAuthStore()

const form = reactive({
  name: authStore.customer?.name ?? '',
  email: authStore.customer?.email ?? '',
  phone: authStore.customer?.phone ?? '',
  secondary_phone: authStore.customer?.secondary_phone ?? '',
})

const submitting = ref(false)
const error = ref('')
const success = ref(false)

const emailChanged = computed(() => form.email !== authStore.customer?.email)

async function submit() {
  submitting.value = true
  error.value = ''
  success.value = false

  try {
    await authStore.updateProfile(form)

    success.value = true
  } catch (err: any) {
    error.value = extractApiErrorMessage(err, 'Could not update your profile.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-md">
    <h2 class="text-lg font-semibold text-ink-900">
      Profile
    </h2>

    <form
      class="mt-6 space-y-4"
      @submit.prevent="submit"
    >
      <div>
        <label class="mb-1.5 block text-[13px] font-medium text-ink-700">Full name</label>
        <input
          v-model="form.name"
          type="text"
          required
          class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
        >
      </div>

      <div>
        <label class="mb-1.5 block text-[13px] font-medium text-ink-700">Email</label>
        <input
          v-model="form.email"
          type="email"
          class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
        >
        <p
          v-if="emailChanged"
          class="mt-1.5 text-xs text-brass-600"
        >
          Changing your email means it'll need to be verified again.
        </p>
      </div>

      <div>
        <label class="mb-1.5 block text-[13px] font-medium text-ink-700">Phone</label>
        <input
          v-model="form.phone"
          type="tel"
          class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
        >
      </div>

      <div>
        <label class="mb-1.5 block text-[13px] font-medium text-ink-700">Secondary phone (optional)</label>
        <input
          v-model="form.secondary_phone"
          type="tel"
          class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
        >
      </div>

      <p
        v-if="error"
        class="rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700"
      >
        {{ error }}
      </p>
      <p
        v-if="success"
        class="rounded-xl bg-indigo-100 px-4 py-3 text-[13px] text-indigo-900"
      >
        Profile updated.
      </p>

      <button
        type="submit"
        :disabled="submitting"
        class="rounded-full bg-ink-900 px-7 py-3 text-[15px] font-medium text-stone-50 transition hover:bg-indigo-900 disabled:opacity-60"
      >
        {{ submitting ? 'Saving...' : 'Save changes' }}
      </button>
    </form>
  </div>
</template>
