<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()

const form = reactive({
  token: (route.query.token as string) || '',
  email: (route.query.email as string) || '',
  password: '',
  password_confirmation: '',
})

const submitting = ref(false)
const error = ref('')
const success = ref(false)

async function submit() {
  submitting.value = true
  error.value = ''

  try {
    await $api('/customer/reset-password', {
      method: 'POST',
      body: form,
    })

    success.value = true

    setTimeout(() => router.push('/login'), 2500)
  } catch (err: any) {
    error.value = extractApiErrorMessage(err, 'This reset link is invalid or has expired.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-5 py-16">
    <template v-if="success">
      <h1 class="font-display text-2xl font-medium text-ink-900">
        Password updated
      </h1>
      <p class="mt-3 text-sm text-ink-500">
        Redirecting you to sign in...
      </p>
    </template>

    <template v-else>
      <h1 class="font-display text-2xl font-medium text-ink-900">
        Set a new password
      </h1>

      <form
        class="mt-6 space-y-4"
        @submit.prevent="submit"
      >
        <div>
          <label class="mb-1.5 block text-[13px] font-medium text-ink-700">New password</label>
          <input
            v-model="form.password"
            type="password"
            required
            class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
          >
          <p class="mt-1.5 text-xs text-ink-400">
            At least 8 characters, with letters and numbers.
          </p>
        </div>

        <div>
          <label class="mb-1.5 block text-[13px] font-medium text-ink-700">Confirm password</label>
          <input
            v-model="form.password_confirmation"
            type="password"
            required
            class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
          >
        </div>

        <p
          v-if="error"
          class="rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700"
        >
          {{ error }}
        </p>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full rounded-full bg-ink-900 py-3.5 text-[15px] font-medium text-stone-50 transition hover:bg-indigo-900 disabled:opacity-60"
        >
          {{ submitting ? 'Saving...' : 'Set new password' }}
        </button>
      </form>
    </template>
  </div>
</template>
