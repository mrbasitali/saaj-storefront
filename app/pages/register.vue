<script setup lang="ts">
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

useSeoMeta({
  title: 'Create account | SAAJ',
  robots: 'noindex,nofollow',
})

const form = reactive({
  name: '',
  email: typeof route.query.email === 'string' ? route.query.email : '',
  phone: typeof route.query.phone === 'string' ? route.query.phone : '',
  password: '',
  password_confirmation: '',
})
const showPassword = ref(false)
const submitting = ref(false)
const error = ref('')
const accountExists = ref(false)

const passwordChecks = computed(() => ({
  length: form.password.length >= 8,
  letter: /[A-Za-z]/.test(form.password),
  number: /\d/.test(form.password),
  match: !!form.password_confirmation && form.password === form.password_confirmation,
}))

const redirectTo = computed(() => {
  const value = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return value.startsWith('/') && !value.startsWith('//') ? value : '/account'
})

async function submit() {
  submitting.value = true
  error.value = ''
  accountExists.value = false

  try {
    await authStore.register({
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      password: form.password,
      password_confirmation: form.password_confirmation,
    })

    await router.push(`/verify-account?new=1&redirect=${encodeURIComponent(redirectTo.value)}`)
  } catch (err: any) {
    accountExists.value = err?.data?.account_exists === true
    error.value = extractApiErrorMessage(err, 'Could not create your account. Please check your details.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <StorefrontAuthFrame
    eyebrow="Join SAAJ"
    title="Create your account."
    description="Keep your orders, addresses and saved pieces together. Verification remains visible and under your control after signup."
    aside-title="A more considered checkout, every time."
    aside-copy="Create one SAAJ account for your orders, delivery addresses, wishlist and optional phone-code sign in."
  >
    <form class="space-y-5" @submit.prevent="submit">
      <div>
        <label class="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">Full name</label>
        <input v-model.trim="form.name" type="text" autocomplete="name" required class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950">
      </div>

      <div class="grid gap-5 sm:grid-cols-2">
        <div>
          <label class="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">Email</label>
          <input v-model.trim="form.email" type="email" autocomplete="email" required class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950">
        </div>
        <div>
          <label class="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">Mobile <span class="font-normal normal-case tracking-normal text-charcoal-400">optional</span></label>
          <input v-model.trim="form.phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="03XXXXXXXXX" class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950">
        </div>
      </div>

      <div>
        <label class="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">Password</label>
        <div class="relative">
          <input v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 pr-16 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950">
          <button type="button" class="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-[0.12em] text-charcoal-500" @click="showPassword = !showPassword">
            {{ showPassword ? 'Hide' : 'Show' }}
          </button>
        </div>
        <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px]">
          <span :class="passwordChecks.length ? 'text-[#657d6c]' : 'text-charcoal-400'">{{ passwordChecks.length ? '✓' : '○' }} 8+ characters</span>
          <span :class="passwordChecks.letter ? 'text-[#657d6c]' : 'text-charcoal-400'">{{ passwordChecks.letter ? '✓' : '○' }} Letter</span>
          <span :class="passwordChecks.number ? 'text-[#657d6c]' : 'text-charcoal-400'">{{ passwordChecks.number ? '✓' : '○' }} Number</span>
        </div>
      </div>

      <div>
        <label class="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">Confirm password</label>
        <input v-model="form.password_confirmation" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950">
        <p v-if="form.password_confirmation" class="mt-2 text-[10px]" :class="passwordChecks.match ? 'text-[#657d6c]' : 'text-[#9a4f4f]'">
          {{ passwordChecks.match ? '✓ Passwords match' : 'Passwords do not match yet' }}
        </p>
      </div>

      <div v-if="accountExists" class="border border-[#bd6f6f]/40 bg-[#bd6f6f]/[0.07] p-4">
        <p class="text-[12px] font-medium text-[#8f4949]">You may already have a SAAJ account.</p>
        <p class="mt-1 text-[11px] leading-5 text-[#9a5b5b]">{{ error }}</p>
        <div class="mt-4 flex flex-wrap gap-5 text-[10px] font-semibold uppercase tracking-[0.12em]">
          <NuxtLink :to="`/login?email=${encodeURIComponent(form.email)}${route.query.redirect ? `&redirect=${encodeURIComponent(String(route.query.redirect))}` : ''}`" class="text-[#8f4949] underline underline-offset-4">Sign in</NuxtLink>
          <NuxtLink :to="`/forgot-password?email=${encodeURIComponent(form.email)}`" class="text-[#8f4949] underline underline-offset-4">Reset password</NuxtLink>
        </div>
      </div>
      <div v-else-if="error" class="border border-[#bd6f6f]/35 bg-[#bd6f6f]/[0.07] px-4 py-3 text-[12px] leading-5 text-[#9a4f4f]">
        {{ error }}
      </div>

      <p class="text-[11px] leading-5 text-charcoal-400">
        We send an email verification link after signup. If you add a mobile number, you can verify it separately to enable phone-code sign in; an SMS is sent only when you explicitly request one.
      </p>

      <button type="submit" :disabled="submitting || !passwordChecks.match" class="flex w-full items-center justify-center gap-3 bg-charcoal-950 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-50 transition hover:opacity-90 disabled:opacity-45">
        <span v-if="submitting" class="h-3.5 w-3.5 animate-spin rounded-full border border-paper-50/30 border-t-paper-50" />
        {{ submitting ? 'Creating account…' : 'Create account' }}
        <span v-if="!submitting">→</span>
      </button>
    </form>

    <div class="mt-8 flex items-center justify-between gap-4 border-t border-charcoal-950/10 pt-6 text-[12px] text-charcoal-500">
      <span>Already have an account?</span>
      <NuxtLink :to="`/login${route.query.redirect ? `?redirect=${encodeURIComponent(String(route.query.redirect))}` : ''}`" class="font-medium text-charcoal-950 underline underline-offset-4">Sign in</NuxtLink>
    </div>
  </StorefrontAuthFrame>
</template>
