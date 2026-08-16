<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()

useSeoMeta({
  title: 'Reset password | SAAJ',
  robots: 'noindex,nofollow',
})

const mode = ref<'email' | 'phone'>('email')
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const phone = ref('')
const code = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const emailSubmitted = ref(false)
const otpSent = ref(false)
const submitting = ref(false)
const error = ref('')
const notice = ref('')
const { remaining, formattedRemaining, canResend, start: startCooldown } = useOtpCooldown(30)

const passwordsMatch = computed(() => password.value.length >= 8 && password.value === passwordConfirmation.value)

function switchMode(next: 'email' | 'phone') {
  mode.value = next
  error.value = ''
  notice.value = ''
}

async function submitEmail() {
  submitting.value = true
  error.value = ''

  try {
    await $api('/customer/forgot-password', {
      method: 'POST',
      body: { email: email.value },
    })
    emailSubmitted.value = true
  } catch (err: any) {
    error.value = extractApiErrorMessage(err, 'Something went wrong. Please try again.')
  } finally {
    submitting.value = false
  }
}

function applyServerOtpCooldown(err: any) {
  const seconds = Number(err?.data?.retry_after ?? err?.response?._data?.retry_after ?? 0)
  if (Number.isFinite(seconds) && seconds > 0) startCooldown(seconds)
}

async function requestPhoneCode() {
  submitting.value = true
  error.value = ''
  notice.value = ''

  try {
    const response = await $api<{ message: string }>('/customer/otp/request', {
      method: 'POST',
      body: { phone: phone.value },
    })
    otpSent.value = true
    code.value = ''
    notice.value = response.message
    startCooldown()
  } catch (err: any) {
    applyServerOtpCooldown(err)
    error.value = extractApiErrorMessage(err, 'Could not request a code right now.')
  } finally {
    submitting.value = false
  }
}

async function resetWithPhone() {
  submitting.value = true
  error.value = ''

  try {
    await $api('/customer/otp/reset-password', {
      method: 'POST',
      body: {
        phone: phone.value,
        code: code.value,
        password: password.value,
        password_confirmation: passwordConfirmation.value,
      },
    })

    await router.push('/login?reset=success')
  } catch (err: any) {
    error.value = extractApiErrorMessage(err, 'That code is invalid or has expired.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <StorefrontAuthFrame
    eyebrow="Account recovery"
    title="Reset your password."
    description="Use your email reset link, or a one-time code if your mobile number has already been verified."
    aside-title="Access, recovered carefully."
    aside-copy="Choose the recovery path connected to your account. We keep both email and phone recovery deliberately private."
  >
    <div class="grid grid-cols-2 border-b border-charcoal-950/10">
      <button type="button" class="relative pb-3 text-[10px] font-semibold uppercase tracking-[0.15em]" :class="mode === 'email' ? 'text-charcoal-950' : 'text-charcoal-400'" @click="switchMode('email')">
        Email link
        <span v-if="mode === 'email'" class="absolute inset-x-0 -bottom-px h-px bg-charcoal-950" />
      </button>
      <button type="button" class="relative pb-3 text-[10px] font-semibold uppercase tracking-[0.15em]" :class="mode === 'phone' ? 'text-charcoal-950' : 'text-charcoal-400'" @click="switchMode('phone')">
        Phone code
        <span v-if="mode === 'phone'" class="absolute inset-x-0 -bottom-px h-px bg-charcoal-950" />
      </button>
    </div>

    <template v-if="mode === 'email'">
      <div v-if="emailSubmitted" class="mt-7 border border-[#657d6c]/30 bg-[#657d6c]/[0.08] p-5">
        <p class="text-[12px] font-medium text-[#52685a]">Check your email.</p>
        <p class="mt-2 text-[11px] leading-5 text-charcoal-500">
          If an account exists for <span class="text-charcoal-950">{{ email }}</span>, a password reset link is on its way.
        </p>
      </div>
      <form v-else class="mt-7 space-y-5" @submit.prevent="submitEmail">
        <div>
          <label class="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">Email</label>
          <input v-model.trim="email" type="email" autocomplete="email" required class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950">
        </div>
        <div v-if="error" class="border border-[#bd6f6f]/35 bg-[#bd6f6f]/[0.07] px-4 py-3 text-[12px] leading-5 text-[#9a4f4f]">{{ error }}</div>
        <button type="submit" :disabled="submitting" class="flex w-full items-center justify-center gap-3 bg-charcoal-950 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-50 disabled:opacity-45">
          <span v-if="submitting" class="h-3.5 w-3.5 animate-spin rounded-full border border-paper-50/30 border-t-paper-50" />
          {{ submitting ? 'Sending…' : 'Send reset link' }}
        </button>
      </form>
    </template>

    <div v-else class="mt-7 space-y-5">
      <div>
        <label class="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">Verified mobile number</label>
        <input v-model.trim="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="03XXXXXXXXX" :disabled="otpSent" class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950 disabled:opacity-65">
      </div>

      <template v-if="otpSent">
        <div>
          <div class="mb-3 flex items-center justify-between gap-4">
            <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">Code</p>
            <button type="button" :disabled="!canResend || submitting" class="text-[10px] uppercase tracking-[0.12em] text-charcoal-500 underline underline-offset-4 disabled:no-underline disabled:opacity-45" @click="requestPhoneCode">
              {{ canResend ? 'Resend code' : `Resend in ${formattedRemaining}` }}
            </button>
          </div>
          <AuthOtpCodeInput v-model="code" :disabled="submitting" />
        </div>

        <div>
          <label class="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">New password</label>
          <input v-model="password" type="password" autocomplete="new-password" class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950">
        </div>
        <div>
          <label class="mb-2 block text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">Confirm password</label>
          <input v-model="passwordConfirmation" type="password" autocomplete="new-password" class="w-full border border-charcoal-950/15 bg-transparent px-4 py-3.5 text-[16px] text-charcoal-950 outline-none transition focus:border-charcoal-950">
        </div>
      </template>

      <div v-if="notice" class="border border-[#657d6c]/30 bg-[#657d6c]/[0.08] px-4 py-3 text-[12px] leading-5 text-[#52685a]">{{ notice }}</div>
      <div v-if="error" class="border border-[#bd6f6f]/35 bg-[#bd6f6f]/[0.07] px-4 py-3 text-[12px] leading-5 text-[#9a4f4f]">{{ error }}</div>

      <button v-if="!otpSent" type="button" :disabled="submitting || !phone.trim() || !canResend" class="flex w-full items-center justify-center gap-3 bg-charcoal-950 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-50 disabled:opacity-45" @click="requestPhoneCode">
        <span v-if="submitting" class="h-3.5 w-3.5 animate-spin rounded-full border border-paper-50/30 border-t-paper-50" />
        {{ submitting ? 'Sending code…' : canResend ? 'Send code' : `Try again in ${formattedRemaining}` }}
      </button>
      <button v-else type="button" :disabled="submitting || code.length < 4 || !passwordsMatch" class="flex w-full items-center justify-center gap-3 bg-charcoal-950 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-50 disabled:opacity-45" @click="resetWithPhone">
        <span v-if="submitting" class="h-3.5 w-3.5 animate-spin rounded-full border border-paper-50/30 border-t-paper-50" />
        {{ submitting ? 'Updating…' : 'Set new password' }}
      </button>

      <p class="text-[11px] leading-5 text-charcoal-400">For privacy, we show the same code-request message whether or not the number belongs to an account.</p>
    </div>

    <NuxtLink to="/login" class="mt-8 inline-block text-[10px] font-semibold uppercase tracking-[0.13em] text-charcoal-950 underline underline-offset-4">← Back to sign in</NuxtLink>
  </StorefrontAuthFrame>
</template>
