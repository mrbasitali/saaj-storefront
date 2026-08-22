<script setup lang="ts">
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

useSeoMeta({
  title: 'Sign in | SAAJ',
  robots: 'noindex,nofollow',
})

const mode = ref<'email' | 'phone'>('email')
const emailForm = reactive({
  email: typeof route.query.email === 'string' ? route.query.email : '',
  password: '',
})
const phone = ref('')
const otpCode = ref('')
const otpSent = ref(false)
const showPassword = ref(false)
const submitting = ref(false)
const requestingOtp = ref(false)
const error = ref('')
const notice = ref('')
const phoneAccountMissing = ref(false)
const phoneNotVerified = ref(false)
const { remaining, formattedRemaining, canResend, start: startCooldown } = useOtpCooldown(30)

const redirectTo = computed(() => {
  const value = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return value.startsWith('/') && !value.startsWith('//') ? value : '/account'
})

function switchMode(next: 'email' | 'phone') {
  mode.value = next
  error.value = ''
  notice.value = ''
  phoneAccountMissing.value = false
  phoneNotVerified.value = false
}

async function finishLogin(customer: { email_verified: boolean }) {
  if (route.query.redirect) {
    await router.push(redirectTo.value)
    return
  }

  await router.push(customer.email_verified ? '/account' : '/verify-account')
}

async function submitEmail() {
  submitting.value = true
  error.value = ''

  try {
    const customer = await authStore.login(emailForm)
    await finishLogin(customer)
  } catch (err: any) {
    error.value = extractApiErrorMessage(err, 'Could not sign in. Check your details and try again.')
  } finally {
    submitting.value = false
  }
}

function apiErrorData(err: any) {
  return err?.data ?? err?.response?._data ?? err?.response?.data ?? null
}

watch(phone, () => {
  phoneAccountMissing.value = false
  phoneNotVerified.value = false
  error.value = ''
})

function applyServerOtpCooldown(err: any) {
  const seconds = Number(err?.data?.retry_after ?? err?.response?._data?.retry_after ?? 0)
  if (Number.isFinite(seconds) && seconds > 0) startCooldown(seconds)
}

async function requestOtp() {
  if (!phone.value.trim()) return

  requestingOtp.value = true
  error.value = ''
  notice.value = ''

  try {
    const response = await authStore.requestLoginOtp(phone.value)
    otpSent.value = true
    otpCode.value = ''
    notice.value = response.message
    startCooldown()
  } catch (err: any) {
    applyServerOtpCooldown(err)
    const data = apiErrorData(err)
    phoneAccountMissing.value = data?.code === 'phone_account_not_found'
    phoneNotVerified.value = data?.code === 'phone_not_verified'
    error.value = extractApiErrorMessage(err, 'Could not request a code right now. Please try again.')
  } finally {
    requestingOtp.value = false
  }
}

async function submitOtp() {
  if (otpCode.value.length < 4) return

  submitting.value = true
  error.value = ''

  try {
    const customer = await authStore.loginWithOtp({ phone: phone.value, code: otpCode.value })
    await finishLogin(customer)
  } catch (err: any) {
    error.value = extractApiErrorMessage(err, 'That code is invalid or has expired.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <StorefrontAuthFrame
    title="Welcome back."
    description="Sign in with your email and password, or use a one-time code on a phone you have already verified."
  >
    <div v-if="route.query.reset === 'success'" class="mb-6 border border-[#657d6c]/30 bg-[#657d6c]/[0.08] px-4 py-3 text-[12px] leading-5 text-[#52685a]">
      ✓ Your password has been updated. Sign in with your new password.
    </div>
    <div v-if="route.query.setup === 'success'" class="mb-6 border border-[#657d6c]/30 bg-[#657d6c]/[0.08] px-4 py-3 text-[12px] leading-5 text-[#52685a]">
      ✓ Your SAAJ account is ready. Sign in with the password you just chose.
    </div>

    <div class="grid grid-cols-2 border-b border-charcoal-950/10">
      <button
        type="button"
        class="relative pb-3 text-[10px] font-semibold uppercase tracking-[0.15em] transition"
        :class="mode === 'email' ? 'text-charcoal-950' : 'text-charcoal-400'"
        @click="switchMode('email')"
      >
        Email & password
        <span v-if="mode === 'email'" class="absolute inset-x-0 -bottom-px h-px bg-charcoal-950" />
      </button>
      <button
        type="button"
        class="relative pb-3 text-[10px] font-semibold uppercase tracking-[0.15em] transition"
        :class="mode === 'phone' ? 'text-charcoal-950' : 'text-charcoal-400'"
        @click="switchMode('phone')"
      >
        Phone code
        <span v-if="mode === 'phone'" class="absolute inset-x-0 -bottom-px h-px bg-charcoal-950" />
      </button>
    </div>

    <form v-if="mode === 'email'" class="mt-7 space-y-5" @submit.prevent="submitEmail">
      <div>
        <label class="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">Email</label>
        <input
          v-model.trim="emailForm.email"
          type="email"
          autocomplete="email"
          required
          class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950"
        >
      </div>

      <div>
        <div class="mb-2 flex items-center justify-between gap-4">
          <label class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">Password</label>
          <NuxtLink
            :to="`/forgot-password${emailForm.email ? `?email=${encodeURIComponent(emailForm.email)}` : ''}`"
            class="text-[10px] uppercase tracking-[0.12em] text-charcoal-500 underline underline-offset-4 transition hover:text-charcoal-950"
          >
            Forgot password?
          </NuxtLink>
        </div>
        <div class="relative">
          <input
            v-model="emailForm.password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            required
            class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 pr-16 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950"
          >
          <button
            type="button"
            class="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase tracking-[0.12em] text-charcoal-500 hover:text-charcoal-950"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? 'Hide' : 'Show' }}
          </button>
        </div>
      </div>

      <div v-if="error" class="border border-[#bd6f6f]/35 bg-[#bd6f6f]/[0.07] px-4 py-3 text-[12px] leading-5 text-[#9a4f4f]">
        {{ error }}
      </div>

      <button
        type="submit"
        :disabled="submitting"
        class="flex w-full items-center justify-center gap-3 bg-charcoal-950 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-50 transition hover:opacity-90 disabled:cursor-wait disabled:opacity-55"
      >
        <span v-if="submitting" class="h-3.5 w-3.5 animate-spin rounded-full border border-paper-50/30 border-t-paper-50" />
        {{ submitting ? 'Signing in…' : 'Sign in' }}
        <span v-if="!submitting">→</span>
      </button>
    </form>

    <div v-else class="mt-7">
      <div>
        <label class="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">Mobile number</label>
        <input
          v-model.trim="phone"
          type="tel"
          inputmode="tel"
          autocomplete="tel"
          placeholder="03XXXXXXXXX"
          :disabled="otpSent"
          class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950 disabled:opacity-65"
        >
      </div>

      <template v-if="otpSent">
        <div class="mt-6">
          <div class="mb-3 flex items-center justify-between gap-4">
            <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">Verification code</p>
            <button
              type="button"
              class="text-[10px] uppercase tracking-[0.12em] text-charcoal-500 underline underline-offset-4 disabled:no-underline disabled:opacity-45"
              :disabled="!canResend || requestingOtp"
              @click="requestOtp"
            >
              {{ canResend ? 'Resend code' : `Resend in ${formattedRemaining}` }}
            </button>
          </div>
          <AuthOtpCodeInput v-model="otpCode" :disabled="submitting" />
        </div>

        <button
          type="button"
          class="mt-4 text-[10px] uppercase tracking-[0.12em] text-charcoal-500 underline underline-offset-4"
          @click="otpSent = false; otpCode = ''; error = ''; notice = ''"
        >
          Use a different number
        </button>
      </template>

      <p class="mt-4 text-[11px] leading-5 text-charcoal-400">
        Phone-code sign in is available only after that mobile number has been verified on your SAAJ account.
      </p>

      <div v-if="notice" class="mt-5 border border-[#657d6c]/30 bg-[#657d6c]/[0.08] px-4 py-3 text-[12px] leading-5 text-[#52685a]">
        {{ notice }}
      </div>

      <div v-if="phoneAccountMissing" class="mt-5 border border-charcoal-950/12 bg-mist-50 p-4">
        <p class="text-[12px] font-semibold text-charcoal-950">We didn’t find that phone number.</p>
        <p class="mt-1 text-[11px] leading-5 text-charcoal-500">No SMS was sent. Create an account with this number, or use email sign in if you already have an account under a different phone.</p>
        <div class="mt-4 flex flex-wrap gap-3">
          <NuxtLink :to="`/register?phone=${encodeURIComponent(phone)}${route.query.redirect ? `&redirect=${encodeURIComponent(String(route.query.redirect))}` : ''}`" class="inline-flex min-h-10 items-center bg-charcoal-950 px-4 text-[9px] font-semibold uppercase tracking-[0.13em] text-paper-50">Create account</NuxtLink>
          <button type="button" class="text-[9px] font-semibold uppercase tracking-[0.13em] text-charcoal-500 underline underline-offset-4" @click="switchMode('email')">Use email instead</button>
        </div>
      </div>

      <div v-else-if="phoneNotVerified" class="mt-5 border border-[#b58b4b]/30 bg-[#b58b4b]/[0.07] p-4 text-[12px] leading-5 text-[#806433]">
        {{ error }}
        <button type="button" class="mt-3 block text-[9px] font-semibold uppercase tracking-[0.13em] underline underline-offset-4" @click="switchMode('email')">Sign in with email to verify phone</button>
      </div>
      <div v-else-if="error" class="mt-5 border border-[#bd6f6f]/35 bg-[#bd6f6f]/[0.07] px-4 py-3 text-[12px] leading-5 text-[#9a4f4f]">
        {{ error }}
      </div>

      <button
        v-if="!otpSent"
        type="button"
        :disabled="requestingOtp || !phone.trim() || !canResend"
        class="mt-6 flex w-full items-center justify-center gap-3 bg-charcoal-950 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-50 transition hover:opacity-90 disabled:opacity-45"
        @click="requestOtp"
      >
        <span v-if="requestingOtp" class="h-3.5 w-3.5 animate-spin rounded-full border border-paper-50/30 border-t-paper-50" />
        {{ requestingOtp ? 'Sending code…' : canResend ? 'Send code' : `Try again in ${formattedRemaining}` }}
      </button>
      <button
        v-else
        type="button"
        :disabled="submitting || otpCode.length < 4"
        class="mt-6 flex w-full items-center justify-center gap-3 bg-charcoal-950 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-50 transition hover:opacity-90 disabled:opacity-45"
        @click="submitOtp"
      >
        <span v-if="submitting" class="h-3.5 w-3.5 animate-spin rounded-full border border-paper-50/30 border-t-paper-50" />
        {{ submitting ? 'Checking code…' : 'Sign in with code' }}
      </button>
    </div>

    <div class="mt-8 flex items-center justify-between gap-4 border-t border-charcoal-950/10 pt-6 text-[12px] text-charcoal-500">
      <span>New to SAAJ?</span>
      <NuxtLink
        :to="`/register${route.query.redirect ? `?redirect=${encodeURIComponent(String(route.query.redirect))}` : ''}`"
        class="font-medium text-charcoal-950 underline underline-offset-4"
      >
        Create an account
      </NuxtLink>
    </div>
  </StorefrontAuthFrame>
</template>
