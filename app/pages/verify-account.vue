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
  await authStore.fetchMe()
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
  <StorefrontAuthFrame
    eyebrow="Account verification"
    title="Confirm the details that are yours."
    description="Email verification protects account recovery. Phone verification is optional, and enables secure one-time-code sign in and recovery."
    aside-title="One account. Two ways to prove it’s yours."
    aside-copy="We never send a phone verification SMS automatically. You choose when to request a code, keeping both cost and account activity intentional."
  >
    <div v-if="route.query.new === '1'" class="mb-6 border border-[#657d6c]/30 bg-[#657d6c]/[0.08] p-4 text-[12px] leading-5 text-[#52685a]">
      Your SAAJ account has been created. You can continue shopping now, or finish verification below.
    </div>

    <div class="space-y-4">
      <section class="border border-charcoal-950/12 p-5 sm:p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">Email</p>
            <p class="mt-2 text-[14px] text-charcoal-950">{{ customer?.email }}</p>
          </div>
          <span
            class="px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.14em]"
            :class="customer?.email_verified ? 'bg-[#657d6c]/12 text-[#52685a]' : 'bg-[#b78b57]/12 text-[#89683f]'"
          >
            {{ customer?.email_verified ? 'Verified' : 'Pending' }}
          </span>
        </div>

        <template v-if="!customer?.email_verified">
          <p class="mt-4 text-[11px] leading-5 text-charcoal-500">Open the verification link we sent to this address. If it didn’t arrive, you can send another.</p>
          <div class="mt-4 flex flex-wrap items-center gap-5">
            <button type="button" :disabled="emailBusy" class="text-[10px] font-semibold uppercase tracking-[0.13em] text-charcoal-950 underline underline-offset-4 disabled:opacity-45" @click="resendEmail">
              {{ emailBusy ? 'Sending…' : 'Resend verification email' }}
            </button>
            <button type="button" class="text-[10px] uppercase tracking-[0.12em] text-charcoal-500 underline underline-offset-4" @click="refreshStatus">I’ve verified it — refresh</button>
          </div>
          <p v-if="emailMessage" class="mt-3 text-[11px] text-[#52685a]">{{ emailMessage }}</p>
        </template>
      </section>

      <section class="border border-charcoal-950/12 p-5 sm:p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">Mobile</p>
            <p class="mt-2 text-[14px] text-charcoal-950">{{ customer?.phone || 'No mobile number added' }}</p>
          </div>
          <span
            v-if="customer?.phone"
            class="px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.14em]"
            :class="customer?.phone_verified ? 'bg-[#657d6c]/12 text-[#52685a]' : 'bg-[#b78b57]/12 text-[#89683f]'"
          >
            {{ customer?.phone_verified ? 'Verified' : 'Optional' }}
          </span>
        </div>

        <template v-if="!customer?.phone">
          <p class="mt-4 text-[11px] leading-5 text-charcoal-500">Add a mobile number in your profile if you want phone-code sign in and recovery.</p>
          <NuxtLink to="/account/profile" class="mt-4 inline-block text-[10px] font-semibold uppercase tracking-[0.13em] text-charcoal-950 underline underline-offset-4">Add mobile number</NuxtLink>
        </template>

        <template v-else-if="!customer.phone_verified">
          <p class="mt-4 text-[11px] leading-5 text-charcoal-500">Request a one-time SMS only when you’re ready to verify this number.</p>

          <div v-if="phoneCodeSent" class="mt-5 max-w-sm">
            <div class="mb-3 flex items-center justify-between gap-4">
              <p class="text-[9px] font-semibold uppercase tracking-[0.16em] text-charcoal-500">Verification code</p>
              <button type="button" :disabled="!canResend || phoneBusy" class="text-[10px] uppercase tracking-[0.12em] text-charcoal-500 underline underline-offset-4 disabled:no-underline disabled:opacity-45" @click="sendPhoneCode">
                {{ canResend ? 'Resend' : `Resend in ${formattedRemaining}` }}
              </button>
            </div>
            <AuthOtpCodeInput v-model="phoneCode" :disabled="phoneBusy" />
            <button type="button" :disabled="phoneBusy || phoneCode.length < 4" class="mt-4 w-full bg-charcoal-950 px-5 py-3.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-paper-50 disabled:opacity-45" @click="confirmPhone">
              {{ phoneBusy ? 'Checking…' : 'Verify mobile' }}
            </button>
          </div>
          <button v-else type="button" :disabled="phoneBusy || !canResend" class="mt-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-charcoal-950 underline underline-offset-4 disabled:opacity-45" @click="sendPhoneCode">
            {{ phoneBusy ? 'Sending…' : canResend ? 'Send verification code' : `Try again in ${formattedRemaining}` }}
          </button>
          <p v-if="phoneMessage" class="mt-3 text-[11px] text-[#52685a]">{{ phoneMessage }}</p>
        </template>

        <p v-else class="mt-4 text-[11px] leading-5 text-charcoal-500">This number can now be used for phone-code sign in and password recovery.</p>
      </section>
    </div>

    <div v-if="error" class="mt-5 border border-[#bd6f6f]/35 bg-[#bd6f6f]/[0.07] px-4 py-3 text-[12px] leading-5 text-[#9a4f4f]">{{ error }}</div>

    <div class="mt-7 flex flex-col gap-3 sm:flex-row">
      <button type="button" class="flex-1 bg-charcoal-950 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper-50" @click="continueOn">
        {{ allAvailableVerified ? 'Continue' : 'Continue for now' }} →
      </button>
      <NuxtLink to="/account/profile" class="flex flex-1 items-center justify-center border border-charcoal-950/18 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-950">Manage profile</NuxtLink>
    </div>
  </StorefrontAuthFrame>
</template>
