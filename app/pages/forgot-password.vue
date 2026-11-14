<script setup lang="ts">
import { isCompletePhoneNumber } from '~/utils/isCompletePhoneNumber'

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
const { formattedRemaining, canResend, start: startCooldown } = useOtpCooldown(30)

const validPassword = computed(() => password.value.length >= 8 && /[A-Za-z]/.test(password.value) && /\d/.test(password.value))
const passwordsMatch = computed(() => validPassword.value && password.value === passwordConfirmation.value)

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
  if (submitting.value || !canResend.value || !phone.value.trim()) return

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
  if (submitting.value || code.value.length < 4 || !passwordsMatch.value) return

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
  <StorefrontCredentialsFrame
    title="Reset your password"
    description="Get a reset link by email or use a code sent to your verified mobile number."
  >
    <div class="credentials-methods" :data-mode="mode" role="group" aria-label="Password reset method">
      <button type="button" class="credentials-method" :aria-pressed="mode === 'email'" @click="switchMode('email')">Email link</button>
      <button type="button" class="credentials-method" :aria-pressed="mode === 'phone'" @click="switchMode('phone')">Phone code</button>
      <span class="credentials-method-indicator" aria-hidden="true" />
    </div>

    <Transition name="credentials-switch" mode="out-in">
      <div v-if="mode === 'email' && emailSubmitted" class="credentials-message" role="status">
        <p class="credentials-success font-semibold">Check your email</p>
        <p class="mt-1 break-words">If an account exists for {{ email }}, a password reset link is on its way.</p>
      </div>
      <form v-else-if="mode === 'email'" key="email" class="credentials-form" @submit.prevent="submitEmail">
        <div>
          <label for="recovery-email" class="credentials-label">Email address</label>
          <div class="credentials-field">
            <input id="recovery-email" v-model.trim="email" class="credentials-input" type="email" autocomplete="email" autocapitalize="none" placeholder=" " required>
          </div>
        </div>
        <p v-if="error" class="credentials-message credentials-message-error" role="alert">{{ error }}</p>
        <button type="submit" :disabled="submitting" class="credentials-submit">
          {{ submitting ? 'Sending…' : 'Send reset link' }}
        </button>
      </form>

      <form v-else key="phone" class="credentials-form" @submit.prevent="otpSent ? resetWithPhone() : requestPhoneCode()">
        <div>
          <label for="recovery-phone" class="credentials-label">Verified mobile number</label>
          <div class="credentials-field">
            <input id="recovery-phone" v-model.trim="phone" class="credentials-input" type="tel" inputmode="tel" autocomplete="tel" placeholder="03XXXXXXXXX" :data-complete="isCompletePhoneNumber(phone)" :disabled="otpSent" required>
          </div>
        </div>

        <template v-if="otpSent">
          <div>
            <div class="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4">
              <p class="credentials-label">Verification code</p>
              <button type="button" class="credentials-link mb-1.5" :disabled="!canResend || submitting" @click="requestPhoneCode">
                {{ canResend ? 'Resend code' : `Resend in ${formattedRemaining}` }}
              </button>
            </div>
            <AuthOtpCodeInput v-model="code" :disabled="submitting" :data-complete="code.length === 6" class="credentials-otp" />
          </div>

          <div>
            <label for="recovery-password" class="credentials-label">New password</label>
            <div class="credentials-field">
              <input id="recovery-password" v-model="password" class="credentials-input" type="password" autocomplete="new-password" placeholder=" " :data-complete="validPassword" aria-describedby="recovery-password-help" required>
            </div>
            <p id="recovery-password-help" class="credentials-help mt-2">Use at least 8 characters, including a letter and a number.</p>
          </div>
          <div>
            <label for="recovery-confirm" class="credentials-label">Confirm password</label>
            <div class="credentials-field">
              <input id="recovery-confirm" v-model="passwordConfirmation" class="credentials-input" type="password" autocomplete="new-password" placeholder=" " :data-complete="passwordsMatch" required>
            </div>
          </div>
        </template>

        <p v-if="notice" class="credentials-message credentials-success" role="status">{{ notice }}</p>
        <p v-if="error" class="credentials-message credentials-message-error" role="alert">{{ error }}</p>

        <button v-if="!otpSent" type="submit" :disabled="submitting || !phone.trim() || !canResend" class="credentials-submit">
          {{ submitting ? 'Sending code…' : canResend ? 'Send code' : `Try again in ${formattedRemaining}` }}
        </button>
        <button v-else type="submit" :disabled="submitting || code.length < 4 || !passwordsMatch" class="credentials-submit">
          {{ submitting ? 'Updating…' : 'Set new password' }}
        </button>
      </form>
    </Transition>

    <div class="credentials-footer">
      <NuxtLink to="/login" class="credentials-link">Back to sign in</NuxtLink>
    </div>
  </StorefrontCredentialsFrame>
</template>
