<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

useSeoMeta({
  title: 'Verify account | SAAJ',
  robots: 'noindex,nofollow',
})

const emailBusy = ref(false)
const phoneBusy = ref(false)
const phoneCodeSent = ref(false)
const phoneCode = ref('')
const emailMessage = ref('')
const phoneMessage = ref('')
const error = ref('')
const { remaining, formattedRemaining, canResend, start: startCooldown } = useOtpCooldown(30)

const customer = computed(() => authStore.customer)
const redirectTo = computed(() => {
  const value = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return value.startsWith('/') && !value.startsWith('//') ? value : '/account'
})
const allAvailableVerified = computed(() => customer.value?.email_verified && (!customer.value.phone || customer.value.phone_verified))

async function resendEmail() {
  emailBusy.value = true
  error.value = ''
  emailMessage.value = ''

  try {
    const response = await authStore.resendEmailVerification()
    emailMessage.value = response.message
  } catch (err: any) {
    error.value = extractApiErrorMessage(err, 'Could not send the verification email right now.')
  } finally {
    emailBusy.value = false
  }
}

function applyServerOtpCooldown(err: any) {
  const seconds = Number(err?.data?.retry_after ?? err?.response?._data?.retry_after ?? 0)
  if (Number.isFinite(seconds) && seconds > 0) startCooldown(seconds)
}

async function sendPhoneCode() {
  phoneBusy.value = true
  error.value = ''
  phoneMessage.value = ''

  try {
    const response = await authStore.sendPhoneVerification()
    phoneCodeSent.value = true
    phoneCode.value = ''
    phoneMessage.value = response.message
    startCooldown()
  } catch (err: any) {
    applyServerOtpCooldown(err)
    error.value = extractApiErrorMessage(err, 'Could not send a verification code right now.')
  } finally {
    phoneBusy.value = false
  }
}

async function confirmPhone() {
  if (phoneBusy.value || phoneCode.value.length < 4) return
  phoneBusy.value = true
  error.value = ''

  try {
    const response = await authStore.confirmPhoneVerification(phoneCode.value)
    phoneMessage.value = response.message
    phoneCodeSent.value = false
    phoneCode.value = ''
  } catch (err: any) {
    error.value = extractApiErrorMessage(err, 'That code is invalid or has expired.')
  } finally {
    phoneBusy.value = false
  }
}

async function refreshStatus() {
  error.value = ''
  try {
    await authStore.fetchMe()
  } catch (err: any) {
    error.value = extractApiErrorMessage(err, 'Could not refresh verification status.')
  }
}

async function continueOn() {
  await router.push(redirectTo.value)
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') void refreshStatus()
}

onMounted(() => document.addEventListener('visibilitychange', onVisibilityChange))
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisibilityChange))
</script>

<template>
  <main class="min-h-[66vh] bg-paper-50 px-5 pb-14 pt-8 subpixel-antialiased text-charcoal-950 sm:px-8 sm:pb-20 sm:pt-12 lg:pt-16">
    <div class="mx-auto max-w-[620px]">
      <header>
        <h1 class="font-display text-[44px] font-medium leading-none tracking-[-0.045em] sm:text-[56px]">
          {{ allAvailableVerified ? 'Account verified' : 'Verify your account' }}
        </h1>
        <p class="mt-3 max-w-lg text-base leading-6 text-charcoal-700">
          {{ allAvailableVerified
            ? 'Your verified contact details are ready to use for account recovery.'
            : 'Verify your email for account recovery. You can also verify your mobile for one-time-code sign-in.' }}
        </p>
      </header>

      <p v-if="route.query.new === '1' && !allAvailableVerified" class="mt-5 bg-charcoal-950/[0.045] px-4 py-3 text-sm leading-5">
        Your SAAJ account is ready. You can continue shopping or verify your details here.
      </p>

      <div class="mt-6 divide-y divide-charcoal-950/12 border-y border-charcoal-950/12 sm:mt-8">
        <section aria-labelledby="verification-email" class="py-4 sm:py-5">
          <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2.5">
            <div class="min-w-0">
              <h2 id="verification-email" class="text-base font-semibold">Email</h2>
              <p class="mt-1 break-words text-sm text-charcoal-800">{{ customer?.email || 'No email address added' }}</p>
            </div>
            <StorefrontVerificationStatus v-if="customer?.email" role="status" :status="customer.email_verified ? 'verified' : 'pending'" />
          </div>

          <template v-if="customer?.email && !customer.email_verified">
            <p class="mt-4 text-sm leading-6 text-charcoal-600">Open the verification link in your inbox. If it hasn’t arrived, request a fresh link.</p>
            <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
              <button type="button" :disabled="emailBusy" class="verification-action" @click="resendEmail">
                {{ emailBusy ? 'Sending…' : 'Resend verification email' }}
              </button>
              <button type="button" class="verification-action text-charcoal-600" @click="refreshStatus">Refresh status</button>
            </div>
          </template>
          <NuxtLink v-else-if="!customer?.email && customer?.phone_verified" to="/account/profile" class="verification-action mt-2">Add email address</NuxtLink>
          <p v-if="emailMessage && !customer?.email_verified" role="status" class="mt-2 text-sm leading-5">{{ emailMessage }}</p>
        </section>

        <section aria-labelledby="verification-mobile" class="py-4 sm:py-5">
          <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2.5">
            <div class="min-w-0">
              <h2 id="verification-mobile" class="text-base font-semibold">Mobile</h2>
              <p class="mt-1 break-words text-sm text-charcoal-800">{{ customer?.phone || 'No mobile number added' }}</p>
            </div>
            <StorefrontVerificationStatus role="status" :status="customer?.phone_verified ? 'verified' : 'optional'" />
          </div>

          <NuxtLink v-if="!customer?.phone && customer?.email_verified" to="/account/profile" class="verification-action mt-2">Add mobile number</NuxtLink>
          <template v-else-if="customer?.phone && !customer.phone_verified">
            <form v-if="phoneCodeSent" class="mt-4 max-w-sm" @submit.prevent="confirmPhone">
              <div class="mb-2 flex flex-wrap items-center justify-between gap-x-3">
                <p class="text-sm font-semibold">Enter the SMS code</p>
                <button type="button" :disabled="!canResend || phoneBusy" class="verification-action text-charcoal-600" @click="sendPhoneCode">
                  {{ canResend ? 'Resend' : `Resend in ${formattedRemaining}` }}
                </button>
              </div>
              <AuthOtpCodeInput v-model="phoneCode" :disabled="phoneBusy" />
              <button type="submit" :disabled="phoneBusy || phoneCode.length < 4" class="verification-primary mt-3 w-full">
                {{ phoneBusy ? 'Checking…' : 'Verify mobile' }}
              </button>
            </form>
            <button v-else type="button" :disabled="phoneBusy || !canResend" class="verification-action mt-2" @click="sendPhoneCode">
              {{ phoneBusy ? 'Sending…' : canResend ? 'Send verification code' : `Try again in ${formattedRemaining}` }}
            </button>
          </template>
          <p v-if="phoneMessage && !customer?.phone_verified" role="status" class="mt-2 text-sm leading-5">{{ phoneMessage }}</p>
        </section>
      </div>

      <div v-if="error" role="alert" class="mt-4 border border-[#bd6f6f]/35 bg-[#bd6f6f]/[0.08] px-4 py-3 text-sm leading-5 text-[#8c4949] dark:text-rose-200">{{ error }}</div>

      <div class="mt-5 grid gap-2 sm:mt-6 sm:grid-cols-2">
        <button type="button" class="verification-primary" @click="continueOn">
          {{ allAvailableVerified ? 'Continue' : 'Continue for now' }}
          <StorefrontIcon name="chevron" :size="16" class="-rotate-90" />
        </button>
        <NuxtLink to="/account/profile" class="flex min-h-12 items-center justify-center border border-charcoal-950/18 px-5 py-2.5 text-sm font-semibold hover:bg-charcoal-950/[0.045]">Manage profile</NuxtLink>
      </div>
    </div>
  </main>
</template>

<style scoped>
.verification-action,
.verification-primary {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  font-size: .875rem;
  font-weight: 600;
}

.verification-action {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.verification-primary {
  min-height: 48px;
  background: var(--color-charcoal-950);
  padding: .625rem 1.25rem;
  color: var(--color-paper-50);
}

.verification-primary:hover:not(:disabled) {
  opacity: .88;
}

.verification-primary .storefront-icon {
  --icon-primary: currentColor;
}

.verification-action:disabled,
.verification-primary:disabled {
  opacity: .55;
}
</style>
