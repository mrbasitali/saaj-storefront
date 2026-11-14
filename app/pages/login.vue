<script setup lang="ts">
import { isCompletePhoneNumber } from '~/utils/isCompletePhoneNumber'

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

async function finishLogin(customer: { email_verified: boolean, phone_verified: boolean }) {
  if (route.query.redirect) {
    await router.push(redirectTo.value)
    return
  }

  await router.push(customer.email_verified || customer.phone_verified ? '/account' : '/verify-account')
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
  if (!phone.value.trim() || requestingOtp.value || !canResend.value) return

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
  if (otpCode.value.length < 4 || submitting.value) return

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
  <StorefrontCredentialsFrame
    title="Sign in"
    description="Use your email address or a code sent to your verified phone."
  >
    <p v-if="route.query.reset === 'success'" class="credentials-message credentials-success mb-5" role="status">
      Your password has been updated. Sign in with your new password.
    </p>
    <p v-if="route.query.setup === 'success'" class="credentials-message credentials-success mb-5" role="status">
      Your SAAJ account is ready. Sign in with the password you just chose.
    </p>

    <div class="credentials-methods" :data-mode="mode" role="group" aria-label="Sign-in method">
      <button type="button" class="credentials-method" :aria-pressed="mode === 'email'" @click="switchMode('email')">
        Email &amp; password
      </button>
      <button type="button" class="credentials-method" :aria-pressed="mode === 'phone'" @click="switchMode('phone')">
        Phone code
      </button>
      <span class="credentials-method-indicator" aria-hidden="true" />
    </div>

    <Transition name="credentials-switch" mode="out-in">
      <form v-if="mode === 'email'" class="credentials-form" @submit.prevent="submitEmail">
        <div>
          <label for="sign-in-email" class="credentials-label">Email address</label>
          <div class="credentials-field">
            <input id="sign-in-email" v-model.trim="emailForm.email" type="email" autocomplete="email" placeholder=" " autocapitalize="none" required class="credentials-input">
          </div>
        </div>

        <div>
          <div class="flex flex-wrap items-baseline justify-between gap-x-4">
            <label for="sign-in-password" class="credentials-label">Password</label>
            <NuxtLink
              :to="`/forgot-password${emailForm.email ? `?email=${encodeURIComponent(emailForm.email)}` : ''}`"
              class="credentials-link mb-1.5"
            >
              Forgot password?
            </NuxtLink>
          </div>
          <div class="credentials-field">
            <input
              id="sign-in-password"
              v-model="emailForm.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder=" "
              required
              class="credentials-input credentials-password"
            >
            <button
              type="button"
              class="credentials-toggle"
              aria-controls="sign-in-password"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Hide' : 'Show' }}
            </button>
          </div>
        </div>

        <p v-if="error" class="credentials-message credentials-message-error" role="alert">{{ error }}</p>

        <button type="submit" :disabled="submitting" class="credentials-submit">
          {{ submitting ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <form v-else class="credentials-form" @submit.prevent="otpSent ? submitOtp() : requestOtp()">
        <div>
          <label for="sign-in-phone" class="credentials-label">Mobile number</label>
          <div class="credentials-field">
            <input
              id="sign-in-phone"
              v-model.trim="phone"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              placeholder="03XXXXXXXXX"
              :data-complete="isCompletePhoneNumber(phone)"
              aria-describedby="sign-in-phone-help"
              :disabled="otpSent"
              required
              class="credentials-input"
            >
          </div>
          <p id="sign-in-phone-help" class="credentials-help mt-2">Use the verified mobile number on your account.</p>
        </div>

        <div v-if="otpSent">
          <div class="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4">
            <p class="credentials-label">Verification code</p>
            <button type="button" class="credentials-link mb-1.5" :disabled="!canResend || requestingOtp" @click="requestOtp">
              {{ canResend ? 'Resend code' : `Resend in ${formattedRemaining}` }}
            </button>
          </div>
          <AuthOtpCodeInput v-model="otpCode" :disabled="submitting" :data-complete="otpCode.length === 6" class="credentials-otp" />

          <button type="button" class="credentials-link mt-3" @click="otpSent = false; otpCode = ''; error = ''; notice = ''">
            Use a different number
          </button>
        </div>

        <p v-if="notice" class="credentials-message credentials-success" role="status">{{ notice }}</p>

        <div v-if="phoneAccountMissing" class="credentials-message credentials-message-error">
          <p class="font-semibold" role="alert">We didn’t find that phone number.</p>
          <p class="mt-1">Create an account with this number or sign in with email.</p>
          <div class="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            <NuxtLink
              :to="`/register?phone=${encodeURIComponent(phone)}${route.query.redirect ? `&redirect=${encodeURIComponent(String(route.query.redirect))}` : ''}`"
              class="credentials-link"
            >
              Create an account
            </NuxtLink>
            <button type="button" class="credentials-link" @click="switchMode('email')">Use email instead</button>
          </div>
        </div>

        <div v-else-if="phoneNotVerified" class="credentials-message credentials-message-error">
          <p role="alert">{{ error }}</p>
          <button type="button" class="credentials-link mt-3" @click="switchMode('email')">Sign in with email to verify your number</button>
        </div>
        <p v-else-if="error" class="credentials-message credentials-message-error" role="alert">{{ error }}</p>

        <button
          v-if="!otpSent"
          type="submit"
          :disabled="requestingOtp || !phone.trim() || !canResend"
          class="credentials-submit"
        >
          {{ requestingOtp ? 'Sending code…' : canResend ? 'Send code' : `Try again in ${formattedRemaining}` }}
        </button>
        <button v-else type="submit" :disabled="submitting || otpCode.length < 4" class="credentials-submit">
          {{ submitting ? 'Checking code…' : 'Sign in with code' }}
        </button>
      </form>
    </Transition>

    <div class="credentials-footer">
      <span>New to SAAJ?</span>
      <NuxtLink
        :to="`/register${route.query.redirect ? `?redirect=${encodeURIComponent(String(route.query.redirect))}` : ''}`"
        class="credentials-link"
      >
        Create an account
      </NuxtLink>
    </div>
  </StorefrontCredentialsFrame>
</template>
