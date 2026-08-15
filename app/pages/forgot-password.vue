<script setup lang="ts">
const { $api } = useNuxtApp()

const email = ref('')
const submitting = ref(false)
const submitted = ref(false)
const error = ref('')

async function submit() {
  submitting.value = true
  error.value = ''

  try {
    await $api('/customer/forgot-password', {
      method: 'POST',
      body: { email: email.value },
    })

    // The backend deliberately returns the same response whether or
    // not the email exists, to prevent probing for registered
    // accounts — so the frontend shows the same success state either
    // way too, not just when it happens to succeed.
    submitted.value = true
  } catch (err: any) {
    error.value = extractApiErrorMessage(err, 'Something went wrong. Please try again.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-5 py-16">
    <template v-if="submitted">
      <h1 class="font-display text-2xl font-medium text-ink-900">
        Check your email
      </h1>
      <p class="mt-3 text-sm leading-relaxed text-ink-500">
        If an account exists for <span class="text-ink-900">{{ email }}</span>,
        a password reset link is on its way.
      </p>
    </template>

    <template v-else>
      <h1 class="font-display text-2xl font-medium text-ink-900">
        Reset your password
      </h1>
      <p class="mt-2 text-sm text-ink-500">
        Enter your email and we'll send you a reset link.
      </p>

      <form
        class="mt-6 space-y-4"
        @submit.prevent="submit"
      >
        <input
          v-model="email"
          type="email"
          required
          placeholder="Email"
          class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
        >

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
          {{ submitting ? 'Sending...' : 'Send reset link' }}
        </button>
      </form>
    </template>

    <NuxtLink
      to="/login"
      class="mt-8 text-center text-sm text-ink-500 underline decoration-stone-300 underline-offset-4"
    >
      Back to sign in
    </NuxtLink>
  </div>
</template>
