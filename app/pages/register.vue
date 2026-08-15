<script setup lang="ts">
const authStore = useAuthStore()
const router = useRouter()

const form = reactive({
  name: '',
  email: '',
  phone: '',
  password: '',
  password_confirmation: '',
})

const submitting = ref(false)
const error = ref('')

async function submit() {
  submitting.value = true
  error.value = ''

  try {
    await authStore.register({
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      password: form.password,
      password_confirmation: form.password_confirmation,
    })

    await router.push('/account')
  } catch (err: any) {
    error.value = extractApiErrorMessage(err, 'Could not create your account. Please check your details.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-5 py-16">
    <h1 class="font-display text-3xl font-medium text-ink-900">
      Create your account
    </h1>
    <p class="mt-2 text-sm text-ink-500">
      Save addresses, track orders, and check out faster.
    </p>

    <form
      class="mt-8 space-y-4"
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
          required
          class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
        >
      </div>

      <div>
        <label class="mb-1.5 block text-[13px] font-medium text-ink-700">Phone (optional)</label>
        <input
          v-model="form.phone"
          type="tel"
          placeholder="03XXXXXXXXX"
          class="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-[15px] text-ink-900 outline-none focus:border-indigo-700"
        >
      </div>

      <div>
        <label class="mb-1.5 block text-[13px] font-medium text-ink-700">Password</label>
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
        {{ submitting ? 'Creating account...' : 'Create account' }}
      </button>
    </form>

    <p class="mt-8 text-center text-sm text-ink-500">
      Already have an account?
      <NuxtLink
        to="/login"
        class="text-ink-900 underline decoration-stone-300 underline-offset-4"
      >
        Sign in
      </NuxtLink>
    </p>
  </div>
</template>
