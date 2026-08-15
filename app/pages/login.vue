<script setup lang="ts">
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({
  email: '',
  password: '',
})

const submitting = ref(false)
const error = ref('')

async function submit() {
  submitting.value = true
  error.value = ''

  try {
    await authStore.login(form)

    const redirect = (route.query.redirect as string) || '/account'

    await router.push(redirect)
  } catch (err: any) {
    error.value = extractApiErrorMessage(err, 'Could not sign in. Check your details and try again.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-5 py-16">
    <h1 class="font-display text-3xl font-medium text-ink-900">
      Welcome back
    </h1>
    <p class="mt-2 text-sm text-ink-500">
      Sign in to your SAAJ account.
    </p>

    <form
      class="mt-8 space-y-4"
      @submit.prevent="submit"
    >
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
        <div class="mb-1.5 flex items-center justify-between">
          <label class="block text-[13px] font-medium text-ink-700">Password</label>
          <NuxtLink
            to="/forgot-password"
            class="text-[13px] text-ink-500 underline decoration-stone-300 underline-offset-4 hover:text-ink-900"
          >
            Forgot?
          </NuxtLink>
        </div>
        <input
          v-model="form.password"
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
        {{ submitting ? 'Signing in...' : 'Sign in' }}
      </button>
    </form>

    <p class="mt-8 text-center text-sm text-ink-500">
      New to SAAJ?
      <NuxtLink
        to="/register"
        class="text-ink-900 underline decoration-stone-300 underline-offset-4"
      >
        Create an account
      </NuxtLink>
    </p>
  </div>
</template>
