<script setup lang="ts">
const route = useRoute()
const authStore = useAuthStore()
const config = useRuntimeConfig()

useSeoMeta({
  title: 'Email verification | SAAJ',
  description: 'Manage your SAAJ account email verification.',
  robots: 'noindex,nofollow',
})

type VerificationStatus = 'success' | 'already' | 'expired' | 'invalid'

const status = computed<VerificationStatus>(() => {
  const raw = typeof route.query.status === 'string' ? route.query.status : 'invalid'
  return ['success', 'already', 'expired'].includes(raw)
    ? raw as VerificationStatus
    : 'invalid'
})

const state = computed(() => {
  switch (status.value) {
    case 'success':
      return {
        eyebrow: 'Email verified',
        title: 'You’re all set.',
        copy: 'Your email address is now verified and connected securely to your SAAJ account.',
        tone: 'success' as const,
        badge: 'Verified',
      }
    case 'already':
      return {
        eyebrow: 'Already verified',
        title: 'Nothing else to do.',
        copy: 'This email address was already verified. You can continue shopping or return to your account.',
        tone: 'success' as const,
        badge: 'Already verified',
      }
    case 'expired':
      return {
        eyebrow: 'Link expired',
        title: 'Let’s send you a fresh one.',
        copy: 'For security, verification links are time limited. Sign in to your account and request another email.',
        tone: 'warning' as const,
        badge: 'Expired',
      }
    default:
      return {
        eyebrow: 'Verification link',
        title: 'This link can’t be used.',
        copy: 'The link may have changed or is no longer valid. Sign in and request a fresh verification email.',
        tone: 'warning' as const,
        badge: 'Action needed',
      }
  }
})

const isSuccess = computed(() => state.value.tone === 'success')
const isRefreshing = ref(false)
const resendMessage = ref('')
const resendError = ref('')

onMounted(async () => {
  const token = useCookie<string | null>('saaj_customer_token')
  if (token.value) {
    await authStore.fetchMe().catch(() => undefined)
  }
})

async function resendVerification() {
  if (!authStore.isLoggedIn || isRefreshing.value) return

  isRefreshing.value = true
  resendMessage.value = ''
  resendError.value = ''

  try {
    const token = useCookie<string | null>('saaj_customer_token')
    await $fetch('/customer/email/resend', {
      baseURL: config.public.apiBaseUrl,
      method: 'POST',
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
    })
    resendMessage.value = 'A fresh verification email is on its way.'
  } catch (error: any) {
    resendError.value = error?.data?.message || 'We couldn’t resend the email right now. Please try again.'
  } finally {
    isRefreshing.value = false
  }
}
</script>

<template>
  <StorefrontAuthFrame
    :eyebrow="state.eyebrow"
    :title="state.title"
    :description="state.copy"
    aside-title="Your SAAJ account, confirmed."
    aside-copy="Verification keeps account recovery, order updates and profile changes connected to the right person."
  >
    <div
      class="border p-5 sm:p-6"
      :class="isSuccess
        ? 'border-[#657d6c]/30 bg-[#657d6c]/[0.08]'
        : 'border-[#b97b70]/35 bg-[#b97b70]/[0.07]'"
    >
      <div class="flex items-start gap-4">
        <div
          class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
          :class="isSuccess
            ? 'border-[#657d6c]/30 text-[#52685a]'
            : 'border-[#b97b70]/35 text-[#9a584f]'"
        >
          <svg v-if="isSuccess" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="m5 12.5 4 4L19 7" />
          </svg>
          <svg v-else viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5.5M12 16.5h.01" />
          </svg>
        </div>

        <div class="min-w-0">
          <p
            class="text-[10px] font-semibold uppercase tracking-[0.16em]"
            :class="isSuccess ? 'text-[#52685a]' : 'text-[#9a584f]'"
          >
            {{ state.badge }}
          </p>
          <p class="mt-2 text-[12px] leading-6 text-charcoal-700">
            {{ isSuccess
              ? 'You can safely close this page or continue into your SAAJ account.'
              : 'For your security, we never verify an email from an invalid or expired link.' }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="resendMessage" class="mt-4 border border-[#657d6c]/30 bg-[#657d6c]/[0.08] px-4 py-3 text-[12px] text-[#52685a]">
      {{ resendMessage }}
    </div>
    <div v-if="resendError" class="mt-4 border border-[#b97b70]/35 bg-[#b97b70]/[0.07] px-4 py-3 text-[12px] text-[#9a584f]">
      {{ resendError }}
    </div>

    <div class="mt-6 flex flex-col gap-3 sm:flex-row">
      <NuxtLink
        v-if="isSuccess && authStore.isLoggedIn"
        to="/account"
        class="flex flex-1 items-center justify-center bg-charcoal-950 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-paper-50"
      >
        My account →
      </NuxtLink>

      <NuxtLink
        v-else-if="!isSuccess && !authStore.isLoggedIn"
        :to="{ path: '/login', query: { redirect: '/verify-account' } }"
        class="flex flex-1 items-center justify-center bg-charcoal-950 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-paper-50"
      >
        Sign in to resend →
      </NuxtLink>

      <button
        v-else-if="!isSuccess && authStore.isLoggedIn"
        type="button"
        class="flex flex-1 items-center justify-center bg-charcoal-950 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-paper-50 disabled:cursor-wait disabled:opacity-60"
        :disabled="isRefreshing"
        @click="resendVerification"
      >
        {{ isRefreshing ? 'Sending…' : 'Send a new link →' }}
      </button>

      <NuxtLink
        to="/shop"
        class="flex flex-1 items-center justify-center border border-charcoal-950/18 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-950"
      >
        Continue shopping
      </NuxtLink>
    </div>
  </StorefrontAuthFrame>
</template>
